// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityMockAdapter } from '../api/availability.mock';
import { BarberScheduleError } from '../api/barber-schedule-error';
import type { WeeklyScheduleEntry } from '../api/availability.contract';

vi.mock('@/shared/config/env', () => ({ ENV: { AVAILABILITY_SOURCE: 'mock', BARBERSHOP_ID: 'fixture-shop', API_URL: 'https://fixture.invalid', API_TIMEOUT_MS: 1000 } }));
import { availabilityRepository, AVAILABILITY_QUERY_KEYS } from '../api/availability.api';
import { useBarberScheduleViewModel } from '../model/use-barber-schedule-view-model';

const repo = availabilityRepository as AvailabilityMockAdapter;
const entry: WeeklyScheduleEntry = {
  id: 'fixture', weekday: 'MONDAY', barbermanId: 'fixture-user',
  range: { start: '09:00', end: '12:00' },
};
let client: QueryClient;
function renderEditor() {
  return renderHook(() => useBarberScheduleViewModel('fixture-shop', 'fixture-user'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await repo.saveWeeklySchedule('fixture-shop', [], 'fixture-user');
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });

describe('jornada pessoal integrada ao formulário e cache', () => {
  it('carrega sete dias e salva alterações no escopo pessoal', async () => {
    const { result } = renderEditor();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.methods.getValues().days).toHaveLength(7);
    act(() => result.current.methods.setValue('days.0.entries', [entry], { shouldDirty: true }));
    expect(result.current.isDirty).toBe(true);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await act(() => result.current.methods.handleSubmit(result.current.save)());
    expect(result.current.isDirty).toBe(false);
    expect(result.current.feedback).toContain('sucesso');
    expect(await repo.getWeeklySchedule('fixture-shop', 'fixture-user')).toHaveLength(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AVAILABILITY_QUERY_KEYS.slotsBase('fixture-shop') });
  });

  it('refetch não sobrescreve rascunho e descartar restaura dados salvos', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry], { shouldDirty: true }));
    await act(() => result.current.retry());
    expect(result.current.methods.getValues().days[0].entries).toHaveLength(1);
    act(() => result.current.discard());
    expect(result.current.methods.getValues().days[0].entries).toEqual([]);
    expect(result.current.isDirty).toBe(false);
  });

  it('erro de leitura fica visível e permite tentar novamente', async () => {
    repo.failNextSchedule('read', 'fixture-shop', 'fixture-user', new BarberScheduleError('Falha de teste', 503, 'TEST'));
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.error).toBeTruthy());
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('impede gravação inválida que atravessa a pausa da unidade', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const write = vi.spyOn(repo, 'saveWeeklySchedule');
    act(() => result.current.methods.setValue('days.0.entries', [{ ...entry, range: { start: '09:00', end: '17:00' } }], { shouldDirty: true }));
    await act(() => result.current.methods.handleSubmit(result.current.save)());
    expect(write).not.toHaveBeenCalled();
    expect(result.current.methods.getFieldState('days.0.entries.0.range.end').error?.message)
      .toContain('funcionamento da unidade');
  });

  it('bloqueia nova escrita até reconciliar resultado incerto sem perder rascunho', async () => {
    const { result } = renderEditor();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.methods.setValue('days.0.entries', [entry], { shouldDirty: true }));
    repo.failNextSchedule('write', 'fixture-shop', 'fixture-user', new BarberScheduleError('Timeout', 0, 'TIMEOUT', 'unknown'));
    repo.failNextSchedule('read', 'fixture-shop', 'fixture-user', new BarberScheduleError('Offline', 0, 'NETWORK'));
    const write = vi.spyOn(repo, 'saveWeeklySchedule');
    await act(() => result.current.save(result.current.methods.getValues()));
    expect(result.current.pending).toBe('unknown');
    expect(result.current.isDirty).toBe(true);
    await act(() => result.current.save(result.current.methods.getValues()));
    expect(write).toHaveBeenCalledTimes(1);
    await act(() => result.current.reconcile());
    expect(result.current.pending).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
