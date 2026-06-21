import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser, Booking, Settings, Inquiry } from '../models/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { getPublicUrl, notifyRescheduleOptions, notifyRescheduleConfirmed } from '../services/whatsapp.js';
import { selectRescheduleOption } from '../services/rescheduleReply.js';
import { sendFcmToAdmins, isFcmConfigured } from '../services/fcm.js';
import adminCmsRoutes from './adminCms.js';
import crypto from 'crypto';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await AdminUser.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign(
    { id: admin._id },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
  res.json({ token, admin: { email: admin.email, name: admin.name } });
});

router.use(authMiddleware);

router.use('/cms', adminCmsRoutes);

router.get('/bookings', async (req, res) => {
  const status = req.query.status as string | undefined;
  const filter = status && status !== 'all' ? { status } : {};
  const bookings = await Booking.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json(bookings);
});

router.get('/bookings/:id', async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(booking);
});

router.patch('/bookings/:id/status', async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!booking) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(booking);
});

router.patch('/bookings/:id/paid', async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { paymentStatus: 'paid' },
    { new: true }
  );
  if (!booking) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(booking);
});

router.post('/bookings/:id/reschedule', async (req, res) => {
  const { options } = req.body as {
    options: { date: string; slotStart: string; slotEnd: string }[];
  };
  if (!options?.length) {
    res.status(400).json({ error: 'Options required' });
    return;
  }
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    {
      status: 'reschedule_pending',
      rescheduleProposal: { options, token, expiresAt },
    },
    { new: true }
  );
  if (!booking) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const rescheduleUrl = `${getPublicUrl()}/reschedule/${token}`;
  const whatsapp = await notifyRescheduleOptions({
    phone: booking.customer.phone,
    ref: booking.ref,
    token,
    options,
  });

  res.json({ booking, rescheduleUrl, whatsapp });
});

router.post('/bookings/:id/confirm-reschedule', async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  const idx = booking?.rescheduleProposal?.customerSelectedIndex;
  if (!booking || idx === undefined || !booking.rescheduleProposal) {
    res.status(400).json({ error: 'Customer has not selected a slot' });
    return;
  }
  const opt = booking.rescheduleProposal.options[idx];
  booking.date = opt.date;
  booking.slotStart = opt.slotStart;
  booking.slotEnd = opt.slotEnd;
  booking.status = 'confirmed';
  booking.rescheduleProposal = undefined;
  await booking.save();

  const whatsapp = await notifyRescheduleConfirmed({
    phone: booking.customer.phone,
    ref: booking.ref,
    date: booking.date,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
  });

  res.json({ booking, whatsapp });
});

router.get('/stats/today', async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const bookings = await Booking.find({ date: today });
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const allToday = await Booking.find({ createdAt: { $gte: startOfDay } });
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const revenue = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((s, b) => s + b.total, 0);
  const pendingPayment = await Booking.countDocuments({
    paymentStatus: 'pending',
    status: { $ne: 'cancelled' },
  });

  res.json({
    newBookingsToday: allToday.length,
    confirmedToday: confirmed,
    completedToday: completed,
    revenueToday: revenue,
    pendingPayment,
  });
});

router.get('/stats/month', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const bookings = await Booking.find({
    createdAt: { $gte: start, $lte: end },
  });

  const total = bookings.length;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const revenue = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((s, b) => s + b.total, 0);
  const pendingPayment = bookings.filter((b) => b.paymentStatus === 'pending').length;

  res.json({ total, completed, revenue, pendingPayment });
});

router.get('/inquiries', async (_req, res) => {
  const items = await Inquiry.find().sort({ createdAt: -1 }).limit(50);
  res.json(items);
});

router.get('/settings', async (_req, res) => {
  const settings = await Settings.findOne();
  res.json(settings);
});

router.post('/fcm-token', async (req: AuthRequest, res) => {
  const { token } = req.body;
  if (!token || !req.adminId) {
    res.status(400).json({ error: 'Token required' });
    return;
  }
  await AdminUser.findByIdAndUpdate(req.adminId, {
    $addToSet: { fcmTokens: token },
  });
  res.json({ success: true });
});

router.get('/fcm-status', async (_req, res) => {
  const admins = await AdminUser.find({ fcmTokens: { $exists: true, $ne: [] } });
  const tokenCount = admins.reduce((n, a) => n + (a.fcmTokens?.length || 0), 0);
  res.json({
    serverConfigured: isFcmConfigured(),
    registeredDevices: tokenCount,
  });
});

router.post('/fcm-test', async (_req, res) => {
  const result = await sendFcmToAdmins({
    title: 'Plutonic test notification',
    body: 'If you hear a sound and see this, admin push is working!',
    data: { type: 'test' },
  });
  res.json(result);
});

export default router;
