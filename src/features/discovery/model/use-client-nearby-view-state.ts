import { useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import type { DiscoveryMode, DiscoveryRadius } from './discovery.types';

export interface ClientNearbyViewState {
  mode: DiscoveryMode;
  radiusKm: DiscoveryRadius;
  searchQuery: string;
  regionFilter: string;
  scrollOffset: number;
}

export const DEFAULT_CLIENT_NEARBY_VIEW_STATE: ClientNearbyViewState = {
  mode: 'ALL',
  radiusKm: 10,
  searchQuery: '',
  regionFilter: '',
  scrollOffset: 0,
};

export const buildClientNearbyStateKey = (
  actorId: string,
): readonly ['client-ui', 'nearby', string] => ['client-ui', 'nearby', actorId];

/**
 * useClientNearbyViewState
 *
 * Preserva o estado de apresentação de "Perto de você" (busca, região, modo, raio e offset de rolagem)
 * isolado estritamente por ator através do QueryClient raiz.
 * Não aciona queries de rede, não armazena tokens/coordenadas/unidades e ignora callbacks obsoletos.
 */
export function useClientNearbyViewState(
  defaultState: ClientNearbyViewState = DEFAULT_CLIENT_NEARBY_VIEW_STATE,
  customActorId?: string | null,
): {
  initialState: ClientNearbyViewState;
  saveState: (value: ClientNearbyViewState) => void;
} {
  const queryClient = useQueryClient();
  let sessionActorId: string | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const session = useSession();
    sessionActorId = session.identity?.id ?? null;
  } catch {
    sessionActorId = null;
  }

  const effectiveActorId =
    customActorId !== undefined ? customActorId : sessionActorId;

  const initialActorIdRef = useRef<string | null>(effectiveActorId);

  const initialState = useMemo<ClientNearbyViewState>(() => {
    if (!effectiveActorId) {
      return defaultState;
    }
    const cached = queryClient.getQueryData<ClientNearbyViewState>(
      buildClientNearbyStateKey(effectiveActorId),
    );
    return cached ?? defaultState;
    // Somente avaliado na montagem / inicialização do hook com base no ator inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveState = useCallback(
    (value: ClientNearbyViewState) => {
      // Bloqueia salvamento caso não haja ator autenticado
      if (!effectiveActorId) {
        return;
      }
      // Rejeita chamadas obsoletas se o ator ativo divergir do ator sob o qual o componente foi montado
      if (effectiveActorId !== initialActorIdRef.current) {
        return;
      }

      queryClient.setQueryData(
        buildClientNearbyStateKey(effectiveActorId),
        value,
      );
    },
    [effectiveActorId, queryClient],
  );

  return {
    initialState,
    saveState,
  };
}
