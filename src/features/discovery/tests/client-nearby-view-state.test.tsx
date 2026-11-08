// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useClientNearbyViewState,
  buildClientNearbyStateKey,
  DEFAULT_CLIENT_NEARBY_VIEW_STATE,
  type ClientNearbyViewState,
} from '../model/use-client-nearby-view-state';

let mockSession = {
  status: 'authenticated',
  identity: { id: 'client-alpha', name: 'Cliente Alpha' },
};

vi.mock('@/features/auth', () => ({
  useSession: () => mockSession,
}));

describe('N3 — useClientNearbyViewState: Preservação de Estado Isolada por Ator', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockSession = {
      status: 'authenticated',
      identity: { id: 'client-alpha', name: 'Cliente Alpha' },
    };
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('buildClientNearbyStateKey gera chave canônica imutável isolada por ator', () => {
    const keyAlpha = buildClientNearbyStateKey('client-alpha');
    const keyBeta = buildClientNearbyStateKey('client-beta');

    expect(keyAlpha).toEqual(['client-ui', 'nearby', 'client-alpha']);
    expect(keyBeta).toEqual(['client-ui', 'nearby', 'client-beta']);
    expect(keyAlpha).not.toEqual(keyBeta);
  });

  it('recupera defaultState quando o QueryClient não tem estado prévio salvo', () => {
    const { result } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE),
      { wrapper },
    );

    expect(result.current.initialState).toEqual(DEFAULT_CLIENT_NEARBY_VIEW_STATE);
  });

  it('nearby_filters_restore_after_catalog_return: restaura busca, região, modo, raio e offset após desmontar e remontar', () => {
    const customSavedState: ClientNearbyViewState = {
      mode: 'NEARBY',
      radiusKm: 25,
      searchQuery: 'Barbearia Vintage',
      regionFilter: 'Centro',
      scrollOffset: 340,
    };

    // Primeira montagem: salva o estado
    const { result: firstMount, unmount } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE),
      { wrapper },
    );

    act(() => {
      firstMount.current.saveState(customSavedState);
    });

    // Simula navegação para o catálogo (/barbershops/[shopId]/services), desmontando a tela
    unmount();

    // Estado persiste no QueryClient raiz sob a chave do ator
    const cached = queryClient.getQueryData<ClientNearbyViewState>(
      buildClientNearbyStateKey('client-alpha'),
    );
    expect(cached).toEqual(customSavedState);

    // Segunda montagem: retorna do catálogo para Perto de você
    const { result: secondMount } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE),
      { wrapper },
    );

    expect(secondMount.current.initialState).toEqual(customSavedState);
  });

  it('nearby_state_restores_after_section_switch: alterna entre abas mantendo o snapshot em memória sem requisições de rede', () => {
    const sectionSwitchState: ClientNearbyViewState = {
      mode: 'ALL',
      radiusKm: 50,
      searchQuery: 'Fade',
      regionFilter: 'Zona Sul',
      scrollOffset: 120,
    };

    const { result, rerender } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE),
      { wrapper },
    );

    act(() => {
      result.current.saveState(sectionSwitchState);
    });

    rerender();

    const storedInCache = queryClient.getQueryData<ClientNearbyViewState>(
      buildClientNearbyStateKey('client-alpha'),
    );
    expect(storedInCache).toEqual(sectionSwitchState);
  });

  it('actor_change_clears_nearby_state: novo ator não herda estado do ator anterior', () => {
    // Ator Alpha salva seu estado
    const { result: alphaResult, unmount: unmountAlpha } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE),
      { wrapper },
    );

    act(() => {
      alphaResult.current.saveState({
        mode: 'NEARBY',
        radiusKm: 5,
        searchQuery: 'Alpha Especial',
        regionFilter: 'Bairro Alto',
        scrollOffset: 500,
      });
    });

    unmountAlpha();

    // Troca de sessão para o Ator Beta
    mockSession = {
      status: 'authenticated',
      identity: { id: 'client-beta', name: 'Cliente Beta' },
    };

    const { result: betaResult } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE),
      { wrapper },
    );

    // Ator Beta deve receber o estado limpo padrão
    expect(betaResult.current.initialState).toEqual(DEFAULT_CLIENT_NEARBY_VIEW_STATE);
  });

  it('stale_actor_callback_cannot_publish_state: callback tardio não sobrescreve dados se o ator mudou', () => {
    // Monta o hook com client-alpha
    const { result, rerender } = renderHook(
      ({ actorId }) =>
        useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE, actorId),
      {
        wrapper,
        initialProps: { actorId: 'client-alpha' as string | null },
      },
    );

    const oldCallback = result.current.saveState;

    // Altera o ator ativo para client-beta
    rerender({ actorId: 'client-beta' });

    // O callback antigo (associado a alpha) tenta salvar
    act(() => {
      oldCallback({
        mode: 'NEARBY',
        radiusKm: 25,
        searchQuery: 'Stale Query',
        regionFilter: 'Stale Region',
        scrollOffset: 999,
      });
    });

    // O cache de client-beta NÃO deve ser contaminado pelo callback obsoleto
    const betaCache = queryClient.getQueryData<ClientNearbyViewState>(
      buildClientNearbyStateKey('client-beta'),
    );
    expect(betaCache).toBeUndefined();
  });

  it('não salva estado se a sessão for anônima/deslogada (evita chave compartilhada anon)', () => {
    mockSession = {
      status: 'unauthenticated',
      identity: null as any,
    };

    const { result } = renderHook(
      () => useClientNearbyViewState(DEFAULT_CLIENT_NEARBY_VIEW_STATE, null),
      { wrapper },
    );

    act(() => {
      result.current.saveState({
        mode: 'ALL',
        radiusKm: 10,
        searchQuery: 'Sem sessão',
        regionFilter: '',
        scrollOffset: 100,
      });
    });

    // Nenhuma chave de cache criada
    expect(queryClient.getQueryCache().getAll().length).toBe(0);
  });
});
