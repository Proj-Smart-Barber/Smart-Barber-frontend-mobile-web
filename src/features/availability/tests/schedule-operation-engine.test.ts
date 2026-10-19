import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api';
import { decodeUuidV7Timestamp, isValidUuidV7 } from '@/features/bookings/lib/attempt-id';
import { OperationLifecycleBridgeController } from '@/shared/operations/OperationLifecycleBridge';
import type { OperationAttemptRecord, OperationAttemptStore } from '@/shared/operations/operation-attempt.types';
import type { IAvailabilityRepository, ScheduleScopeDocument } from '../api/availability.contract';
import {
  closeScheduleAttempt, reconcileSchedule, saveSchedule, type ScheduleSaveCommand,
} from '../model/schedule-operation-engine';

const NOW = 1_760_000_000_000;
const clock = { getRequiredNow: () => NOW, syncWithServer: vi.fn(() => true) };

function memoryStore(overrides: Partial<OperationAttemptStore> = {}) {
  const rows = new Map<string, OperationAttemptRecord>();
  const key = (actor: string, id: string) => `${actor}|${id}`;
  const store: OperationAttemptStore = {
    read: async (actor, id) => rows.get(key(actor, id)) ?? null,
    save: async (actor, attempt) => { rows.set(key(actor, attempt.requestId), structuredClone(attempt)); },
    listReferences: async actor => [...rows.values()].filter(row => row.actorId === actor),
    clearResolved: async () => undefined, clearPayloadsOnLogout: async () => undefined,
    clearAllForActor: async () => undefined, ...overrides,
  };
  return { store, rows };
}

const document = (version: number, state: ScheduleScopeDocument['state'] = 'CUSTOM'): ScheduleScopeDocument => ({
  barbermanId: 'A', schedules: [], effectiveSchedules: [], state, version, needsReview: false,
  serverTime: '2026-10-19T12:00:00.000Z',
});
const command: ScheduleSaveCommand = {
  actorId: 'A', shopId: 'shop', barbermanId: 'A', state: 'CUSTOM', expectedVersion: 3,
  entries: [{ weekday: 'MONDAY', barbermanId: 'A', range: { start: '09:00', end: '12:00' } }],
};
const repoWith = (saveScheduleScope: IAvailabilityRepository['saveScheduleScope']) =>
  ({ saveScheduleScope } as unknown as IAvailabilityRepository);
const apiError = (status: number, data?: unknown, network = false) => new ApiError('falha', status, data, network);
const envelope = (code: string, extra: Record<string, unknown> = {}) =>
  ({ code, message: 'm', error: { code, message: 'm' }, ...extra });

beforeEach(() => {
  new OperationLifecycleBridgeController({ actorId: 'A', sessionState: 'authenticated' });
  clock.syncWithServer.mockClear();
});

