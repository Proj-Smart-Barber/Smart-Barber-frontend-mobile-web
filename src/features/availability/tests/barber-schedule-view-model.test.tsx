// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, httpClient } from '@/shared/api';
import { AvailabilityMockAdapter } from '../api/availability.mock';
import { BarberScheduleError } from '../api/barber-schedule-error';
import { isValidUuidV7 } from '@/features/bookings/lib/attempt-id';

const state = vi.hoisted(() => ({
  session: {
    status: 'authenticated', identity: { id: 'fixture-user', name: 'Barbeiro' }, selectedShopId: 'fixture-shop',
    memberships: [{ id: 'fixture-shop', role: 'BARBERMAN', state: 'ACTIVE' }], barbershop: { id: 'fixture-shop' },
  } as any,
}));
vi.mock('@/features/auth', () => ({ useSession: () => state.session }));
vi.mock('@/shared/config/env', () => ({ ENV: { AVAILABILITY_SOURCE: 'mock', BARBERSHOP_ID: 'fixture-shop', API_URL: 'https://fixture.invalid', API_TIMEOUT_MS: 1000 } }));
import { availabilityRepository, AVAILABILITY_QUERY_KEYS } from '../api/availability.api';
import { useBarberScheduleViewModel } from '../model/use-barber-schedule-view-model';
import { operationAttemptStore } from '@/shared/operations/operation-attempt-store';
import { bookingQueryKeys } from '@/features/bookings/model/booking-query-keys';

const repo = availabilityRepository as AvailabilityMockAdapter;
const SHOP = 'fixture-shop';
const USER = 'fixture-user';
const monday = { id: 'fixture', weekday: 'MONDAY' as const, barbermanId: USER, range: { start: '09:00', end: '12:00' } };
let client: QueryClient;

function renderEditor() {
  return renderHook(() => useBarberScheduleViewModel(SHOP, USER), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
type Editor = ReturnType<typeof renderEditor>;
async function ready(editor: Editor) {
  await waitFor(() => expect(editor.result.current.loading).toBe(false));
  await waitFor(() => expect(editor.result.current.document).not.toBeNull());
}
/** Escolhe CUSTOM com um período segunda 09–12 (dentro do expediente seed da unidade). */
function editCustom(editor: Editor) {
  act(() => editor.result.current.chooseState('CUSTOM'));
  act(() => editor.result.current.methods.setValue('days.0.entries', [monday], { shouldDirty: true }));
}
const submit = (editor: Editor) => act(() => editor.result.current.methods.handleSubmit(editor.result.current.save)());

beforeEach(async () => {
  window.localStorage.clear();
  await operationAttemptStore.clearAllForActor(USER);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 60_000 } } });
  state.session.memberships = [{ id: SHOP, role: 'BARBERMAN', state: 'ACTIVE' }];
  state.session.selectedShopId = SHOP;
  state.session.barbershop = { id: SHOP };
  // Cada teste começa com o escopo pessoal revisado e na versão corrente do mock.
  const current = await repo.getScheduleScope(SHOP, USER);
  await repo.saveScheduleScope(SHOP, { barbermanId: USER, state: 'INHERIT', entries: [], expectedVersion: current.version, requestId: `seed-${Math.random()}` });
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });

