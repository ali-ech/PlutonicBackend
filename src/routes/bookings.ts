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
import {
  notifyConfirmedBooking,
  notifyPendingPaymentBooking,
} from '../services/bookingNotifications.js';
import { sendFcmToAdmins } from '../services/fcm.js';
import { selectRescheduleOption } from '../services/rescheduleReply.js';
import { getPublicUrl } from '../services/whatsapp.js';
import {
  HOME_CLEANING_MATERIALS_FEE_AED,
  HOME_CLEANING_MATERIALS_SLUG,
  HOME_CLEANING_SERVICE_SLUG,
  computeHomeCleaningTotal,
  formatHomeCleaningLabel,
} from '../lib/homeCleaningPricing.js';

const router = Router();

function validateCustomer(customer: { name?: string; phone?: string; address?: string }) {
  if (!customer?.name?.trim()) return 'Full name is required';
  if (!customer?.phone?.trim()) return 'Phone number is required';
  if (!customer?.address?.trim()) return 'Address is required';
  return null;
}

router.post('/', async (req, res) => {
  let createdBookingId: string | null = null;

  try {
    const {
      cityId,
      date,
      slotStart,
      subServiceIds,
      serviceItems,
      customer,
      paymentMethod,
    } = req.body;

    const MAX_QTY = 12;
    type QtyItem = { subServiceId: string; quantity: number; professionals?: number };
    let items: QtyItem[] = [];

    if (Array.isArray(serviceItems) && serviceItems.length > 0) {
      items = serviceItems
        .map((it: { subServiceId?: string; quantity?: number; professionals?: number }) => ({
          subServiceId: String(it.subServiceId || ''),
          quantity: Math.max(1, Math.min(MAX_QTY, Math.floor(Number(it.quantity) || 1))),
          professionals: Math.max(1, Math.min(4, Math.floor(Number(it.professionals) || 1))),
        }))
        .filter((it: QtyItem) => it.subServiceId);
    } else if (Array.isArray(subServiceIds) && subServiceIds.length > 0) {
      items = subServiceIds.map((id: string) => ({
        subServiceId: String(id),
        quantity: 1,
        professionals: 1,
      }));
    }

    if (!cityId || !date || !slotStart || !items.length || !customer) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const customerError = validateCustomer(customer);
    if (customerError) {
      res.status(400).json({ error: customerError });
      return;
    }

    if (!['cash', 'bank_transfer', 'stripe'].includes(paymentMethod)) {
      res.status(400).json({ error: 'Invalid payment method' });
      return;
    }

    const settings = await Settings.findOne();
    const uniqueIds = [...new Set(items.map((i) => i.subServiceId))];
    const subServices = await SubService.find({ _id: { $in: uniqueIds }, active: true });
    if (subServices.length !== uniqueIds.length) {
      res.status(400).json({ error: 'Invalid sub-services' });
      return;
    }

    const byId = new Map(subServices.map((s) => [s._id.toString(), s]));

    for (const item of items) {
      const s = byId.get(item.subServiceId);
      if (!s) continue;
      const isHomeCleaning =
        s.slug === HOME_CLEANING_SERVICE_SLUG || s.slug === HOME_CLEANING_MATERIALS_SLUG;
      const allowsQty =
        isHomeCleaning ||
        Boolean(s.pricedByHour) ||
        Boolean(s.allowsQuantity) ||
        /^hourly\s/i.test(s.name) ||
        /hourly/i.test(s.slug || '') ||
        [
          'hm-furniture-installation',
          'hm-tv-entertainment-install',
          'hm-curtains-blinds-install',
          'hm-flyscreen-install',
          'hm-door-lock-install-repair',
          'hm-chandelier-install',
          'hm-switches-lights-install',
        ].includes(s.slug || '');
      if (item.quantity > 1 && !allowsQty) {
        res.status(400).json({ error: `Quantity not allowed for ${s.name}` });
        return;
      }
    }

    const prices = await SubServiceCityPrice.find({
      cityId,
      subServiceId: { $in: uniqueIds },
    });
    const priceMap = new Map(prices.map((p) => [p.subServiceId.toString(), p.priceAed]));

    const lines = items.map((item) => {
      const s = byId.get(item.subServiceId)!;
      const qty = item.quantity;
      const pros = item.professionals || 1;

      if (s.slug === HOME_CLEANING_SERVICE_SLUG) {
        const { laborAed, durationMinutes } = computeHomeCleaningTotal({
          hours: qty,
          professionals: pros,
          materials: false,
        });
        return {
          subServiceId: s._id,
          name: formatHomeCleaningLabel(qty, pros),
          price: laborAed,
          durationMinutes,
        };
      }

      if (s.slug === HOME_CLEANING_MATERIALS_SLUG) {
        return {
          subServiceId: s._id,
          name: 'Cleaning materials',
          price: HOME_CLEANING_MATERIALS_FEE_AED,
          durationMinutes: 0,
        };
      }

      const unitPrice = priceMap.get(s._id.toString()) ?? 0;
      const isHourly =
        Boolean(s.pricedByHour) ||
        /^hourly\s/i.test(s.name) ||
        /hourly/i.test(s.slug || '');
      const name =
        qty > 1
          ? isHourly
            ? `${s.name} × ${qty} hr`
            : `${s.name} × ${qty}`
          : s.name;
      return {
        subServiceId: s._id,
        name,
        price: unitPrice * qty,
        durationMinutes: s.durationMinutes * qty,
      };
    });

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
      res.status(400).json({ error: 'Selected time slot is no longer available. Please pick another time.' });
      return;
    }

    const status = paymentMethod === 'stripe' ? 'pending_payment' : 'confirmed';

    const ref = generateBookingRef();
    const booking = await Booking.create({
      ref,
      customer: {
        ...customer,
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      },
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
    createdBookingId = booking._id.toString();

    const city = await City.findById(cityId);

    if (paymentMethod === 'stripe') {
      let checkoutUrl: string | null = null;
      try {
        const checkout = await createCheckoutSession({
          bookingId: booking._id.toString(),
          ref: booking.ref,
          total: booking.total,
          customerEmail: customer.email,
        });
        if (!checkout) {
          await Booking.findByIdAndDelete(booking._id);
          createdBookingId = null;
          res.status(502).json({
            error: 'Online payment is temporarily unavailable. Please choose cash or bank transfer.',
          });
          return;
        }
        checkoutUrl = checkout.url;
        await Booking.findByIdAndUpdate(booking._id, { stripeSessionId: checkout.sessionId });
      } catch (checkoutErr) {
        console.error('Stripe checkout failed:', checkoutErr);
        await Booking.findByIdAndDelete(booking._id);
        createdBookingId = null;
        res.status(500).json({ error: 'Could not start online payment. Please try again or choose another method.' });
        return;
      }

      await notifyPendingPaymentBooking(booking);

      res.status(201).json({
        booking,
        cityName: city?.name,
        checkoutUrl,
      });
      return;
    }

    const paymentLabel = paymentMethod === 'cash' ? 'Cash on arrival' : 'Bank transfer';
    const wa = await notifyConfirmedBooking(booking, paymentLabel);

    res.status(201).json({
      booking,
      cityName: city?.name,
      whatsapp: wa,
      receiptClickUrl: wa.receiptClickUrl,
    });
  } catch (err) {
    console.error(err);
    if (createdBookingId) {
      await Booking.findByIdAndDelete(createdBookingId).catch(() => undefined);
    }
    res.status(500).json({ error: 'Failed to create booking. No confirmation was sent.' });
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
