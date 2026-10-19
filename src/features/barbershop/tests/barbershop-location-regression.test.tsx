// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  session: {
    status: 'authenticated',
    identity: { id: '11111111-1111-4111-8111-111111111111' },
    selectedShopId: '22222222-2222-4222-8222-222222222222',
    token: 'synthetic-token',
    memberships: [
      {
        id: '22222222-2222-4222-8222-222222222222',
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
  createOperationAttemptStore: () => fixture.store,
  operationAttemptStore: fixture.store,
}));

import { ApiError, httpClient } from '@/shared/api';
import { serverClock } from '@/features/bookings/lib/server-clock';
import { useBarbershopLocation } from '../model/use-barbershop-location';
import {
  barbershopLocationApi,
  MAX_PIN_ADJUSTMENT_METERS,
} from '../api/barbershop-location.api';

const originalUpdateLocation = barbershopLocationApi.updateLocation;

const SHOP = fixture.session.selectedShopId;
const ACTOR = fixture.session.identity.id;
const initialLocation = {
  shopId: SHOP,
  address: 'Rua Augusta, 500',
  status: 'UNCONFIRMED' as const,
  source: 'MANUAL' as const,
  version: 0,
  point: null,
  confirmedAt: null,
  acquiredAt: null,
  validUntil: null,
  lastOwnerMutation: null,
};

const candidate = {
  candidateId: '33333333-3333-4333-8333-333333333333',
  displayAddress: 'Rua Augusta, 500 - Consolação, São Paulo - SP',
  point: { latitude: -23.55052, longitude: -46.633308 },
  expiresAt: '2099-01-01T00:00:00Z',
  attribution: 'Google Maps' as const,
};