describe('Minha jornada — GET/PUT do contrato final no formulário', () => {
  it('carrega estado e versão autoritativos e expõe herança sem confundir com vazio/fechamento', async () => {
    const editor = renderEditor();
    expect(editor.result.current.loading).toBe(true);
    await ready(editor);
    expect(editor.result.current.methods.getValues().state).toBe('INHERIT');
    expect(editor.result.current.methods.getValues().days).toHaveLength(7);
    expect(editor.result.current.document?.effectiveSchedules.length).toBeGreaterThan(0);
    expect(editor.result.current.needsReview).toBe(false);
  });

  it('legado ambíguo chega CLOSED com revisão obrigatória e não abre horários', async () => {
    const fresh = await repo.getScheduleScope(SHOP, 'legacy-user');
    expect(fresh).toMatchObject({ state: 'CLOSED', needsReview: true, effectiveSchedules: [] });
  });

  it('salva CUSTOM com expectedVersion, state e UUIDv7, e invalida jornada, slots e consumidores reais da reserva', async () => {
    const bookingAvailability = bookingQueryKeys.availability(SHOP, { date: '2026-10-20', serviceIds: ['s1'] } as any);
    const otherShop = bookingQueryKeys.availability('outra-unidade', { date: '2026-10-20', serviceIds: ['s1'] } as any);
    client.setQueryData(bookingAvailability, [{ start: 'x', end: 'y' }]);
    client.setQueryData(otherShop, [{ start: 'x', end: 'y' }]);
    client.setQueryData(AVAILABILITY_QUERY_KEYS.slots(SHOP, ['s1'], '2026-10-20', USER), []);

    const editor = renderEditor();
    await ready(editor);
    const save = vi.spyOn(repo, 'saveScheduleScope');
    const before = editor.result.current.document!.version;
    editCustom(editor);
    expect(editor.result.current.isDirty).toBe(true);
    await submit(editor);

    expect(save).toHaveBeenCalledTimes(1);
    const input = save.mock.calls[0][1];
    expect(input).toMatchObject({ barbermanId: USER, state: 'CUSTOM', expectedVersion: before });
    expect(isValidUuidV7(input.requestId)).toBe(true);
    expect(editor.result.current.feedback).toContain('sucesso');
    expect(editor.result.current.isDirty).toBe(false);
    expect(editor.result.current.document).toMatchObject({ state: 'CUSTOM', version: before + 1 });
    expect(client.getQueryState(bookingAvailability)?.isInvalidated).toBe(true);
    expect(client.getQueryState(AVAILABILITY_QUERY_KEYS.slots(SHOP, ['s1'], '2026-10-20', USER))?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherShop)?.isInvalidated).toBe(false);
  });

  it('CLOSED e INHERIT não enviam períodos', async () => {
    const editor = renderEditor();
    await ready(editor);
    const save = vi.spyOn(repo, 'saveScheduleScope');
    act(() => editor.result.current.chooseState('CLOSED'));
    await submit(editor);
    expect(save.mock.calls[0][1]).toMatchObject({ state: 'CLOSED', entries: [] });
    expect(editor.result.current.document?.state).toBe('CLOSED');
  });

  it('impede gravação inválida que atravessa a pausa da unidade, sem tocar a rede', async () => {
    const editor = renderEditor();
    await ready(editor);
    const save = vi.spyOn(repo, 'saveScheduleScope');
    act(() => editor.result.current.chooseState('CUSTOM'));
    act(() => editor.result.current.methods.setValue('days.0.entries', [{ ...monday, range: { start: '09:00', end: '17:00' } }], { shouldDirty: true }));
    await submit(editor);
    expect(save).not.toHaveBeenCalled();
    expect(editor.result.current.methods.getFieldState('days.0.entries.0.range.end').error?.message).toContain('funcionamento da unidade');
  });

  it('refetch não sobrescreve o rascunho e descartar restaura a jornada salva', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    await act(() => editor.result.current.retry());
    expect(editor.result.current.methods.getValues().days[0].entries).toHaveLength(1);
    act(() => editor.result.current.discard());
    expect(editor.result.current.methods.getValues().state).toBe('INHERIT');
    expect(editor.result.current.isDirty).toBe(false);
  });

  it('erro de leitura fica visível e permite tentar novamente', async () => {
    repo.failNextSchedule('read', SHOP, USER, new BarberScheduleError('Falha de teste', 503, 'TEST'));
    const editor = renderEditor();
    await waitFor(() => expect(editor.result.current.error).toBeTruthy());
    await act(() => editor.result.current.retry());
    await waitFor(() => expect(editor.result.current.error).toBeNull());
  });
});

