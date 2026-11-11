export function money(value: number | null): string {
  return value === null
    ? 'Valor pendente'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}
export function parseMoney(value: string): number | null {
  const input = value.trim();
  let normalized: string;
  if (input.includes(',')) {
    if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,2}$/.test(input)) return null;
    normalized = input.replaceAll('.', '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(input)) normalized = input.replaceAll('.', '');
  else if (/^\d+(?:\.\d{1,2})?$/.test(input)) normalized = input;
  else return null;
  const [units, cents = ''] = normalized.split('.');
  const result = Number(units) * 100 + Number(cents.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result > 0 && result <= 2_000_000_000 ? result : null;
}
export function civilDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(iso + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) &&
    parsed.getUTCFullYear() > 0 &&
    parsed.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}
export function displayDate(value: string): string {
  return value.split('-').reverse().join('/');
}
export function shiftMonth(month: string, delta: number): string {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(month + '-01T12:00:00Z'));
}
export const categories = [
  { value: 'FIXED', label: 'Fixa' },
  { value: 'VARIABLE', label: 'Variável' },
  { value: 'BARBER_PAYOUT', label: 'Repasse' },
  { value: 'PAYROLL', label: 'Salário' },
  { value: 'OTHER', label: 'Outra' },
] as const;

export function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function dateRange(anchor: string, mode: 'day' | 'week') {
  if (mode === 'day') return { from: anchor, to: anchor };
  const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
  const from = shiftDate(anchor, -((weekday + 6) % 7));
  return { from, to: shiftDate(from, 6) };
}
