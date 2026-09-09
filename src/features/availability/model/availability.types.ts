import type { Weekday, WeeklyScheduleEntry, AvailabilityException } from '../api/availability.contract';

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export const WEEKDAY_ORDER: Weekday[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

/** Dia agrupado para a UI — todas as entradas de um mesmo weekday juntas. */
export interface ScheduleDayView {
  weekday: Weekday;
  label: string;
  /** true = pelo menos um range cadastrado para este dia. */
  isOpen: boolean;
  entries: WeeklyScheduleEntry[];
}

/** Agrupamento de entradas da jornada por dia da semana (para renderizar a lista). */
export function buildScheduleDayViews(entries: WeeklyScheduleEntry[]): ScheduleDayView[] {
  const byDay: Record<string, WeeklyScheduleEntry[]> = {};
  for (const entry of entries) {
    byDay[entry.weekday] = [...(byDay[entry.weekday] ?? []), entry];
  }

  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    isOpen: (byDay[weekday]?.length ?? 0) > 0,
    entries: byDay[weekday] ?? [],
  }));
}

export function formatExceptionLabel(exception: AvailabilityException): string {
  if (exception.openTime && exception.closeTime) {
    return `${exception.openTime} – ${exception.closeTime}`;
  }
  return 'Dia fechado';
}