describe('Minha jornada — falhas, conflitos e recuperação', () => {
  it('rejeição preserva o rascunho e mostra o motivo do envelope', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    vi.spyOn(repo, 'saveScheduleScope').mockRejectedValue(new ApiError('x', 422, {
      code: 'BAD_REQUEST', message: 'Horários sobrepostos no mesmo dia da semana.', error: { code: 'BAD_REQUEST', message: 'Horários sobrepostos no mesmo dia da semana.' } }));
    await submit(editor);
    expect(editor.result.current.feedback).toContain('sobrepostos');
    expect(editor.result.current.isDirty).toBe(true);
    expect(editor.result.current.methods.getValues().days[0].entries).toHaveLength(1);
    expect(editor.result.current.pending).toBeNull();
  });

  it('409 de versão exige revisão explícita: preserva o rascunho e só reenvia com a versão revisada', async () => {
    const editor = renderEditor();
    await ready(editor);
    const base = editor.result.current.document!.version;
    // Outra sessão altera a jornada depois da leitura deste editor.
    await repo.saveScheduleScope(SHOP, { barbermanId: USER, state: 'CLOSED', entries: [], expectedVersion: base, requestId: 'other-session' });
    editCustom(editor);
    await submit(editor);

    expect(editor.result.current.versionReview?.remote).toMatchObject({ state: 'CLOSED', version: base + 1 });
    expect(editor.result.current.methods.getValues().days[0].entries).toHaveLength(1);
    expect(editor.result.current.pending).toBeNull();

    const save = vi.spyOn(repo, 'saveScheduleScope');
    await act(() => editor.result.current.save(editor.result.current.methods.getValues()));
    expect(save).not.toHaveBeenCalled();

    act(() => editor.result.current.keepMyEdit());
    await submit(editor);
    expect(save.mock.calls[0][1]).toMatchObject({ expectedVersion: base + 1, state: 'CUSTOM' });
    expect(editor.result.current.document?.state).toBe('CUSTOM');
  });

  it('409 por reserva oferece o acesso à Agenda com os horários impeditivos', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    const booking = { bookingId: 'b1', date: '2026-10-20', startTime: '10:00', endTime: '10:30', barbermanId: USER };
    vi.spyOn(repo, 'saveScheduleScope').mockRejectedValue(new ApiError('x', 409, {
      code: 'SCHEDULE_BOOKING_CONFLICT', message: 'm', conflicts: [booking], error: { code: 'SCHEDULE_BOOKING_CONFLICT', message: 'm', details: [booking] } }));
    await submit(editor);
    expect(editor.result.current.conflict).toMatchObject({ kind: 'booking', items: { bookings: [booking] } });
    expect(editor.result.current.isDirty).toBe(true);
  });

  it('timeout: nova escrita fica bloqueada, a consulta reconcilia pelo contrato de operações e não reenvia', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    repo.failNextSchedule('write', SHOP, USER, new BarberScheduleError('Timeout', 0, 'TIMEOUT', 'unknown'));
    const save = vi.spyOn(repo, 'saveScheduleScope');
    await submit(editor);
    expect(editor.result.current.pending?.state).toBe('unknown');
    expect(editor.result.current.isDirty).toBe(true);

    await act(() => editor.result.current.save(editor.result.current.methods.getValues()));
    expect(save).toHaveBeenCalledTimes(1);

    // A jornada já foi confirmada pelo servidor (replay): GET /operation-attempts devolve APPLIED.
    const applied = await repo.getScheduleScope(SHOP, USER);
    const attempt = vi.spyOn(httpClient, 'get').mockResolvedValue({ state: 'APPLIED', operation: 'UPDATE_SCHEDULE', accessChanged: false,
      serverTime: applied.serverTime, resource: { kind: 'SCHEDULE', id: `${SHOP}:${USER}`, version: applied.version, data: {
        schedules: [{ id: 'sch-x', barbershopId: SHOP, barbermanId: USER, dayOfWeek: 'MONDAY', openTime: '09:00', closeTime: '12:00' }],
        effectiveSchedules: [], state: 'CUSTOM', version: applied.version, serverTime: applied.serverTime } } });
    await act(() => editor.result.current.reconcile());
    expect(attempt.mock.calls[0][0]).toContain('/api/operation-attempts/');
    expect(editor.result.current.pending).toBeNull();
    expect(editor.result.current.isDirty).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('UNKNOWN permanece incerto; encerrar a tentativa (NOT_APPLIED) preserva o rascunho e libera revisão', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    vi.spyOn(repo, 'saveScheduleScope').mockRejectedValue(new ApiError('t', 0, null, true));
    await submit(editor);
    vi.spyOn(httpClient, 'get').mockResolvedValue({ state: 'UNKNOWN' });
    await act(() => editor.result.current.reconcile());
    expect(editor.result.current.pending?.state).toBe('unknown');

    vi.spyOn(httpClient, 'post').mockResolvedValue({ state: 'NOT_APPLIED', operation: 'CLOSED' });
    await act(() => editor.result.current.abandonAttempt());
    expect(editor.result.current.pending).toBeNull();
    expect(editor.result.current.isDirty).toBe(true);
    expect(editor.result.current.methods.getValues().days[0].entries).toHaveLength(1);
  });

  it('clique duplo concorrente grava uma única vez', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    const save = vi.spyOn(repo, 'saveScheduleScope');
    const values = editor.result.current.methods.getValues();
    await act(async () => { await Promise.all([editor.result.current.save(values), editor.result.current.save(values)]); });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('vínculo revogado antes de salvar bloqueia o envio e mantém a edição', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    state.session.memberships = [{ id: SHOP, role: 'BARBERMAN', state: 'INACTIVE' }];
    const save = vi.spyOn(repo, 'saveScheduleScope');
    await submit(editor);
    expect(save).not.toHaveBeenCalled();
    expect(editor.result.current.accessLost).toBe(true);
    expect(editor.result.current.isDirty).toBe(true);
  });

  it('unidade da sessão trocada impede gravação tardia no novo contexto', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    state.session.selectedShopId = 'outra-unidade';
    state.session.memberships = [{ id: 'outra-unidade', role: 'BARBERMAN', state: 'ACTIVE' }];
    state.session.barbershop = { id: 'outra-unidade' };
    const save = vi.spyOn(repo, 'saveScheduleScope');
    await submit(editor);
    expect(save).not.toHaveBeenCalled();
    expect(editor.result.current.accessLost).toBe(true);
  });

  it('403 do servidor bloqueia o editor sem descartar o rascunho', async () => {
    const editor = renderEditor();
    await ready(editor);
    editCustom(editor);
    vi.spyOn(repo, 'saveScheduleScope').mockRejectedValue(new ApiError('x', 403, { code: 'FORBIDDEN', message: 'sem acesso', error: { code: 'FORBIDDEN', message: 'sem acesso' } }));
    await submit(editor);
    expect(editor.result.current.accessLost).toBe(true);
    expect(editor.result.current.isDirty).toBe(true);
  });

  it('não adota dados de recuperação de outra unidade no cache ou no editor', async () => {
    vi.spyOn(operationAttemptStore, 'listReferences').mockResolvedValue([{
      actorId: USER, requestId: 'attempt-A', resourceKind: 'SCHEDULE', operation: 'UPDATE_SCHEDULE',
      status: 'uncertain', createdAt: 1792411200000, originScope: 'UNIT',
    }]);
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      state: 'APPLIED', operation: 'UPDATE_SCHEDULE', accessChanged: false,
      resource: {
        kind: 'SCHEDULE', id: 'shop-A:' + USER, version: 99,
        data: {
          barbermanId: USER,
          schedules: [{ id: 'row-A', barbershopId: 'shop-A', barbermanId: USER, dayOfWeek: 'MONDAY', openTime: '09:00', closeTime: '12:00' }],
          effectiveSchedules: [], state: 'CUSTOM', version: 99, needsReview: false, serverTime: '2026-10-19T12:00:00.000Z',
        },
      },
    });
    const editor = renderEditor();
    await ready(editor);
    const initialVersion = editor.result.current.document?.version;
    await waitFor(() => expect(editor.result.current.pending?.requestId).toBe('attempt-A'));
    await act(() => editor.result.current.reconcile());
    expect(editor.result.current.document?.version).toBe(initialVersion);
    expect(editor.result.current.document?.version).not.toBe(99);
  });

  it('resposta de leitura iniciada antes de serverClock.clear() não restaura o relógio', async () => {
    const { fetchScheduleScope } = await import('../api/availability.api');
    const { serverClock } = await import('@/features/bookings/lib/server-clock');
    let releaseRead!: (doc: any) => void;
    vi.spyOn(repo, 'getScheduleScope').mockReturnValueOnce(new Promise(resolve => { releaseRead = resolve; }));
    const readPromise = fetchScheduleScope(SHOP, USER);
    serverClock.clear();
    expect(serverClock.hasValidReference()).toBe(false);
    releaseRead({
      barbermanId: USER, schedules: [], effectiveSchedules: [], state: 'CLOSED',
      version: 2, needsReview: false, serverTime: '2026-10-19T12:00:00.000Z',
    });
    await readPromise;
    expect(serverClock.hasValidReference()).toBe(false);
  });

  it('bloqueia chooseState durante salvamento em andamento para não perder edição do usuário', async () => {
    const editor = renderEditor();
    await ready(editor);
    act(() => editor.result.current.chooseState('CLOSED'));
    let releaseSave!: (doc: any) => void;
    const send = vi.spyOn(repo, 'saveScheduleScope').mockReturnValueOnce(new Promise(resolve => { releaseSave = resolve; }));
    let pendingSave!: Promise<void>;
    act(() => { pendingSave = editor.result.current.save(editor.result.current.methods.getValues()); });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(editor.result.current.busy).toBe(true);
    act(() => editor.result.current.chooseState('INHERIT'));
    expect(editor.result.current.methods.getValues().state).toBe('CLOSED');
    await act(async () => {
      releaseSave({
        barbermanId: USER, schedules: [], effectiveSchedules: [], state: 'CLOSED',
        version: 10, needsReview: false, serverTime: '2026-10-19T12:00:00.000Z',
      });
      await pendingSave;
    });
    expect(editor.result.current.methods.getValues().state).toBe('CLOSED');
    expect(editor.result.current.isDirty).toBe(false);
  });
});
