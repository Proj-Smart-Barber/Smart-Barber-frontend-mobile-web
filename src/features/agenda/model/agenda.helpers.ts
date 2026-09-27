import type { AgendaPaymentStatus } from '../api/agenda.contract';
import type { AgendaEntry } from '../api/agenda.contract';

/** Converte um Date local em "yyyy-MM-dd". */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converte "yyyy-MM-dd" em Date local, sem armadilhas de fuso. */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(iso: string, amount: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

/** Diferença em dias entre duas datas ISO (toIso - fromIso). */
export function diffInDays(fromIso: string, toIso: string): number {
  const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

export function isWithinNavigationLimit(iso: string, todayIso: string, limitDays: number): boolean {
  return Math.abs(diffInDays(todayIso, iso)) <= limitDays;
}

/** Navega meses preservando o dia quando possível (31/jan + 1 mês -> 28/fev). */
export function addMonths(iso: string, amount: number): string {
  const date = parseISODate(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const daysInTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, daysInTargetMonth));
  return toISODate(date);
}

/** "Setembro de 2026" */
export function formatMonthLabel(iso: string): string {
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Rótulos curtos de semana começando no domingo: ["dom", "seg", ..., "sáb"]. */
export function getCalendarWeekdaysShort(): string[] {
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const sunday = new Date(2023, 9, 1 + i); // 1 de outubro de 2023 é domingo
    const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(sunday);
    labels.push(label.replace(/\./g, ''));
  }
  return labels;
}

/**
 * Matriz do calendário do mês (semanas de domingo a sábado).
 * Células fora do mês são null.
 */
export function getCalendarWeeks(monthIso: string): (string | null)[][] {
  const first = parseISODate(monthIso);
  first.setDate(1);

  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const leadingBlanks = first.getDay();

  const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toISODate(new Date(first.getFullYear(), first.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** "Segunda-feira, 7 de setembro" */
export function formatDateLabel(iso: string): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseISODate(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** "Seg, 7 de set" — formato compacto, preservando localidade pt-BR. */
export function formatDateLabelShort(iso: string): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseISODate(iso));
  return formatted
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

export function formatClockRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesBetween(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Formata valor em centavos para moeda corrente BRL. */
export function formatCurrency(cents: number): string {
  const value = (cents || 0) / 100;
  return value
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00a0/g, ' ');
}

/** "Atualizado às 14:32" */
export function formatLastUpdated(dataUpdatedAt: number): string {
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dataUpdatedAt));
  return `Atualizado às ${time}`;
}

/** Rótulo de expiração de hold: "Expira em 5 min", "Expira em 2 h 5 min" ou "Expirado". */
export function formatHoldExpiry(expiresAt: string | null, now: Date = new Date()): string | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;

  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expirado';

  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `Expira em ${minutes} min`;
  return formatDurationMinutes(minutes).replace(/^(\d)/, 'Expira em $1');
}

/** Ordena entradas cronologicamente pelo horário de início (estável). */
export function sortAgendaEntriesChronologically<TEntry extends Pick<AgendaEntry, 'startTime'>>(
  entries: TEntry[],
): TEntry[] {
  return [...entries].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function mapPaymentStatusLabel(status: AgendaPaymentStatus): string {
  switch (status) {
    case 'PAID':
      return 'Pago';
    case 'PENDING':
      return 'Pagamento pendente';
    case 'REFUNDED':
      return 'Reembolsado';
    default:
      return status;
  }
}
