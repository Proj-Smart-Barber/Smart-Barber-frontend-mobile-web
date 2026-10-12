import type { BookingDto } from '../api/bookings.dto';

const TERMINAL_STATUSES = new Set(['CANCELLED', 'COMPLETED', 'NO_SHOW']);

export function isTerminalStatus(status?: string | null): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(status.toUpperCase());
}

export function parseBookingStartTimeMs(booking: BookingDto): number | null {
  if (booking.startsAt) {
    const parsed = Date.parse(booking.startsAt);
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (booking.date && booking.startTime) {
    const dateStr =
      booking.date instanceof Date
        ? booking.date.toISOString().split('T')[0]
        : String(booking.date).split('T')[0];
    const timeStr = booking.startTime.slice(0, 5);
    const isoString = `${dateStr}T${timeStr}:00`;
    const parsed = Date.parse(isoString);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

export function isUpcomingBooking(booking: BookingDto, referenceNowMs: number): boolean {
  if (isTerminalStatus(booking.status)) {
    return false;
  }

  const startMs = parseBookingStartTimeMs(booking);
  if (startMs === null) {
    return false;
  }

  return startMs >= referenceNowMs;
}
