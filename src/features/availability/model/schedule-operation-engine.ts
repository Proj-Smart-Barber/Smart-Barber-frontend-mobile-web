import { generateUuidV7 } from '@/features/bookings/lib/attempt-id';
import { serverClock as defaultServerClock, type ServerClock } from '@/features/bookings/lib/server-clock';
import { operationAttemptStore as defaultStore } from '@/shared/operations/operation-attempt-store';
import { actorSessionGeneration, awaitOperationCleanup, isCurrentActorActive }
  from '@/shared/operations/OperationLifecycleBridge';
import { closeOwnAttempt, findOwnAttempt } from '@/shared/operations/operation-attempt.api';
import type {
  OperationAttemptRecord, OperationAttemptResult, OperationAttemptStore,
} from '@/shared/operations/operation-attempt.types';
import type {
  IAvailabilityRepository, SaveScheduleScopeInput, ScheduleScopeDocument,
} from '../api/availability.contract';
import { parseScheduleScopeDocument } from '../api/availability.http';
import { BarberScheduleError, normalizeBarberScheduleError } from '../api/barber-schedule-error';

export const SCHEDULE_OPERATION = 'UPDATE_SCHEDULE';

export type ScheduleSaveCommand = Omit<SaveScheduleScopeInput, 'requestId'> & {
  actorId: string;
  shopId: string;
};

export type ScheduleBlockReason = 'PENDING_ATTEMPT' | 'CLOCK_UNAVAILABLE' | 'STORAGE_UNAVAILABLE' | 'BUSY';

/** Resultado do envio: nunca mistura rejeição comprovada com incerteza. */
export type ScheduleSaveOutcome =
  | { kind: 'saved'; requestId: string; document: ScheduleScopeDocument }
  | { kind: 'rejected'; requestId: string; error: BarberScheduleError }
  | { kind: 'access-revoked'; requestId: string; error: BarberScheduleError }
  | { kind: 'unknown'; requestId: string; error: BarberScheduleError }
  | { kind: 'blocked'; reason: ScheduleBlockReason; requestId?: string }
  | { kind: 'session-changed'; requestId?: string };

/** Estados autoritativos da tentativa após consulta ao contrato de operações. */
export type ScheduleReconcileOutcome =
  | { kind: 'applied'; requestId: string; document: ScheduleScopeDocument | null }
  | { kind: 'access-revoked'; requestId: string }
  | { kind: 'not-applied'; requestId: string }
  | { kind: 'pending'; requestId: string }
  | { kind: 'unknown'; requestId: string }
  | { kind: 'session-changed'; requestId: string };

export interface ScheduleOperationDeps {
  store?: OperationAttemptStore;
  clock?: Pick<ServerClock, 'getRequiredNow' | 'syncWithServer'>;
  findAttempt?: (requestId: string) => Promise<OperationAttemptResult>;
  closeAttempt?: (requestId: string) => Promise<OperationAttemptResult>;
  isContextActive?: () => boolean;
}

const UNRESOLVED = ['submitting', 'uncertain', 'error'] as const;
const inFlight = new Set<string>();

export function buildScheduleResourceId(shopId: string, barbermanId: string | null): string {
  return barbermanId ? `${shopId}:${barbermanId}` : shopId;
}

export function matchesScheduleScope(
  resourceId: string | null | undefined,
  shopId: string,
  barbermanId: string | null,
): boolean {
  if (!resourceId || !shopId) return false;
  const expected = buildScheduleResourceId(shopId, barbermanId);
  return resourceId === expected;
}

function referenceOf(actorId: string, requestId: string, createdAt: number,
  status: OperationAttemptRecord['status'], extra: Partial<OperationAttemptRecord> = {}): OperationAttemptRecord {
  return { actorId, requestId, operation: SCHEDULE_OPERATION, resourceKind: 'SCHEDULE',
    originScope: 'UNIT', status, createdAt, ...extra };
}

/** Mesmo ledger das reservas: o ator/geração da sessão decide se uma resposta ainda vale. */
function sessionIsCurrent(actorId: string, generation: number) {
  return isCurrentActorActive(actorId) && generation === actorSessionGeneration();
}

function syncClock(clock: NonNullable<ScheduleOperationDeps['clock']>, serverTime: string | null | undefined) {
  if (!serverTime) return;
  try { clock.syncWithServer(serverTime); } catch { /* relógio inválido não invalida a resposta */ }
}

