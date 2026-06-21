import { Booking } from '../models/index.js';
import { normalizePhoneDigits, sendWhatsAppText } from './whatsapp.js';
import { sendFcmToAdmins } from './fcm.js';

export async function selectRescheduleOption(
  token: string,
  optionIndex: number
): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const booking = await Booking.findOne({
    'rescheduleProposal.token': token,
    status: 'reschedule_pending',
  });

  if (!booking?.rescheduleProposal) {
    return { ok: false, error: 'Invalid or expired reschedule link' };
  }

  if (booking.rescheduleProposal.expiresAt < new Date()) {
    return { ok: false, error: 'Reschedule link expired' };
  }

  if (optionIndex < 0 || optionIndex >= booking.rescheduleProposal.options.length) {
    return { ok: false, error: 'Invalid option' };
  }

  booking.rescheduleProposal.customerSelectedIndex = optionIndex;
  await booking.save();

  await sendFcmToAdmins({
    title: 'Customer picked reschedule slot',
    body: `${booking.ref} — option ${optionIndex + 1}`,
    data: { bookingId: booking._id.toString(), type: 'reschedule_selected' },
  });

  return { ok: true, ref: booking.ref };
}

export async function selectRescheduleByPhone(
  phone: string,
  optionIndex: number
): Promise<{ ok: boolean; ref?: string }> {
  const digits = normalizePhoneDigits(phone);
  const bookings = await Booking.find({ status: 'reschedule_pending' })
    .sort({ updatedAt: -1 })
    .limit(20);

  const booking = bookings.find(
    (b) => normalizePhoneDigits(b.customer.phone) === digits && b.rescheduleProposal
  );

  if (!booking?.rescheduleProposal?.token) return { ok: false };

  return selectRescheduleOption(booking.rescheduleProposal.token, optionIndex);
}

export async function handleInboundWhatsAppMessage(from: string, body: string): Promise<void> {
  const trimmed = body.trim();
  const match = trimmed.match(/^(\d+)$/);
  if (!match) return;

  const optionNum = parseInt(match[1], 10);
  if (optionNum < 1 || optionNum > 9) return;

  const phoneDigits = from.replace(/@.*$/, '');
  const result = await selectRescheduleByPhone(phoneDigits, optionNum - 1);

  if (result.ok && result.ref) {
    await sendWhatsAppText(
      phoneDigits,
      `Thanks! You selected option ${optionNum} for booking ${result.ref}. We will confirm your new time shortly via WhatsApp.`
    );
  }
}
