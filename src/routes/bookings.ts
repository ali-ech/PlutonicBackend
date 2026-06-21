import { Router } from 'express';
import {
  Booking,
  SubService,
  SubServiceCityPrice,
  City,
  Settings,
  Inquiry,
} from '../models/index.js';
import {
  getAvailableSlots,
  computeSlotEnd,
  generateBookingRef,
} from '../services/slotEngine.js';
import { createCheckoutSession } from '../services/stripe.js';
import { notifyBookingConfirmed } from '../services/whatsapp.js';
import { sendFcmToAdmins } from '../services/fcm.js';
import { selectRescheduleOption } from '../services/rescheduleReply.js';
import { getPublicUrl } from '../services/whatsapp.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const {
      cityId,
      date,
      slotStart,
      subServiceIds,
      customer,
      paymentMethod,
    } = req.body;

    if (!cityId || !date || !slotStart || !subServiceIds?.length || !customer) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const settings = await Settings.findOne();
    const subServices = await SubService.find({ _id: { $in: subServiceIds }, active: true });
    if (subServices.length !== subServiceIds.length) {
      res.status(400).json({ error: 'Invalid sub-services' });
      return;
    }

    const prices = await SubServiceCityPrice.find({
      cityId,
      subServiceId: { $in: subServiceIds },
    });
    const priceMap = new Map(prices.map((p) => [p.subServiceId.toString(), p.priceAed]));

    const lines = subServices.map((s) => ({
      subServiceId: s._id,
      name: s.name,
      price: priceMap.get(s._id.toString()) ?? 0,
      durationMinutes: s.durationMinutes,
    }));

    const subtotal = lines.reduce((sum, l) => sum + l.price, 0);
    const totalDuration = lines.reduce((sum, l) => sum + l.durationMinutes, 0);

    let discount = 0;
    const minServices = settings?.customDiscountMinServices ?? 2;
    const discountPct = settings?.customDiscountPercent ?? 0;
    if (lines.length >= minServices && discountPct > 0) {
      discount = Math.round((subtotal * discountPct) / 100);
    }
    const total = subtotal - discount;

    const slotEnd = computeSlotEnd(slotStart, totalDuration);
    const bufferMinutes = settings?.bufferMinutes ?? 30;

    const available = await getAvailableSlots({
      date,
      durationMinutes: totalDuration,
      workStart: settings?.workStart || '08:00',
      workEnd: settings?.workEnd || '18:00',
      bufferMinutes,
    });

    if (!available.includes(slotStart)) {
      res.status(400).json({ error: 'Slot no longer available' });
      return;
    }

    const status = paymentMethod === 'stripe' ? 'pending_payment' : 'confirmed';

    const ref = generateBookingRef();
    const booking = await Booking.create({
      ref,
      customer,
      cityId,
      date,
      slotStart,
      slotEnd,
      subServices: lines,
      subtotal,
      discount,
      total,
      paymentMethod,
      paymentStatus: 'pending',
      status,
    });

    const city = await City.findById(cityId);
    const serviceNames = lines.map((l) => l.name).join(', ');

    let checkoutUrl: string | null = null;
    if (paymentMethod === 'stripe') {
      const checkout = await createCheckoutSession({
        bookingId: booking._id.toString(),
        ref: booking.ref,
        total: booking.total,
        customerEmail: customer.email,
      });
      if (checkout) {
        checkoutUrl = checkout.url;
        await Booking.findByIdAndUpdate(booking._id, { stripeSessionId: checkout.sessionId });
      }
    }

    if (paymentMethod !== 'stripe') {
      const wa = await notifyBookingConfirmed({
        phone: customer.phone,
        ref: booking.ref,
        date: booking.date,
        slotStart: booking.slotStart,
        slotEnd: booking.slotEnd,
        services: serviceNames,
        total: booking.total,
        address: customer.address,
        paymentMethod: paymentMethod === 'cash' ? 'Cash on arrival' : 'Bank transfer',
        cityName: city?.name,
      });

      await sendFcmToAdmins({
        title: 'New booking',
        body: `${customer.name} — ${city?.name ?? ''} — AED ${total}`,
        data: { bookingId: booking._id.toString(), type: 'new_booking' },
      });

      res.status(201).json({
        booking,
        cityName: city?.name,
        whatsapp: wa,
        receiptClickUrl: wa.receiptClickUrl,
      });
      return;
    }

    await sendFcmToAdmins({
      title: 'New booking (awaiting payment)',
      body: `${customer.name} — AED ${total}`,
      data: { bookingId: booking._id.toString(), type: 'new_booking' },
    });

    res.status(201).json({
      booking,
      cityName: city?.name,
      checkoutUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.get('/reschedule/:token', async (req, res) => {
  const booking = await Booking.findOne({
    'rescheduleProposal.token': req.params.token,
    status: 'reschedule_pending',
  });
  if (!booking || !booking.rescheduleProposal) {
    res.status(404).json({ error: 'Invalid or expired reschedule link' });
    return;
  }
  if (booking.rescheduleProposal.expiresAt < new Date()) {
    res.status(400).json({ error: 'Reschedule link expired' });
    return;
  }
  res.json({
    ref: booking.ref,
    options: booking.rescheduleProposal.options,
    customerSelectedIndex: booking.rescheduleProposal.customerSelectedIndex,
  });
});

router.get('/reschedule/:token/pick/:index', async (req, res) => {
  const optionIndex = parseInt(req.params.index, 10);
  const result = await selectRescheduleOption(req.params.token, optionIndex);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const base = getPublicUrl();
  res.redirect(`${base}/reschedule/${req.params.token}?done=1`);
});

router.post('/reschedule/:token/select', async (req, res) => {
  const { optionIndex } = req.body;
  const result = await selectRescheduleOption(req.params.token, Number(optionIndex));
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true });
});

router.post('/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }
  await Inquiry.create({ name, email, phone, message });
  await sendFcmToAdmins({
    title: 'New inquiry',
    body: `${name} — ${email}`,
    data: { type: 'inquiry' },
  });
  res.status(201).json({ success: true });
});

export default router;
