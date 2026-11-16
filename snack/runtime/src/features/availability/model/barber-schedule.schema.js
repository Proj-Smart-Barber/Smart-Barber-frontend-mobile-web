import { z } from 'zod';
import { scheduleDaySchema, weeklyScheduleEntrySchema } from './availability.schema';
import { buildScheduleDayViews } from './availability.types';
const SCHEDULE_STATES = ['INHERIT', 'CUSTOM', 'CLOSED'];
/** Janelas gerais da unidade com períodos adjacentes fundidos; lacunas reais permanecem fechadas. */
function mergedWindows(opening, weekday) {
    const windows = opening.filter(general => general.barbermanId === null && general.weekday === weekday)
        .map(general => ({ ...general.range })).sort((a, b) => a.start.localeCompare(b.start));
    const merged = [];
    for (const window of windows) {
        const previous = merged[merged.length - 1];
        if (previous && window.start <= previous.end) {
            if (window.end > previous.end)
                previous.end = window.end;
        }
        else
            merged.push(window);
    }
    return merged;
}
export function barberScheduleSchema(_opening) {
    return z.object({
        state: z.enum(SCHEDULE_STATES),
        days: z.array(z.object({
            weekday: weeklyScheduleEntrySchema.shape.weekday,
            entries: scheduleDaySchema,
        })),
    }).superRefine(({ state, days }, ctx) => {
        // INHERIT e CLOSED não enviam períodos: o contrato rejeita CLOSED com períodos.
        if (state !== 'CUSTOM')
            return;
        if (!days.some(day => day.entries.length > 0)) {
            ctx.addIssue({ code: 'custom', path: ['days'], message: 'Informe ao menos um período de atendimento ou escolha outra opção.' });
        }
    });
}
export function scheduleForm(document, stateOverride) {
    const state = stateOverride !== null && stateOverride !== void 0 ? stateOverride : document.state;
    const entries = state === 'CUSTOM' ? document.schedules : [];
    return { state, days: buildScheduleDayViews(entries).map(day => ({ weekday: day.weekday,
            entries: day.entries.map(({ weekday, barbermanId, range }) => ({ weekday, barbermanId, range: { ...range } })),
        })) };
}
/** Identity always comes from the session, never from an editable form field. */
export function personalEntries(form, barbermanId) {
    if (!barbermanId)
        throw new Error('Profissional autenticado obrigatório.');
    if (form.state !== 'CUSTOM')
        return [];
    return form.days.flatMap(day => day.entries.map(entry => ({
        weekday: day.weekday, barbermanId, range: { ...entry.range },
    })));
}
export function sameSchedule(a, b) {
    const canonical = (entries) => JSON.stringify(entries.map(e => [e.weekday, e.barbermanId, e.range.start, e.range.end].join('|')).sort());
    return canonical(a) === canonical(b);
}
