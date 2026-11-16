import { useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../auth';
export const DEFAULT_CLIENT_NEARBY_VIEW_STATE = {
    mode: 'ALL',
    radiusKm: 10,
    searchQuery: '',
    regionFilter: '',
    scrollOffset: 0,
};
export const buildClientNearbyStateKey = (actorId) => ['client-ui', 'nearby', actorId];
/**
 * useClientNearbyViewState
 *
 * Preserva o estado de apresentação de "Perto de você" (busca, região, modo, raio e offset de rolagem)
 * isolado estritamente por ator através do QueryClient raiz.
 * Não aciona queries de rede, não armazena tokens/coordenadas/unidades e ignora callbacks obsoletos.
 */
export function useClientNearbyViewState(defaultState = DEFAULT_CLIENT_NEARBY_VIEW_STATE, customActorId) {
    var _a, _b;
    const queryClient = useQueryClient();
    let sessionActorId = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const session = useSession();
        sessionActorId = (_b = (_a = session.identity) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    }
    catch {
        sessionActorId = null;
    }
    const effectiveActorId = customActorId !== undefined ? customActorId : sessionActorId;
    const initialActorIdRef = useRef(effectiveActorId);
    const initialState = useMemo(() => {
        if (!effectiveActorId) {
            return defaultState;
        }
        const cached = queryClient.getQueryData(buildClientNearbyStateKey(effectiveActorId));
        return cached !== null && cached !== void 0 ? cached : defaultState;
        // Somente avaliado na montagem / inicialização do hook com base no ator inicial
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const saveState = useCallback((value) => {
        // Bloqueia salvamento caso não haja ator autenticado
        if (!effectiveActorId) {
            return;
        }
        // Rejeita chamadas obsoletas se o ator ativo divergir do ator sob o qual o componente foi montado
        if (effectiveActorId !== initialActorIdRef.current) {
            return;
        }
        queryClient.setQueryData(buildClientNearbyStateKey(effectiveActorId), value);
    }, [effectiveActorId, queryClient]);
    return {
        initialState,
        saveState,
    };
}
