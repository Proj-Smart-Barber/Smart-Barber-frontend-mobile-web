// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({ useSession: () => ({ signOut: vi.fn() }) }));
vi.mock('@/shared/config/env', () => ({ ENV: { AVAILABILITY_SOURCE: 'http', API_URL: 'https://fixture.invalid' } }));
import { ApiError, httpClient } from '@/shared/api';
import { AVAILABILITY_QUERY_KEYS } from '../api/availability.api';
import { useAvailabilityViewModel } from '../model/use-availability-view-model';
import { useAvailabilityScheduleForm } from '../model/use-availability-schedule-form';
import type { WeeklyScheduleEntry } from '../api/availability.contract';

const SHOP = 'shop-A';
const BARBER = 'barber-A';
const entry = (start = '09:00', end = '12:00', barbermanId: string | null = BARBER): WeeklyScheduleEntry => ({
  id: 'entry', weekday: 'MONDAY', barbermanId, range: { start, end },
});
let client: QueryClient;
let general: WeeklyScheduleEntry[];
let personal: WeeklyScheduleEntry[];
function renderEditor(barbermanId: string | null = BARBER) {
  return renderHook(() => {
    const vm = useAvailabilityViewModel(SHOP, barbermanId);
    return { vm, ...useAvailabilityScheduleForm(vm) };
  }, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  general = [entry('08:00', '12:00', null), entry('13:00', '18:00', null)];
  personal = [];
  vi.spyOn(httpClient, 'get').mockImplementation(async (url, options) => {
    if (url.endsWith('/schedule-exceptions')) return { exceptions: [] } as any;
    if (url.endsWith('/schedules')) {
      const rows = options?.params?.barbermanId ? personal : general;
      return { schedules: rows.map(e => ({ id: e.id, barbermanId: e.barbermanId,
        dayOfWeek: e.weekday, openTime: e.range.start, closeTime: e.range.end })) } as any;
    }
    return { barbershop: { id: SHOP, name: 'Unidade', timezone: 'America/Sao_Paulo' } } as any;
  });
  vi.spyOn(httpClient, 'put').mockImplementation(async (_url, body, options) => {
    const barbermanId = String(options?.params?.barbermanId ?? '') || null;
    const rows = (body as { schedules: { dayOfWeek: 'MONDAY'; openTime: string; closeTime: string }[] }).schedules
      .map((s, i) => ({ id: String(i), weekday: s.dayOfWeek, barbermanId, range: { start: s.openTime, end: s.closeTime } }));
    if (barbermanId) personal = rows;
    else general = rows;
    return { message: 'ok' } as any;
  });
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });

