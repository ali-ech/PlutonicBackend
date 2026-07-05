import type { IBooking } from '../models/index.js';
import { notifyBookingConfirmed } from './whatsapp.js';
import { sendFcmToAdmins } from './fcm.js';
import { City } from '../models/index.js';

/** Customer WhatsApp + admin push only when booking is fully confirmed (not pending/failed). */
export async function notifyConfirmedBooking(
  booking: IBooking,
  paymentLabel: string
): Promise<Awaited<ReturnType<typeof notifyBookingConfirmed>>> {
  if (booking.status !== 'confirmed') {
    return { sent: false, to: booking.customer.phone, error: 'Booking not confirmed' };
  }

  const city = await City.findById(booking.cityId);
  const serviceNames = booking.subServices.map((s) => s.name).join(', ');

  const wa = await notifyBookingConfirmed({
    phone: booking.customer.phone,
    ref: booking.ref,
    date: booking.date,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    services: serviceNames,
    total: booking.total,
    address: booking.customer.address,
    paymentMethod: paymentLabel,
    cityName: city?.name,
  });

  await sendFcmToAdmins({
    title: 'New booking',
    body: `${booking.customer.name} — ${city?.name ?? ''} — AED ${booking.total}`,
    data: { bookingId: booking._id.toString(), type: 'new_booking' },
  });

  return wa;
}

export async function notifyPendingPaymentBooking(booking: IBooking): Promise<void> {
  await sendFcmToAdmins({
    title: 'New booking (awaiting payment)',
    body: `${booking.customer.name} — AED ${booking.total}`,
    data: { bookingId: booking._id.toString(), type: 'new_booking' },
  });
}