async function hasUnresolvedReference(
  store: OperationAttemptStore,
  actorId: string,
  shopId: string,
  barbermanId: string | null,
) {
  for (const ref of await store.listReferences(actorId)) {
    if (ref.resourceKind !== 'SCHEDULE' || !UNRESOLVED.includes(ref.status as typeof UNRESOLVED[number])) continue;
    if (ref.resourceId && !matchesScheduleScope(ref.resourceId, shopId, barbermanId)) continue;
    const saved = await store.read(actorId, ref.requestId);
    if (saved?.result?.state === 'NOT_APPLIED' || saved?.result?.state === 'APPLIED') continue;
    const savedResourceId = saved?.resourceId ?? saved?.result?.resource?.id ?? ref.resourceId;
    if (savedResourceId && !matchesScheduleScope(savedResourceId, shopId, barbermanId)) continue;
    return ref.requestId;
  }
  return null;
}

export async function saveSchedule(
  repository: IAvailabilityRepository,
  command: ScheduleSaveCommand,
  deps: ScheduleOperationDeps = {},
): Promise<ScheduleSaveOutcome> {
  const store = deps.store ?? defaultStore;
  const clock = deps.clock ?? defaultServerClock;
  const { actorId, shopId, ...input } = command;
  if (!actorId || !shopId) throw new Error('Ator e unidade são obrigatórios.');
  const resourceId = buildScheduleResourceId(shopId, input.barbermanId);
  const scopeId = JSON.stringify([actorId, shopId, input.barbermanId]);
  if (inFlight.has(scopeId)) return { kind: 'blocked', reason: 'BUSY' };
  inFlight.add(scopeId);

  try {
    const generation = actorSessionGeneration();
    await awaitOperationCleanup();
    if (!sessionIsCurrent(actorId, generation)) return { kind: 'session-changed' };

    const unresolved = await hasUnresolvedReference(store, actorId, shopId, input.barbermanId);
    if (!sessionIsCurrent(actorId, generation)) return { kind: 'session-changed' };
    if (unresolved) return { kind: 'blocked', reason: 'PENDING_ATTEMPT', requestId: unresolved };

    let createdAt: number;
    try { createdAt = clock.getRequiredNow(); } catch { return { kind: 'blocked', reason: 'CLOCK_UNAVAILABLE' }; }
    const requestId = generateUuidV7(createdAt);

    // A referência precisa existir antes da mutação; sem ela a operação seria irrecuperável.
    try {
      await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'submitting', { resourceId }));
    } catch {
      return { kind: 'blocked', reason: 'STORAGE_UNAVAILABLE', requestId };
    }
    if (!sessionIsCurrent(actorId, generation) || (deps.isContextActive && !deps.isContextActive())) {
      return { kind: 'session-changed', requestId };
    }

    try {
      const document = await repository.saveScheduleScope(shopId, { ...input, requestId });
      if (!sessionIsCurrent(actorId, generation) || (deps.isContextActive && !deps.isContextActive())) {
        return { kind: 'session-changed', requestId };
      }
      syncClock(clock, document.serverTime);
      await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'confirmed', {
        resourceId,
        result: { state: 'APPLIED', operation: SCHEDULE_OPERATION, accessChanged: false,
          serverTime: document.serverTime ?? undefined,
          resource: { kind: 'SCHEDULE', id: resourceId, version: document.version } },
      })).catch(() => undefined); // O fato já ocorreu no servidor.
      return { kind: 'saved', requestId, document };
    } catch (cause) {
      if (!sessionIsCurrent(actorId, generation) || (deps.isContextActive && !deps.isContextActive())) {
        return { kind: 'session-changed', requestId };
      }
      const error = normalizeBarberScheduleError(cause, true);
      if (error.writeState === 'unknown') {
        await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'uncertain',
          { resourceId, errorMessage: error.message })).catch(() => undefined);
        return { kind: 'unknown', requestId, error };
      }
      // Rejeição HTTP terminal: a transação do servidor foi revertida, nada ficou pendente.
      await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'error', {
        resourceId,
        errorMessage: error.message, result: { state: 'NOT_APPLIED', operation: SCHEDULE_OPERATION },
      })).catch(() => undefined);
      const revoked = error.status === 401 || error.status === 403 || error.status === 404;
      return { kind: revoked ? 'access-revoked' : 'rejected', requestId, error };
    }
  } finally {
    inFlight.delete(scopeId);
  }
}

function hasForeignShopEntries(data: unknown, shopId: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const raw = data as { schedules?: unknown; effectiveSchedules?: unknown };
  for (const list of [raw.schedules, raw.effectiveSchedules]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && typeof item === 'object') {
        const entryShop = (item as Record<string, unknown>).barbershopId ?? (item as Record<string, unknown>).barbershop_id;
        if (typeof entryShop === 'string' && entryShop.length > 0 && entryShop !== shopId) {
          return true;
        }
      }
    }
  }
  return false;
}

