import type { IAvailabilityRepository, WeeklyScheduleEntry } from '../api/availability.contract';
import { normalizeBarberScheduleError } from '../api/barber-schedule-error';
import { sameSchedule } from './barber-schedule.schema';

export async function saveBarberSchedule(repository: IAvailabilityRepository, shopId: string,
  barbermanId: string, entries: Omit<WeeklyScheduleEntry, 'id'>[]) {
  if (!shopId || !barbermanId) throw new Error('Unidade e profissional são obrigatórios.');
  return saveScopedSchedule(repository, shopId, barbermanId, entries);
}

/** Shared write/reconciliation contract for general and individual schedules. */
export async function saveScopedSchedule(repository: IAvailabilityRepository, shopId: string,
  barbermanId: string | undefined, entries: Omit<WeeklyScheduleEntry, 'id'>[]) {
  if (!shopId) throw new Error('Unidade obrigatória.');
  try {
    const saved = await repository.saveWeeklySchedule(shopId, entries, barbermanId);
    return { kind: 'saved' as const, entries: saved, message: 'Jornada salva com sucesso.' };
  } catch (cause) {
    const error = normalizeBarberScheduleError(cause, true);
    if (error.writeState === 'saved') return { kind: 'unconfirmed-view' as const,
      message: 'Jornada salva, mas não foi possível atualizar a visualização.' };
    if (error.writeState === 'unknown') {
      try {
        const current = await repository.getWeeklySchedule(shopId, barbermanId);
        if (sameSchedule(entries, current)) return { kind: 'saved' as const,
          entries: current, message: 'Jornada confirmada após consultar os dados salvos.' };
      } catch { /* Keep the draft and require a successful reconciliation before another PUT. */ }
      return { kind: 'unknown' as const,
        message: 'Não foi possível confirmar o salvamento. Consulte os dados salvos antes de tentar novamente.' };
    }
    return { kind: 'rejected' as const, error, message: error.message };
  }
}
