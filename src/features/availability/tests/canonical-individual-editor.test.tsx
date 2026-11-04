// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityMockAdapter } from '../api/availability.mock';
import { BarberScheduleError } from '../api/barber-schedule-error';
import { isValidUuidV7 } from '@/features/bookings/lib/attempt-id';
import { operationAttemptStore } from '@/shared/operations/operation-attempt-store';

const sessionMock = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    identity: { id: 'user-owner-1', name: 'Proprietário Silva' },
    selectedShopId: 'shop-1',
    memberships: [
      { id: 'shop-1', role: 'OWNER', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
    ],
    barbershop: { id: 'shop-1', name: 'Barbearia Central' },
  } as any,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => sessionMock.state,
}));

vi.mock('@/shared/config/env', () => ({
  ENV: {
    AVAILABILITY_SOURCE: 'mock',
    BARBERSHOP_ID: 'shop-1',
    API_URL: 'https://fixture.invalid',
    API_TIMEOUT_MS: 1000,
  },
}));

import { availabilityRepository, AVAILABILITY_QUERY_KEYS } from '../api/availability.api';
import { useBarberScheduleViewModel } from '../model/use-barber-schedule-view-model';

const repo = availabilityRepository as AvailabilityMockAdapter;
const SHOP = 'shop-1';
const OWNER_ID = 'user-owner-1';
const BARBER_A_ID = 'user-barber-1';
const BARBER_B_ID = 'user-barber-2';

let client: QueryClient;

