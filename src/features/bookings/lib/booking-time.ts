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

export function formatBookingCalendarDate(
  dateInput?: string | Date | null,
  options?: { format?: 'short' | 'long' },
): string {
  if (!dateInput) return 'Data a confirmar';

  let datePart = '';
  if (typeof dateInput === 'string') {
    datePart = dateInput.slice(0, 10);
  } else if (dateInput instanceof Date) {
    datePart = dateInput.toISOString().slice(0, 10);
  }

  const parts = datePart.split('-');
  if (parts.length !== 3) return 'Data a confirmar';

  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return 'Data a confirmar';

  // Instantiate at 12:00:00 local time to avoid timezone boundary shifts
  const d = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(d.getTime())) return 'Data a confirmar';

  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });
  const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (options?.format === 'long') {
    const monthLong = d.toLocaleDateString('pt-BR', { month: 'long' });
    return `${formattedWeekday}, ${day} de ${monthLong}`;
  }

  const monthShort = d.toLocaleDateString('pt-BR', { month: 'short' });
  return `${formattedWeekday}, ${day} de ${monthShort}`;
}

export function formatBookingTimeRange(
  startTime?: string | null,
  endTime?: string | null,
  startsAt?: string | null,
  endsAt?: string | null,
): string {
  if (startTime && endTime) {
    return `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`;
  }
  if (startTime) {
    return startTime.slice(0, 5);
  }
  if (startsAt) {
    const d = new Date(startsAt);
    if (!Number.isNaN(d.getTime())) {
      const s = d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Sao_Paulo',
      });
      if (endsAt) {
        const e = new Date(endsAt);
        if (!Number.isNaN(e.getTime())) {
          return `${s} – ${e.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Sao_Paulo',
          })}`;
        }
      }
      return s;
    }
  }
  return 'Horário a confirmar';
}

export function formatCentsToCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

