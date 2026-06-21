import Stripe from 'stripe';

let stripe: Stripe | null = null;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

export async function createCheckoutSession(params: {
  bookingId: string;
  ref: string;
  total: number;
  customerEmail?: string;
}): Promise<{ url: string; sessionId: string } | null> {
  const s = getStripe();
  if (!s) return null;

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const session = await s.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'aed',
          product_data: {
            name: `Plutonic Booking ${params.ref}`,
          },
          unit_amount: Math.round(params.total * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: params.customerEmail,
    metadata: {
      bookingId: params.bookingId,
      ref: params.ref,
    },
    success_url: `${clientUrl}/booking/success?ref=${params.ref}&paid=1`,
    cancel_url: `${clientUrl}/book?cancelled=1`,
  });

  if (!session.url) return null;
  return { url: session.url, sessionId: session.id };
}

export function constructStripeEvent(payload: Buffer, signature: string): Stripe.Event | null {
  const s = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return null;
  try {
    return s.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}
