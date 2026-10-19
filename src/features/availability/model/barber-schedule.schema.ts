import { z } from 'zod';
import type { WeeklyScheduleEntry } from '../api/availability.contract';
import { scheduleDaySchema, weeklyScheduleEntrySchema } from './availability.schema';
import { buildScheduleDayViews } from './availability.types';

export function barberScheduleSchema(opening: WeeklyScheduleEntry[]) {
  return z.object({ days: z.array(z.object({
    weekday: weeklyScheduleEntrySchema.shape.weekday,
    entries: scheduleDaySchema,
  })) }).superRefine(({ days }, ctx) => {
    days.forEach((day, dayIndex) => day.entries.forEach((entry, index) => {
      // Match the HTTP contract: each shift must fit in one general period.
      const contained = opening.some(general => general.barbermanId === null &&
        general.weekday === day.weekday && general.range.start <= entry.range.start &&
        general.range.end >= entry.range.end);
      if (!contained) ctx.addIssue({ code: 'custom',
        path: ['days', dayIndex, 'entries', index, 'range', 'end'],
        message: 'O intervalo deve estar dentro de um período de funcionamento da unidade.',
      });
    }));
  });
}

export type BarberScheduleForm = z.infer<ReturnType<typeof barberScheduleSchema>>;
export function scheduleForm(entries: WeeklyScheduleEntry[]): BarberScheduleForm {
  return { days: buildScheduleDayViews(entries).map(day => ({ weekday: day.weekday,
    entries: day.entries.map(({ weekday, barbermanId, range }) => ({ weekday, barbermanId, range: { ...range } })),
  })) };
}

/** Identity always comes from the session, never from an editable form field. */
export function personalEntries(form: BarberScheduleForm, barbermanId: string) {
  if (!barbermanId) throw new Error('Profissional autenticado obrigatório.');
  return form.days.flatMap(day => day.entries.map(entry => ({
    weekday: day.weekday, barbermanId, range: { ...entry.range },
  })));
}

export function sameSchedule(a: Omit<WeeklyScheduleEntry, 'id'>[], b: Omit<WeeklyScheduleEntry, 'id'>[]) {
  const canonical = (entries: typeof a) => JSON.stringify(entries.map(e =>
    [e.weekday, e.barbermanId, e.range.start, e.range.end].join('|')).sort());
  return canonical(a) === canonical(b);
}