describe('saveSchedule — ledger SCHEDULE', () => {
  it('registra a referência antes do transporte, usa UUIDv7 do relógio do servidor e confirma', async () => {
    const { store, rows } = memoryStore();
    let statusAtSend: string | undefined;
    let sent: { requestId: string; expectedVersion: number; state: string } | undefined;
    const repo = repoWith(async (_shop, input) => {
      sent = input;
      statusAtSend = (await store.read('A', input.requestId))?.status;
      return document(4);
    });

    const outcome = await saveSchedule(repo, command, { store, clock });

    expect(outcome.kind).toBe('saved');
    expect(statusAtSend).toBe('submitting');
    expect(isValidUuidV7(sent!.requestId)).toBe(true);
    expect(decodeUuidV7Timestamp(sent!.requestId)).toBe(NOW);
    expect(sent).toMatchObject({ expectedVersion: 3, state: 'CUSTOM' });
    const saved = rows.get(`A|${sent!.requestId}`)!;
    expect(saved).toMatchObject({ resourceKind: 'SCHEDULE', status: 'confirmed', result: { state: 'APPLIED' } });
    expect(saved.payload).toBeUndefined();
    expect(clock.syncWithServer).toHaveBeenCalledWith('2026-10-19T12:00:00.000Z');
  });

  it('não envia nada sem relógio autoritativo', async () => {
    const { store } = memoryStore();
    const send = vi.fn();
    const outcome = await saveSchedule(repoWith(send), command, { store,
      clock: { getRequiredNow: () => { throw new Error('sem referência'); }, syncWithServer: vi.fn() } });
    expect(outcome).toEqual({ kind: 'blocked', reason: 'CLOCK_UNAVAILABLE' });
    expect(send).not.toHaveBeenCalled();
  });

  it('não envia se a referência não puder ser persistida', async () => {
    const { store } = memoryStore({ save: async () => { throw new Error('quota'); } });
    const send = vi.fn();
    const outcome = await saveSchedule(repoWith(send), command, { store, clock });
    expect(outcome).toMatchObject({ kind: 'blocked', reason: 'STORAGE_UNAVAILABLE' });
    expect(send).not.toHaveBeenCalled();
  });

  it('conflito de versão é rejeição comprovada, lida do envelope e não bloqueia nova tentativa', async () => {
    const { store } = memoryStore();
    const send = vi.fn()
      .mockRejectedValueOnce(apiError(409, envelope('SCHEDULE_VERSION_CONFLICT')))
      .mockResolvedValueOnce(document(5));
    const first = await saveSchedule(repoWith(send), command, { store, clock });
    expect(first).toMatchObject({ kind: 'rejected', error: { code: 'SCHEDULE_VERSION_CONFLICT', status: 409 } });
    const second = await saveSchedule(repoWith(send), { ...command, expectedVersion: 4 }, { store, clock });
    expect(second.kind).toBe('saved');
    expect(send.mock.calls[0][1].requestId).not.toBe(send.mock.calls[1][1].requestId);
  });

  it('expõe as reservas e jornadas conflitantes do envelope real', async () => {
    const { store } = memoryStore();
    const booking = { bookingId: 'b1', date: '2026-10-20', startTime: '10:00', endTime: '10:30', barbermanId: 'A' };
    const repo = repoWith(vi.fn().mockRejectedValue(
      apiError(409, envelope('SCHEDULE_BOOKING_CONFLICT', { conflicts: [booking], error: { code: 'SCHEDULE_BOOKING_CONFLICT', message: 'm', details: [booking] } }))));
    const outcome = await saveSchedule(repo, command, { store, clock });
    expect(outcome).toMatchObject({ kind: 'rejected', error: { code: 'SCHEDULE_BOOKING_CONFLICT',
      conflicts: { bookings: [booking], customSchedules: [] } } });
  });

  it.each([[0, true], [500, false], [502, false]])('falha %s vira resultado desconhecido e preserva a referência', async (status, network) => {
    const { store, rows } = memoryStore();
    const outcome = await saveSchedule(repoWith(vi.fn().mockRejectedValue(apiError(status, null, network))), command, { store, clock });
    expect(outcome.kind).toBe('unknown');
    expect([...rows.values()][0]).toMatchObject({ status: 'uncertain' });
  });

  it('409 sem código conhecido é incerto: não prova rejeição nem autoriza outra chave', async () => {
    const { store } = memoryStore();
    const send = vi.fn().mockRejectedValue(apiError(409, { error: 'conflito sem código' }));
    expect((await saveSchedule(repoWith(send), command, { store, clock })).kind).toBe('unknown');
    const again = await saveSchedule(repoWith(send), command, { store, clock });
    expect(again).toMatchObject({ kind: 'blocked', reason: 'PENDING_ATTEMPT' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('OPERATION_ALREADY_CLOSED também cobre tentativa PENDING e permanece incerto', async () => {
    const { store } = memoryStore();
    const send = vi.fn().mockRejectedValue(apiError(409, envelope('OPERATION_ALREADY_CLOSED')));
    expect((await saveSchedule(repoWith(send), command, { store, clock })).kind).toBe('unknown');
  });

  it.each([401, 403, 404])('status %s sinaliza acesso revogado sem reenviar', async status => {
    const { store } = memoryStore();
    const outcome = await saveSchedule(repoWith(vi.fn().mockRejectedValue(apiError(status, envelope('FORBIDDEN')))), command, { store, clock });
    expect(outcome.kind).toBe('access-revoked');
  });

  it('clique duplo concorrente envia uma única mutação', async () => {
    const { store } = memoryStore();
    let release!: (value: ScheduleScopeDocument) => void;
    const send = vi.fn(() => new Promise<ScheduleScopeDocument>(resolve => { release = resolve; }));
    const first = saveSchedule(repoWith(send), command, { store, clock });
    const second = await saveSchedule(repoWith(send), command, { store, clock });
    expect(second).toEqual({ kind: 'blocked', reason: 'BUSY' });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    release(document(4));
    expect((await first).kind).toBe('saved');
  });

  it('descarta a resposta quando a conta muda durante o envio', async () => {
    const { store } = memoryStore();
    const bridge = new OperationLifecycleBridgeController({ actorId: 'A', sessionState: 'authenticated', store });
    const repo = repoWith(async () => { bridge.handleSessionUpdate('B', 'authenticated'); return document(4); });
    const outcome = await saveSchedule(repo, command, { store, clock });
    expect(outcome.kind).toBe('session-changed');
    expect(clock.syncWithServer).not.toHaveBeenCalled();
  });

  it('isola tentativas pendentes por ator: outra conta não é bloqueada', async () => {
    const { store } = memoryStore();
    await saveSchedule(repoWith(vi.fn().mockRejectedValue(apiError(0, null, true))), command, { store, clock });
    new OperationLifecycleBridgeController({ actorId: 'B', sessionState: 'authenticated' });
    const outcome = await saveSchedule(repoWith(async () => document(2)),
      { ...command, actorId: 'B', barbermanId: 'B', entries: [] }, { store, clock });
    expect(outcome.kind).toBe('saved');
  });
});

describe('reconcileSchedule / closeScheduleAttempt — contrato de operações', () => {
  const applied = { state: 'APPLIED' as const, accessChanged: false, serverTime: '2026-10-19T12:01:00.000Z',
    resource: { kind: 'SCHEDULE' as const, id: 'shop', version: 4, data: {
      schedules: [], effectiveSchedules: [], state: 'CLOSED', version: 4, serverTime: '2026-10-19T12:01:00.000Z' } } };

  it('APPLIED devolve o documento autoritativo e fecha a referência como confirmada', async () => {
    const { store, rows } = memoryStore();
    const outcome = await reconcileSchedule('A', 'req-1', 'A', { store, clock, findAttempt: async () => applied });
    expect(outcome).toMatchObject({ kind: 'applied', document: { state: 'CLOSED', version: 4 } });
    expect(rows.get('A|req-1')).toMatchObject({ status: 'confirmed' });
  });

  it('APPLIED sem acesso atual vira acesso revogado e não vaza dados', async () => {
    const { store } = memoryStore();
    const outcome = await reconcileSchedule('A', 'req-1', 'A', { store, clock,
      findAttempt: async () => ({ ...applied, accessChanged: true, resource: { ...applied.resource, data: undefined } }) });
    expect(outcome).toEqual({ kind: 'access-revoked', requestId: 'req-1' });
  });

  it.each([['PENDING', 'pending'], ['UNKNOWN', 'unknown'], ['NOT_APPLIED', 'not-applied']] as const)(
    'estado %s é preservado como %s', async (state, kind) => {
      const { store } = memoryStore();
      const outcome = await reconcileSchedule('A', 'req-1', 'A', { store, clock, findAttempt: async () => ({ state }) });
      expect(outcome.kind).toBe(kind);
    });

  it('falha ao consultar mantém UNKNOWN sem inventar sucesso', async () => {
    const { store } = memoryStore();
    const outcome = await reconcileSchedule('A', 'req-1', 'A', { store, clock, findAttempt: async () => { throw apiError(0, null, true); } });
    expect(outcome.kind).toBe('unknown');
  });

  it('encerrar após incerteza libera um novo envio com outra chave', async () => {
    const { store } = memoryStore();
    const send = vi.fn().mockRejectedValueOnce(apiError(0, null, true)).mockResolvedValueOnce(document(5));
    const first = await saveSchedule(repoWith(send), command, { store, clock });
    expect(first.kind).toBe('unknown');
    const requestId = (first as { requestId: string }).requestId;
    expect((await saveSchedule(repoWith(send), command, { store, clock })).kind).toBe('blocked');

    const closed = await closeScheduleAttempt('A', requestId, 'A', { store, clock, closeAttempt: async () => ({ state: 'NOT_APPLIED' }) });
    expect(closed.kind).toBe('not-applied');
    const retry = await saveSchedule(repoWith(send), command, { store, clock });
    expect(retry.kind).toBe('saved');
    expect(send.mock.calls[1][1].requestId).not.toBe(requestId);
  });

  it('aborta antes do PUT se a conta mudar enquanto a referência local está sendo persistida', async () => {
    const { store } = memoryStore();
    const bridge = new OperationLifecycleBridgeController({ actorId: 'A', sessionState: 'authenticated', store });
    let releaseSave!: () => void;
    let startedSave!: () => void;
    const saveStarted = new Promise<void>(resolve => { startedSave = resolve; });
    store.save = async () => {
      startedSave();
      await new Promise<void>(resolve => { releaseSave = resolve; });
    };
    const send = vi.fn().mockResolvedValue(document(4));
    const operation = saveSchedule(repoWith(send), command, { store, clock });
    await saveStarted;
    bridge.handleSessionUpdate('B', 'authenticated');
    releaseSave();
    expect((await operation).kind).toBe('session-changed');
    expect(send).not.toHaveBeenCalled();
  });

  it('rejeita reconciliação APPLIED de outra unidade e não adota documento de escopo estranho', async () => {
    const { store } = memoryStore();
    const foreignResult = {
      state: 'APPLIED' as const,
      operation: 'UPDATE_SCHEDULE',
      accessChanged: false,
      serverTime: '2026-10-19T12:01:00.000Z',
      resource: {
        kind: 'SCHEDULE' as const,
        id: 'shop-A:A',
        version: 99,
        data: {
          schedules: [{ id: 'row-A', barbershopId: 'shop-A', barbermanId: 'A', dayOfWeek: 'MONDAY', openTime: '09:00', closeTime: '12:00' }],
          effectiveSchedules: [],
          state: 'CUSTOM',
          version: 99,
          serverTime: '2026-10-19T12:01:00.000Z',
        },
      },
    };
    const outcome = await reconcileSchedule('A', 'req-foreign', 'A', { store, clock, findAttempt: async () => foreignResult }, 'shop-B');
    expect(outcome).toEqual({ kind: 'unknown', requestId: 'req-foreign' });
  });
});
