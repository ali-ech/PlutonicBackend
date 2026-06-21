import { Booking } from '../models/index.js';

interface BlockedInterval {
  start: number;
  end: number;
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(time: string, mins: number): string {
  return formatTime(parseTime(time) + mins);
}

export interface SlotParams {
  date: string;
  durationMinutes: number;
  workStart: string;
  workEnd: string;
  bufferMinutes: number;
}

export async function getAvailableSlots(params: SlotParams): Promise<string[]> {
  const { date, durationMinutes, workStart, workEnd, bufferMinutes } = params;

  const bookings = await Booking.find({
    date,
    status: { $nin: ['cancelled'] },
  });

  const blocked: BlockedInterval[] = bookings.map((b) => ({
    start: parseTime(b.slotStart),
    end: parseTime(b.slotEnd) + bufferMinutes,
  }));

  const workStartMin = parseTime(workStart);
  const workEndMin = parseTime(workEnd);
  const slots: string[] = [];

  for (let start = workStartMin; start + durationMinutes <= workEndMin; start += 60) {
    const end = start + durationMinutes;
    const overlaps = blocked.some((b) => start < b.end && end > b.start);
    if (!overlaps) {
      slots.push(formatTime(start));
    }
  }

  return slots;
}

export function computeSlotEnd(slotStart: string, durationMinutes: number): string {
  return addMinutesToTime(slotStart, durationMinutes);
}

export function generateBookingRef(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BK-${num}`;
}