function renderEditor(shopId: string, barbermanId: string, explicitActorId?: string) {
  return renderHook(
    () => useBarberScheduleViewModel(shopId, barbermanId, explicitActorId),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
}

async function ready(editor: ReturnType<typeof renderEditor>) {
  await waitFor(() => expect(editor.result.current.loading).toBe(false));
  await waitFor(() => expect(editor.result.current.document).not.toBeNull());
}

describe('Fase 3 — Editor Individual Canônico e Contrato de Escrita', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
    });

    // Reset default session to OWNER
    sessionMock.state.identity = { id: OWNER_ID, name: 'Proprietário Silva' };
    sessionMock.state.memberships = [
      { id: SHOP, role: 'OWNER', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
    ];
    sessionMock.state.selectedShopId = SHOP;
    sessionMock.state.barbershop = { id: SHOP, name: 'Barbearia Central' };

    await operationAttemptStore.clearAllForActor(OWNER_ID);
    await operationAttemptStore.clearAllForActor(BARBER_A_ID);
    await operationAttemptStore.clearAllForActor(BARBER_B_ID);

    // Initial mock scopes
    const currentA = await repo.getScheduleScope(SHOP, BARBER_A_ID);
    await repo.saveScheduleScope(SHOP, {
      barbermanId: BARBER_A_ID,
      state: 'INHERIT',
      entries: [],
      expectedVersion: currentA.version,
      requestId: `seed-a-${Date.now()}`,
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
  });

  describe('1. Persistência e Coerência entre OWNER e Profissional', () => {
    it('OWNER e profissional consultam e operam sobre os mesmos dados individuais persistidos', async () => {
      // 1. OWNER edita os horários do BARBER_A para CUSTOM
      const ownerEditor = renderEditor(SHOP, BARBER_A_ID);
      await ready(ownerEditor);

      act(() => ownerEditor.result.current.chooseState('CUSTOM'));
      act(() =>
        ownerEditor.result.current.methods.setValue(
          'days.0.entries',
          [
            {
              id: 'mon-entry',
              weekday: 'MONDAY',
              barbermanId: BARBER_A_ID,
              range: { start: '10:00', end: '16:00' },
            },
          ],
          { shouldDirty: true },
        ),
      );

      await act(() =>
        ownerEditor.result.current.methods.handleSubmit(ownerEditor.result.current.save)(),
      );
      expect(ownerEditor.result.current.feedback).toContain('sucesso');
      const savedVersion = ownerEditor.result.current.document!.version;
      expect(ownerEditor.result.current.document!.state).toBe('CUSTOM');

      // 2. Agora o próprio BARBER_A autentica-se e consulta sua jornada
      sessionMock.state.identity = { id: BARBER_A_ID, name: 'Carlos Barbeiro' };
      sessionMock.state.memberships = [
        { id: SHOP, role: 'BARBERMAN', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
      ];

      const clientBarber = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { result: barberEditor } = renderHook(
        () => useBarberScheduleViewModel(SHOP, BARBER_A_ID),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={clientBarber}>{children}</QueryClientProvider>
          ),
        },
      );

      await waitFor(() => expect(barberEditor.current.loading).toBe(false));
      expect(barberEditor.current.document?.state).toBe('CUSTOM');
      expect(barberEditor.current.document?.version).toBe(savedVersion);
      expect(barberEditor.current.methods.getValues().state).toBe('CUSTOM');
      expect(barberEditor.current.methods.getValues().days[0].entries[0].range).toEqual({
        start: '10:00',
        end: '16:00',
      });
    });
  });

  describe('2. Separação Estrita de actorId e targetBarbermanId', () => {
    it('quando OWNER edita colega, registra operação para o OWNER e resourceId para o colega', async () => {
      const storeSaveSpy = vi.spyOn(operationAttemptStore, 'save');
      const storeListSpy = vi.spyOn(operationAttemptStore, 'listReferences');

      const editor = renderEditor(SHOP, BARBER_A_ID);
      await ready(editor);

      expect(storeListSpy).toHaveBeenCalledWith(OWNER_ID);

      act(() => editor.result.current.chooseState('CLOSED'));
      await act(() =>
        editor.result.current.methods.handleSubmit(editor.result.current.save)(),
      );

      expect(editor.result.current.feedback).toContain('sucesso');

      // Verifica se todas as chamadas ao store usaram OWNER_ID como ator e resourceId correto
      for (const call of storeSaveSpy.mock.calls) {
        const [savedActorId, record] = call;
        expect(savedActorId).toBe(OWNER_ID);
        expect(record.actorId).toBe(OWNER_ID);
        expect(record.resourceId).toBe(`${SHOP}:${BARBER_A_ID}`);
      }
    });
  });

  describe('3. Autorização e Isolamento de Tenants', () => {
    it('impede que BARBERMAN salve jornada de colega', async () => {
      // Sessão de barbeiro comum
      sessionMock.state.identity = { id: BARBER_A_ID, name: 'Carlos Barbeiro' };
      sessionMock.state.memberships = [
        { id: SHOP, role: 'BARBERMAN', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
      ];

      // Tenta editar o colega BARBER_B_ID
      const editor = renderEditor(SHOP, BARBER_B_ID);
      await ready(editor);

      act(() => editor.result.current.chooseState('CLOSED'));
      await act(() =>
        editor.result.current.methods.handleSubmit(editor.result.current.save)(),
      );

      expect(editor.result.current.accessLost).toBe(true);
      expect(editor.result.current.feedback).toContain('Seu acesso a esta unidade mudou');
    });

    it('impede gravação em outra barbearia sem vínculo', async () => {
      const editor = renderEditor('outro-shop-999', BARBER_A_ID);
      await ready(editor);

      act(() => editor.result.current.chooseState('CLOSED'));
      await act(() =>
        editor.result.current.methods.handleSubmit(editor.result.current.save)(),
      );

      expect(editor.result.current.accessLost).toBe(true);
    });
  });

  describe('4. CUSTOM Independente e Sem Derivação Indevida', () => {
    it('mantém CUSTOM mesmo se a unidade geral estiver fechada', async () => {
      // Força unidade geral como CLOSED
      const generalDoc = await repo.getScheduleScope(SHOP);
      await repo.saveScheduleScope(SHOP, {
        state: 'CLOSED',
        entries: [],
        expectedVersion: generalDoc.version,
        requestId: `general-closed-${Date.now()}`,
      });

      const editor = renderEditor(SHOP, BARBER_A_ID);
      await ready(editor);

      expect(editor.result.current.generalClosed).toBe(true);

      // Define jornada CUSTOM para o barbeiro
      act(() => editor.result.current.chooseState('CUSTOM'));
      act(() =>
        editor.result.current.methods.setValue(
          'days.1.entries',
          [
            {
              id: 'tue-entry',
              weekday: 'TUESDAY',
              barbermanId: BARBER_A_ID,
              range: { start: '08:00', end: '12:00' },
            },
          ],
          { shouldDirty: true },
        ),
      );

      await act(() =>
        editor.result.current.methods.handleSubmit(editor.result.current.save)(),
      );
      expect(editor.result.current.feedback).toContain('sucesso');
      expect(editor.result.current.document?.state).toBe('CUSTOM');
    });
  });

  describe('5. Concorrência e Conflito de Versão', () => {
    it('detecta SCHEDULE_VERSION_CONFLICT e permite revisar versão remota', async () => {
      const editor = renderEditor(SHOP, BARBER_A_ID);
      await ready(editor);

      // Simula alteração concorrente que incrementa a versão no backend
      const currentDoc = await repo.getScheduleScope(SHOP, BARBER_A_ID);
      await repo.saveScheduleScope(SHOP, {
        barbermanId: BARBER_A_ID,
        state: 'CUSTOM',
        entries: [
          {
            weekday: 'FRIDAY',
            barbermanId: BARBER_A_ID,
            range: { start: '14:00', end: '18:00' },
          },
        ],
        expectedVersion: currentDoc.version,
        requestId: `concurrent-${Date.now()}`,
      });

      // Tenta salvar com versão desatualizada
      act(() => editor.result.current.chooseState('CLOSED'));
      await act(() =>
        editor.result.current.methods.handleSubmit(editor.result.current.save)(),
      );

      await waitFor(() => expect(editor.result.current.versionReview).not.toBeNull());
      expect(editor.result.current.versionReview?.remote.version).toBe(currentDoc.version + 1);

      // Usuário decide adotar a versão salva
      act(() => editor.result.current.useSavedSchedule());
      expect(editor.result.current.versionReview).toBeNull();
      expect(editor.result.current.document?.state).toBe('CUSTOM');
    });
  });
});
