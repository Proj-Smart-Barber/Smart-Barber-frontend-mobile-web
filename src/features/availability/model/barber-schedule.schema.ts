import { z } from 'zod';
import type { ScheduleScopeDocument, ScheduleScopeState, WeeklyScheduleEntry } from '../api/availability.contract';
import { scheduleDaySchema, weeklyScheduleEntrySchema } from './availability.schema';
import { buildScheduleDayViews } from './availability.types';

const SCHEDULE_STATES = ['INHERIT', 'CUSTOM', 'CLOSED'] as const;

/** Janelas gerais da unidade com períodos adjacentes fundidos; lacunas reais permanecem fechadas. */
function mergedWindows(opening: WeeklyScheduleEntry[], weekday: string) {
  const windows = opening.filter(general => general.barbermanId === null && general.weekday === weekday)
    .map(general => ({ ...general.range })).sort((a, b) => a.start.localeCompare(b.start));
  const merged: typeof windows = [];
  for (const window of windows) {
    const previous = merged[merged.length - 1];
    if (previous && window.start <= previous.end) {
      if (window.end > previous.end) previous.end = window.end;
    } else merged.push(window);
  }
  return merged;
}

export function barberScheduleSchema(opening: WeeklyScheduleEntry[]) {
  return z.object({
    state: z.enum(SCHEDULE_STATES),
    days: z.array(z.object({
      weekday: weeklyScheduleEntrySchema.shape.weekday,
      entries: scheduleDaySchema,
    })),
  }).superRefine(({ state, days }, ctx) => {
    // INHERIT e CLOSED não enviam períodos: o contrato rejeita CLOSED com períodos.
    if (state !== 'CUSTOM') return;
    if (!days.some(day => day.entries.length > 0)) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Informe ao menos um período de atendimento ou escolha outra opção.' });
    }
    days.forEach((day, dayIndex) => day.entries.forEach((entry, index) => {
      const contained = mergedWindows(opening, day.weekday)
        .some(window => window.start <= entry.range.start && window.end >= entry.range.end);
      if (!contained) ctx.addIssue({ code: 'custom',
        path: ['days', dayIndex, 'entries', index, 'range', 'end'],
        message: 'O intervalo deve estar dentro de um período de funcionamento da unidade.',
      });
    }));
  });
}

export type BarberScheduleForm = z.infer<ReturnType<typeof barberScheduleSchema>>;

export function scheduleForm(
  document: Pick<ScheduleScopeDocument, 'schedules' | 'state'>,
  stateOverride?: ScheduleScopeState,
): BarberScheduleForm {
  const state = stateOverride ?? document.state;
  const entries = state === 'CUSTOM' ? document.schedules : [];
  return { state, days: buildScheduleDayViews(entries).map(day => ({ weekday: day.weekday,
    entries: day.entries.map(({ weekday, barbermanId, range }) => ({ weekday, barbermanId, range: { ...range } })),
  })) };
}

/** Identity always comes from the session, never from an editable form field. */
export function personalEntries(form: BarberScheduleForm, barbermanId: string) {
  if (!barbermanId) throw new Error('Profissional autenticado obrigatório.');
  if (form.state !== 'CUSTOM') return [];
  return form.days.flatMap(day => day.entries.map(entry => ({
    weekday: day.weekday, barbermanId, range: { ...entry.range },
  })));
}

export function sameSchedule(a: Omit<WeeklyScheduleEntry, 'id'>[], b: Omit<WeeklyScheduleEntry, 'id'>[]) {
  const canonical = (entries: typeof a) => JSON.stringify(entries.map(e =>
    [e.weekday, e.barbermanId, e.range.start, e.range.end].join('|')).sort());
  return canonical(a) === canonical(b);
}