function hasMismatchedPersonalEntries(data: unknown, barbermanId: string | null): boolean {
  if (!barbermanId || !data || typeof data !== 'object') return false;
  const raw = data as { schedules?: unknown };
  if (!Array.isArray(raw.schedules)) return false;
  for (const item of raw.schedules) {
    if (item && typeof item === 'object') {
      const entryBarber =
        (item as Record<string, unknown>).barbermanId ??
        (item as Record<string, unknown>).barberman_id;
      if (entryBarber !== barbermanId) {
        return true;
      }
    }
  }
  return false;
}

function toReconcile(
  requestId: string,
  result: OperationAttemptResult,
  barbermanId: string | null,
  shopId?: string,
): ScheduleReconcileOutcome {
  if (result.state === 'APPLIED') {
    if (result.accessChanged) return { kind: 'access-revoked', requestId };
    if (result.operation && result.operation !== SCHEDULE_OPERATION) {
      return { kind: 'unknown', requestId };
    }
    if (!result.resource?.kind || result.resource.kind !== 'SCHEDULE') {
      return { kind: 'unknown', requestId };
    }
    if (!result.resource?.id) {
      return { kind: 'unknown', requestId };
    }
    if (shopId) {
      if (!matchesScheduleScope(result.resource.id, shopId, barbermanId)) {
        return { kind: 'unknown', requestId };
      }
      if (hasForeignShopEntries(result.resource.data, shopId)) {
        return { kind: 'unknown', requestId };
      }
      if (hasMismatchedPersonalEntries(result.resource.data, barbermanId)) {
        return { kind: 'unknown', requestId };
      }
    }
    let document: ScheduleScopeDocument | null = null;
    try { document = parseScheduleScopeDocument(result.resource.data, barbermanId); } catch { document = null; }
    return { kind: 'applied', requestId, document };
  }
  if (result.state === 'NOT_APPLIED') return { kind: 'not-applied', requestId };
  if (result.state === 'PENDING') return { kind: 'pending', requestId };
  return { kind: 'unknown', requestId };
}

async function settle(
  actorId: string,
  requestId: string,
  barbermanId: string | null,
  load: () => Promise<OperationAttemptResult>,
  deps: ScheduleOperationDeps,
  shopId?: string,
): Promise<ScheduleReconcileOutcome> {
  const store = deps.store ?? defaultStore;
  const clock = deps.clock ?? defaultServerClock;
  const generation = actorSessionGeneration();
  await awaitOperationCleanup();
  if (!sessionIsCurrent(actorId, generation)) return { kind: 'session-changed', requestId };

  let result: OperationAttemptResult;
  try { result = await load(); } catch { return { kind: 'unknown', requestId }; }
  if (!sessionIsCurrent(actorId, generation)) return { kind: 'session-changed', requestId };

  syncClock(clock, result.serverTime);
  const outcome = toReconcile(requestId, result, barbermanId, shopId);
  const existing = await store.read(actorId, requestId).catch(() => null);
  const resolvedResourceId = result.resource?.id ?? existing?.resourceId ?? (shopId ? buildScheduleResourceId(shopId, barbermanId) : null);
  const base = referenceOf(actorId, requestId, existing?.createdAt ?? Date.now(), 'uncertain', {
    resourceId: resolvedResourceId,
  });
  const normalized: OperationAttemptResult = { state: result.state, operation: result.operation,
    accessChanged: result.accessChanged ?? false, serverTime: result.serverTime,
    resource: result.resource ? { kind: result.resource.kind, id: result.resource.id, version: result.resource.version } : undefined };
  if (result.state === 'APPLIED') await store.save(actorId, { ...base, status: 'confirmed', result: normalized }).catch(() => undefined);
  if (result.state === 'NOT_APPLIED') await store.save(actorId, { ...base, status: 'error', result: normalized }).catch(() => undefined);
  return outcome;
}

/** Consulta o contrato real (`GET /operation-attempts/:requestId`); um GET da jornada não prova fechamento. */
export function reconcileSchedule(
  actorId: string,
  requestId: string,
  barbermanId: string | null,
  deps: ScheduleOperationDeps = {},
  shopId?: string,
) {
  return settle(actorId, requestId, barbermanId, () => (deps.findAttempt ?? findOwnAttempt)(requestId), deps, shopId);
}

/** Encerra a tentativa no servidor: depois de NOT_APPLIED uma chave tardia não pode mais aplicar a escrita. */
export function closeScheduleAttempt(
  actorId: string,
  requestId: string,
  barbermanId: string | null,
  deps: ScheduleOperationDeps = {},
  shopId?: string,
) {
  return settle(actorId, requestId, barbermanId, () => (deps.closeAttempt ?? closeOwnAttempt)(requestId), deps, shopId);
}