describe('editor de jornada aberto pela equipe — contrato HTTP', () => {
  it('semana individual vazia não herda a abertura e pode ser salva vazia', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    expect(result.current.methods.getValues().days.every(day => day.entries.length === 0)).toBe(true);
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(httpClient.put).toHaveBeenCalledWith(`/api/barbershops/${SHOP}/schedules`,
      { schedules: [] }, { params: { barbermanId: BARBER } });
    expect(result.current.methods.getValues().days.every(day => day.entries.length === 0)).toBe(true);
    expect(general).toHaveLength(2);
  });

  it('preserva a jornada geral no modo sem profissional', async () => {
    const { result } = renderEditor(null);
    await waitFor(() => expect(result.current.methods.getValues().days[0].entries).toHaveLength(2));
    act(() => result.current.methods.setValue('days.0.entries', [entry('07:00', '20:00', null)], { shouldDirty: true }));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(httpClient.put).toHaveBeenCalledWith(`/api/barbershops/${SHOP}/schedules`,
      { schedules: [{ dayOfWeek: 'MONDAY', openTime: '07:00', closeTime: '20:00' }] }, { params: undefined });
  });

  it.each([['07:00', '10:00'], ['09:00', '17:00']])('bloqueia turno %s–%s fora da abertura ou atravessando pausa', async (start, end) => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry(start, end)], { shouldDirty: true }));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(httpClient.put).not.toHaveBeenCalled();
    expect(result.current.methods.getFieldState('days.0.entries.0.range.end').error).toBeTruthy();
  });

  it('exige turnos separados mesmo para períodos gerais contíguos', async () => {
    general = [entry('08:00', '12:00', null), entry('12:00', '18:00', null)];
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry('09:00', '17:00')], { shouldDirty: true }));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(httpClient.put).not.toHaveBeenCalled();
    act(() => result.current.methods.setValue('days.0.entries', [entry('09:00', '12:00'), entry('12:00', '17:00')], { shouldDirty: true }));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(httpClient.put).toHaveBeenCalledTimes(1);
    expect(result.current.methods.formState.isDirty).toBe(false);
  });

  it('associa as issues reais de 400 aos campos e preserva o rascunho', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry()], { shouldDirty: true }));
    vi.mocked(httpClient.put).mockRejectedValueOnce(new ApiError('HTTP', 400, { errors: [
      { path: ['schedules', 0, 'openTime'], message: 'Abertura inválida.' },
      { path: ['schedules', 0, 'closeTime'], message: 'Fechamento inválido.' },
    ] }));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(result.current.methods.getFieldState('days.0.entries.0.range.start').error?.message).toBe('Abertura inválida.');
    expect(result.current.methods.getFieldState('days.0.entries.0.range.end').error?.message).toBe('Fechamento inválido.');
    expect(result.current.methods.formState.isDirty).toBe(true);
    expect(personal).toEqual([]);
  });

  it.each([401, 403, 409])('rejeição HTTP %s preserva cache e edição', async status => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry()], { shouldDirty: true }));
    vi.mocked(httpClient.put).mockRejectedValueOnce(new ApiError('HTTP', status,
      status === 409 ? { code: 'SCHEDULE_BOOKING_CONFLICT', conflicts: [] } : {}));
    let outcome: Awaited<ReturnType<typeof result.current.submitJourney>>;
    await act(async () => { outcome = await result.current.submitJourney(result.current.methods.getValues()); });
    expect(outcome!.kind).toBe('rejected');
    expect(result.current.methods.formState.isDirty).toBe(true);
    expect(client.getQueryData(AVAILABILITY_QUERY_KEYS.schedule(SHOP, BARBER))).toEqual([]);
    expect(result.current.vm.schedulePending).toBeNull();
  });

  it.each([500, 0])('PUT confirmado + GET %s bloqueia outra escrita e reconcilia sem perder edição', async status => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry()], { shouldDirty: true }));
    vi.mocked(httpClient.get).mockRejectedValueOnce(new ApiError('Falha na releitura', status, null, status === 0));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(result.current.vm.schedulePending).toBe('unconfirmed-view');
    expect(result.current.vm.scheduleMessage).toContain('Jornada salva');
    expect(result.current.methods.formState.isDirty).toBe(true);
    await act(() => result.current.submitJourney(result.current.methods.getValues()).then(() => {}));
    expect(httpClient.put).toHaveBeenCalledTimes(1);
    vi.mocked(httpClient.get).mockRejectedValueOnce(new ApiError('Falha', 500));
    await act(() => result.current.reconcileJourney().then(() => {}));
    expect(result.current.vm.schedulePending).toBe('unconfirmed-view');
    await act(() => result.current.reconcileJourney().then(() => {}));
    expect(result.current.vm.schedulePending).toBeNull();
    expect(result.current.methods.formState.isDirty).toBe(false);
    expect(httpClient.put).toHaveBeenCalledTimes(1);
  });

  it('timeout no PUT com estado divergente mantém rascunho após consultar', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry()], { shouldDirty: true }));
    vi.mocked(httpClient.put).mockRejectedValueOnce(new ApiError('Timeout', 0, null, true));
    await act(() => result.current.methods.handleSubmit(result.current.submitJourney)());
    expect(result.current.vm.schedulePending).toBe('unknown');
    let message: string | null = null;
    await act(async () => { message = await result.current.reconcileJourney(); });
    expect(message).toContain('difere');
    expect(result.current.vm.schedulePending).toBeNull();
    expect(result.current.methods.getValues().days[0].entries[0].range.start).toBe('09:00');
    expect(result.current.methods.formState.isDirty).toBe(true);
    expect(httpClient.put).toHaveBeenCalledTimes(1);
  });

  it('refetch não sobrescreve uma edição local', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.vm.isLoadingInitial).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry()], { shouldDirty: true }));
    personal = [entry('10:00', '11:00')];
    await act(async () => { await client.refetchQueries({ queryKey: AVAILABILITY_QUERY_KEYS.schedule(SHOP, BARBER) }); });
    expect(result.current.methods.getValues().days[0].entries[0].range.start).toBe('09:00');
    expect(result.current.methods.formState.isDirty).toBe(true);
  });
});