let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('useBarbershopLocation - Regressões de Segurança e Recuperação', () => {
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

    vi.spyOn(barbershopLocationApi, 'getLocation').mockResolvedValue(initialLocation);
    vi.spyOn(barbershopLocationApi, 'updateLocation').mockResolvedValue({
      ...initialLocation,
      version: 1,
      status: 'CONFIRMED',
      lastOwnerMutation: {
        id: 'some-mutation',
        commandHash: 'hash',
        savedVersion: 1,
      },
    });

    serverClock.clear();
    serverClock.syncWithServer('2026-10-19T12:00:00.000Z');
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
    serverClock.clear();
  });

  async function mountEditor() {
    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.locationState?.version).toBe(0));
    act(() => mounted.result.current.selectCandidate(candidate));
    return mounted;
  }

  it('preserva incerteza (UNKNOWN) quando o GET após timeout não possui a mutação correspondente', async () => {
    const mounted = await mountEditor();
    vi.mocked(barbershopLocationApi.updateLocation).mockRejectedValueOnce(
      new ApiError('Timeout simulado de rede', 0, null, true),
    );

    await act(() => mounted.result.current.confirmLocation());
    expect(mounted.result.current.uncertainMutationId).toBeTruthy();

    // Reconciliação sem que o servidor tenha retornado a mutação aplicada
    await act(() => mounted.result.current.reconcileAfterUncertainty());

    // DEVE permanecer incerto (UNKNOWN), NÃO pode ser limpo nem declarado como "não aplicada"
    expect(mounted.result.current.uncertainMutationId).not.toBeNull();
    expect(mounted.result.current.errorMessage).toContain('UNKNOWN');
    expect(mounted.result.current.errorMessage).not.toContain('não havia sido aplicada');

    // Tentativa de confirmação concorrente deve ser bloqueada
    await act(() => mounted.result.current.confirmLocation());
    expect(barbershopLocationApi.updateLocation).toHaveBeenCalledTimes(1); // zero novos PATCHs
  });

  it('restaura tentativa incerta pré-existente ao montar o hook e bloqueia nova confirmação', async () => {
    fixture.store.listReferences.mockResolvedValueOnce([
      {
        actorId: ACTOR,
        requestId: 'unresolved-mutation-123',
        operation: 'UPDATE_LOCATION',
        resourceKind: 'LOCATION',
        resourceId: SHOP,
        status: 'uncertain',
      },
    ]);

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() =>
      expect(mounted.result.current.uncertainMutationId).toBe('unresolved-mutation-123'),
    );

    expect(mounted.result.current.errorMessage).toContain(
      'Existe uma confirmação de localização anterior em estado incerto',
    );

    // Tentativa de confirmar deve ser bloqueada
    await act(() => mounted.result.current.confirmLocation());
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });

  it('trata falha de storage inicial liberando o formulário e gerando zero requisições PATCH', async () => {
    const mounted = await mountEditor();
    fixture.store.save.mockRejectedValueOnce(new Error('Falha no armazenamento local'));

    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });

    expect(result).toBeNull();
    expect(mounted.result.current.isSaving).toBe(false);
    expect(mounted.result.current.errorMessage).toContain('Falha ao salvar a tentativa localmente');
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });

  it('produz no máximo um PATCH diante de cliques simultâneos via trava síncrona', async () => {
    const mounted = await mountEditor();
    const submit = mounted.result.current.confirmLocation;

    await act(async () => {
      await Promise.all([submit(), submit()]);
    });

    expect(barbershopLocationApi.updateLocation).toHaveBeenCalledTimes(1);
  });

  it('bloqueia alteração de candidato e ajuste de pino enquanto houver incerteza pendente', async () => {
    const mounted = await mountEditor();
    vi.mocked(barbershopLocationApi.updateLocation).mockRejectedValueOnce(
      new ApiError('Timeout', 504, null, false),
    );

    await act(() => mounted.result.current.confirmLocation());
    expect(mounted.result.current.uncertainMutationId).toBeTruthy();

    const anotherCandidate = {
      ...candidate,
      candidateId: '44444444-4444-4444-8444-444444444444',
      displayAddress: 'Av. Brasil, 1500',
    };

    // Tentar selecionar outro candidato
    act(() => mounted.result.current.selectCandidate(anotherCandidate));
    expect(mounted.result.current.selectedCandidate?.candidateId).toBe(candidate.candidateId);
    expect(mounted.result.current.errorMessage).toContain('incerto');

    // Tentar mover o pino
    act(() => mounted.result.current.adjustPin({ latitude: -23.56, longitude: -46.64 }));
    expect(mounted.result.current.errorMessage).toContain('incerto');
  });

  it('exige papel OWNER ativo para buscar endereços e confirmar localização', async () => {
    // Altera papel para BARBERMAN
    fixture.session.memberships = [
      {
        id: SHOP,
        role: 'BARBERMAN',
        state: 'ACTIVE',
        status: 'ACTIVE',
        name: 'Barbearia Central',
        timezone: 'America/Sao_Paulo',
      },
    ];

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.isLoading).toBe(false));

    expect(mounted.result.current.isAuthorized).toBe(false);

    // Tentar buscar candidatos
    await act(() => mounted.result.current.searchCandidates());
    expect(mounted.result.current.errorMessage).toContain('Apenas proprietários (OWNER) ativos');

    // Tentar confirmar
    await act(() => mounted.result.current.confirmLocation());
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });

  it('deve tratar resposta 2xx malformada ({}) como incerteza (UNKNOWN) via adapter real e certificar zero PATCH adicional no segundo envio', async () => {
    vi.mocked(barbershopLocationApi.updateLocation).mockImplementationOnce(
      originalUpdateLocation.bind(barbershopLocationApi),
    );
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({});

    const mounted = await mountEditor();
    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });

    expect(result).toBeNull();
    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(mounted.result.current.uncertainMutationId).toBeTruthy();
    expect(mounted.result.current.restorationStatus).toBe('uncertain');
    expect(mounted.result.current.errorMessage).toContain(
      'resposta não pôde ser interpretada',
    );

    // Reconciliação sem confirmação do servidor mantém UNKNOWN e trava mutações
    await act(async () => {
      await mounted.result.current.reconcileAfterUncertainty();
    });
    expect(mounted.result.current.uncertainMutationId).not.toBeNull();
    expect(mounted.result.current.errorMessage).toContain('UNKNOWN');

    // Segunda tentativa de confirmação direta deve retornar null e gerar zero PATCHs adicionais
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });

    expect(result).toBeNull();
    expect(patchSpy).toHaveBeenCalledTimes(1); // Continua 1, zero novos PATCHs
  });

  it('erro de validação local pré-transporte não gera incerteza nem envia PATCH', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch');
    const mounted = await mountEditor();

    // Ajusta pino para fora do limite de 250m
    act(() => {
      mounted.result.current.adjustPin({ latitude: 10, longitude: 10 });
    });

    expect(mounted.result.current.isPinOutOfBounds).toBe(true);

    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });

    expect(result).toBeNull();
    expect(patchSpy).not.toHaveBeenCalled();
    expect(mounted.result.current.uncertainMutationId).toBeNull();
    expect(mounted.result.current.restorationStatus).toBe('ready');
  });

  it('bloqueia confirmLocation enquanto listReferences estiver pendente e mantém bloqueado após resolver tentativa incerta', async () => {
    let releaseList: (value: any) => void = () => {};
    fixture.store.listReferences.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseList = resolve;
      }),
    );

    const patchSpy = vi.spyOn(httpClient, 'patch');
    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });

    await waitFor(() => expect(mounted.result.current.locationState?.version).toBe(0));
    act(() => mounted.result.current.selectCandidate(candidate));

    // Estado deve ser explicitamente restoring
    expect(mounted.result.current.isRestoring).toBe(true);
    expect(mounted.result.current.restorationStatus).toBe('restoring');

    // Chamada direta a confirmLocation deve retornar null e gerar zero PATCH
    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(patchSpy).not.toHaveBeenCalled();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();

    // Resolve com tentativa incerta anterior
    await act(async () => {
      releaseList([
        {
          actorId: ACTOR,
          requestId: 'older-unresolved-123',
          operation: 'UPDATE_LOCATION',
          resourceKind: 'LOCATION',
          resourceId: SHOP,
          status: 'uncertain',
        },
      ]);
    });

    expect(mounted.result.current.isRestoring).toBe(false);
    expect(mounted.result.current.restorationStatus).toBe('uncertain');
    expect(mounted.result.current.uncertainMutationId).toBe('older-unresolved-123');

    // Segunda tentativa deve continuar bloqueada (zero PATCH)
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it('leitura de listReferences pendente que resolve vazia transiciona para ready e permite uma confirmação válida', async () => {
    let releaseList: (value: any) => void = () => {};
    fixture.store.listReferences.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseList = resolve;
      }),
    );

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.locationState?.version).toBe(0));
    act(() => mounted.result.current.selectCandidate(candidate));

    expect(mounted.result.current.isRestoring).toBe(true);

    // Tentativa prematura é bloqueada
    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();

    // Resolve lista vazia
    await act(async () => {
      releaseList([]);
    });

    expect(mounted.result.current.isRestoring).toBe(false);
    expect(mounted.result.current.restorationStatus).toBe('ready');
    expect(mounted.result.current.uncertainMutationId).toBeNull();

    // Com o estado ready, a seleção do candidato é aceita
    act(() => mounted.result.current.selectCandidate(candidate));

    // Agora chamada deve ser executada com sucesso
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).not.toBeNull();
    expect(barbershopLocationApi.updateLocation).toHaveBeenCalledTimes(1);
  });

  it('troca de unidade durante restauração ignora resolução atrasada da unidade anterior', async () => {
    let releaseFirst: (value: any) => void = () => {};
    fixture.store.listReferences.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseFirst = resolve;
      }),
    );

    const OTHER_SHOP = '88888888-8888-4888-8888-888888888888';
    fixture.session.memberships.push({
      id: OTHER_SHOP,
      role: 'OWNER',
      state: 'ACTIVE',
      status: 'ACTIVE',
      name: 'Outra Unidade',
      timezone: 'America/Sao_Paulo',
    });

    let currentShop = SHOP;
    const { result, rerender } = renderHook(() => useBarbershopLocation(currentShop), { wrapper });

    expect(result.current.isRestoring).toBe(true);

    // Troca de unidade para OTHER_SHOP antes da resolução da primeira
    currentShop = OTHER_SHOP;
    fixture.session.selectedShopId = OTHER_SHOP;
    rerender();

    // A primeira promise resolve tarde com incerteza da unidade 1
    await act(async () => {
      releaseFirst([
        {
          actorId: ACTOR,
          requestId: 'shop1-stale-uncertain',
          operation: 'UPDATE_LOCATION',
          resourceKind: 'LOCATION',
          resourceId: SHOP,
          status: 'uncertain',
        },
      ]);
    });

    // A unidade atual NÃO pode ter sido contaminada pela mutação incerta da unidade anterior
    expect(result.current.uncertainMutationId).not.toBe('shop1-stale-uncertain');
  });

  it('falha ao consultar storage (listReferences rejeitado) coloca hook em estado error, bloqueia envio e retryRestoration recupera o fluxo', async () => {
    fixture.store.listReferences.mockRejectedValueOnce(
      new Error('synthetic storage read failure'),
    );

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.restorationStatus).toBe('error'));

    expect(mounted.result.current.restorationError?.message).toBe('synthetic storage read failure');
    expect(mounted.result.current.errorMessage).toContain('Falha ao verificar histórico de tentativas locais');

    act(() => mounted.result.current.selectCandidate(candidate));

    // Chamada direta deve retornar null e zero PATCH
    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();

    // Executa retry com sucesso (lista vazia)
    fixture.store.listReferences.mockResolvedValueOnce([]);
    await act(async () => {
      await mounted.result.current.retryRestoration();
    });

    expect(mounted.result.current.restorationStatus).toBe('ready');
    expect(mounted.result.current.restorationError).toBeNull();

    // Com o estado ready, a seleção do candidato é aceita
    act(() => mounted.result.current.selectCandidate(candidate));

    // Agora confirmação é permitida
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).not.toBeNull();
    expect(barbershopLocationApi.updateLocation).toHaveBeenCalledTimes(1);
  });

  it('retryRestoration que encontra tentativa incerta transiciona para uncertain e mantém bloqueio de envio', async () => {
    fixture.store.listReferences.mockRejectedValueOnce(
      new Error('synthetic storage read failure'),
    );

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.restorationStatus).toBe('error'));

    fixture.store.listReferences.mockResolvedValueOnce([
      {
        actorId: ACTOR,
        requestId: 'retry-found-uncertain',
        operation: 'UPDATE_LOCATION',
        resourceKind: 'LOCATION',
        resourceId: SHOP,
        status: 'uncertain',
      },
    ]);

    await act(async () => {
      await mounted.result.current.retryRestoration();
    });

    expect(mounted.result.current.restorationStatus).toBe('uncertain');
    expect(mounted.result.current.uncertainMutationId).toBe('retry-found-uncertain');

    act(() => mounted.result.current.selectCandidate(candidate));
    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });

  it('rejeita autorização se membership.state for INACTIVE mesmo com status ACTIVE e bloqueia confirmLocation', async () => {
    fixture.session.memberships = [
      {
        id: SHOP,
        role: 'OWNER',
        state: 'INACTIVE',
        status: 'ACTIVE',
        name: 'Barbearia Central',
        timezone: 'America/Sao_Paulo',
      },
    ];

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.isLoading).toBe(false));

    expect(mounted.result.current.isAuthorized).toBe(false);

    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
    expect(mounted.result.current.errorMessage).toContain('Apenas proprietários (OWNER) ativos');
  });

  it('rejeita autorização se o usuário for OWNER em outra unidade mas não na unidade selecionada', async () => {
    fixture.session.memberships = [
      {
        id: '99999999-9999-4999-8999-999999999999',
        role: 'OWNER',
        state: 'ACTIVE',
        status: 'ACTIVE',
        name: 'Outra Barbearia',
        timezone: 'America/Sao_Paulo',
      },
    ];

    const mounted = renderHook(() => useBarbershopLocation(SHOP), { wrapper });
    await waitFor(() => expect(mounted.result.current.isLoading).toBe(false));

    expect(mounted.result.current.isAuthorized).toBe(false);

    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });
    expect(result).toBeNull();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });

  it('revalida autorização antes do envio e bloqueia se o vínculo ativo for revogado antes da confirmação', async () => {
    const mounted = await mountEditor();
    expect(mounted.result.current.isAuthorized).toBe(true);

    fixture.session.memberships[0].state = 'INACTIVE';

    let result: any;
    await act(async () => {
      result = await mounted.result.current.confirmLocation();
    });

    expect(result).toBeNull();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
    expect(mounted.result.current.errorMessage).toContain('Apenas proprietários (OWNER) ativos');
  });
});
