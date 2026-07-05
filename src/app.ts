import './config/env.js';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { constructStripeEvent } from './services/stripe.js';
import { logFcmStartupStatus } from './services/fcm.js';
import { logGooglePlacesStatus } from './config/env.js';
import publicRoutes from './routes/public.js';
import catalogRoutes from './routes/catalog.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import whatsappWebhookRoutes from './routes/whatsappWebhook.js';
import { Booking } from './models/index.js';
import { notifyConfirmedBooking } from './services/bookingNotifications.js';
import { sendFcmToAdmins } from './services/fcm.js';

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
        return;
      }
      if (/\.vercel\.app$/i.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins[0]);
    },
  })
);

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const event = constructStripeEvent(req.body as Buffer, sig);

    if (!event) {
      res.status(400).send('Webhook error');
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: { bookingId?: string };
        id?: string;
      };
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        const booking = await Booking.findOneAndUpdate(
          { _id: bookingId, status: 'pending_payment' },
          {
            paymentStatus: 'paid',
            status: 'confirmed',
            stripeSessionId: session.id,
          },
          { new: true }
        );

        if (booking) {
          await notifyConfirmedBooking(booking, 'Paid online (card)');
          await sendFcmToAdmins({
            title: 'Payment received',
            body: `${booking.ref} — AED ${booking.total}`,
            data: { bookingId: booking._id.toString(), type: 'payment' },
          });
        }
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());

app.use(async (_req, _res, next) => {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      await connectDB(uri);
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/whatsapp', whatsappWebhookRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api', publicRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

export default app;

export function logStartupServices() {
  logFcmStartupStatus();
  logGooglePlacesStatus();
}
