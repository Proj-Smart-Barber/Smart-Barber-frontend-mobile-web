// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const fixture = vi.hoisted(() => ({
  session: {
    status: 'authenticated',
    identity: { id: 'barber-111' },
    selectedShopId: 'shop-222',
    token: 'synthetic-token',
    memberships: [
      {
        id: 'shop-222',
        role: 'OWNER',
        state: 'ACTIVE',
        status: 'ACTIVE',
        name: 'Barbearia Central',
        timezone: 'America/Sao_Paulo',
      },
    ],
  },
  store: {
    read: vi.fn(),
    save: vi.fn(),
    listReferences: vi.fn(),
    clearResolved: vi.fn(),
    clearPayloadsOnLogout: vi.fn(),
    clearAllForActor: vi.fn(),
  },
}));

vi.mock('@/features/auth/model/use-session', () => ({
  useSession: () => fixture.session,
}));
vi.mock('@/features/auth', () => ({
  useSession: () => fixture.session,
}));
vi.mock('@/shared/operations/operation-attempt-store', () => ({
  operationAttemptStore: fixture.store,
  createOperationAttemptStore: () => fixture.store,
}));

import {
  reconcileSchedule,
  matchesScheduleScope,
  buildScheduleResourceId,
} from '../model/schedule-operation-engine';
import { useBarberScheduleViewModel } from '../model/use-barber-schedule-view-model';
import { availabilityRepository } from '../api/availability.api';

describe('Schedule Scope Isolation & Context Switching Regressions', () => {
  const SHOP = 'shop-222';
  const ACTOR = 'barber-111';

  let client: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    fixture.session.selectedShopId = SHOP;
    fixture.session.memberships = [
      {
        id: SHOP,
        role: 'OWNER',
        state: 'ACTIVE',
        status: 'ACTIVE',
        name: 'Barbearia Central',
        timezone: 'America/Sao_Paulo',
      },
    ];
    fixture.store.save.mockResolvedValue(undefined);
    fixture.store.read.mockResolvedValue(null);
    fixture.store.listReferences.mockResolvedValue([]);
    fixture.store.clearResolved.mockResolvedValue(undefined);

    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60000 } },
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
  });

  it('matchesScheduleScope exige estritamente shopId:barbermanId para escopos pessoais', () => {
    const personalResource = buildScheduleResourceId(SHOP, ACTOR);
    expect(matchesScheduleScope(personalResource, SHOP, ACTOR)).toBe(true);

    // O id da barbearia NÃO deve casar com o escopo pessoal
    expect(matchesScheduleScope(SHOP, SHOP, ACTOR)).toBe(false);

    // Para escopo geral (barbermanId null), shopId casa perfeitamente
    expect(matchesScheduleScope(SHOP, SHOP, null)).toBe(true);
  });

  it('rejeita adotar dados de jornada geral como se fossem jornada pessoal de profissional', async () => {
    const outcome = await reconcileSchedule(
      ACTOR,
      'req-general-1',
      ACTOR,
      {
        store: fixture.store,
        findAttempt: async () => ({
          state: 'APPLIED',
          operation: 'UPDATE_SCHEDULE',
          resource: {
            kind: 'SCHEDULE',
            id: SHOP, // recurso geral, não SHOP:ACTOR
            data: {
              state: 'CUSTOM',
              version: 10,
              serverTime: '2026-10-19T12:00:00Z',
              schedules: [
                {
                  id: 'gen-row',
                  barbershopId: SHOP,
                  barbermanId: null,
                  dayOfWeek: 'MONDAY',
                  openTime: '09:00',
                  closeTime: '12:00',
                },
              ],
              effectiveSchedules: [],
            },
          },
        }),
      },
      SHOP,
    );

    // DEVE retornar unknown por não corresponder ao escopo pessoal
    expect(outcome.kind).toBe('unknown');
  });

  it('aborta o envio quando a unidade selecionada na sessão muda durante o salvamento local', async () => {
    const schedule = {
      barbermanId: ACTOR,
      state: 'CLOSED' as const,
      version: 2,
      schedules: [],
      effectiveSchedules: [],
      needsReview: false,
      serverTime: '2026-10-19T12:00:00.000Z',
    };

    vi.spyOn(availabilityRepository, 'getBarbershop').mockResolvedValue({
      id: SHOP,
      name: 'Barbearia Central',
      timezone: 'America/Sao_Paulo',
    });
    vi.spyOn(availabilityRepository, 'getScheduleScope').mockResolvedValue(schedule);
    const send = vi
      .spyOn(availabilityRepository, 'saveScheduleScope')
      .mockResolvedValue({ ...schedule, version: 3 });

    const mounted = renderHook(() => useBarberScheduleViewModel(SHOP, ACTOR), {
      wrapper,
    });
    await waitFor(() => expect(mounted.result.current.document?.version).toBe(2));

    let releaseStore: () => void = () => {};
    fixture.store.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseStore = resolve as any;
        }),
    );

    let savingPromise: Promise<void> | undefined;
    act(() => {
      savingPromise = mounted.result.current.save(
        mounted.result.current.methods.getValues(),
      );
    });

    await waitFor(() => expect(releaseStore).toBeTypeOf('function'));

    // Usuário altera a unidade selecionada na sessão
    fixture.session.selectedShopId = 'other-shop-999';
    fixture.session.memberships = [
      {
        id: 'other-shop-999',
        role: 'OWNER',
        state: 'ACTIVE',
        status: 'ACTIVE',
        name: 'Outra Barbearia',
        timezone: 'America/Sao_Paulo',
      },
    ];
    mounted.rerender();

    // Libera a escrita no storage
    await act(async () => {
      releaseStore();
      await savingPromise;
    });

    // Como o contexto mudou antes da chamada de rede, saveScheduleScope NÃO deve ser chamado!
    expect(send).not.toHaveBeenCalled();
  });
});
