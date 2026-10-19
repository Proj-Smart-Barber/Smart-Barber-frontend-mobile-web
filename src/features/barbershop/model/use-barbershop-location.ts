import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/model/use-session';
import { serverClock } from '@/features/bookings/lib/server-clock';
import { generateUuidV7 } from '@/features/bookings/lib/attempt-id';
import { createOperationAttemptStore } from '@/shared/operations/operation-attempt-store';
import type { GeoPoint } from '@/features/discovery/api/discovery.contract';
import {
  barbershopLocationApi,
  calculateGeoDistanceMeters,
  MAX_PIN_ADJUSTMENT_METERS,
  buildBarbershopLocationQueryKey,
  isCandidateExpired,
  type BarbershopLocationState,
  type GeocodingCandidate,
} from '../api/barbershop-location.api';

export { buildBarbershopLocationQueryKey, isCandidateExpired };

const attemptStore = createOperationAttemptStore();

export type LocationRestorationStatus =
  | 'idle'
  | 'restoring'
  | 'ready'
  | 'uncertain'
  | 'error';

export interface UseBarbershopLocationViewModel {
  locationState: BarbershopLocationState | null;
  isLoading: boolean;
  isLocationError: boolean;
  locationError: Error | null;
  isSearching: boolean;
  isSaving: boolean;
  isAuthorized: boolean;
  isRestoring: boolean;
  restorationStatus: LocationRestorationStatus;
  restorationError: Error | null;
  retryRestoration: () => Promise<void>;
  addressQuery: string;
  setAddressQuery: (value: string) => void;
  candidates: GeocodingCandidate[];
  selectedCandidate: GeocodingCandidate | null;
  adjustedPoint: GeoPoint | null;
  pinOffsetMeters: number;
  isPinOutOfBounds: boolean;
  errorMessage: string | null;
  conflictDetected: boolean;
  uncertainMutationId: string | null;
  quotaRetrySeconds: number | null;
  serviceUnavailable: boolean;
  searchCandidates: () => Promise<void>;
  selectCandidate: (candidate: GeocodingCandidate) => void;
  adjustPin: (point: GeoPoint) => void;
  confirmLocation: () => Promise<BarbershopLocationState | null>;
  reconcileAfterUncertainty: () => Promise<void>;
  reloadAuthoritativeState: () => Promise<void>;
}

export function useBarbershopLocation(
  explicitShopId?: string | null,
): UseBarbershopLocationViewModel {
  const { identity, selectedShopId, barbershop, token, status, memberships } =
    useSession();
  const queryClient = useQueryClient();

  const actorId = identity?.id ?? null;
  const shopId = explicitShopId ?? selectedShopId ?? barbershop?.id ?? null;
  const activeMembership = memberships?.find((m) => m.id === shopId);
  const isAuthorized =
    Boolean(shopId) &&
    activeMembership?.role === 'OWNER' &&
    activeMembership?.state === 'ACTIVE';

  const isAuthenticated =
    status === 'authenticated' &&
    Boolean(actorId) &&
    Boolean(shopId) &&
    Boolean(token);

  const [addressQuery, setAddressQuery] = useState<string>('');
  const [candidates, setCandidates] = useState<GeocodingCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<GeocodingCandidate | null>(null);
  const [adjustedPoint, setAdjustedPoint] = useState<GeoPoint | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [uncertainMutationId, setUncertainMutationId] = useState<string | null>(
    null,
  );
  const [quotaRetrySeconds, setQuotaRetrySeconds] = useState<number | null>(
    null,
  );
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const restorationGenerationRef = useRef(0);
  const [restorationStatus, setRestorationStatus] =
    useState<LocationRestorationStatus>(
      actorId && shopId && status === 'authenticated' ? 'restoring' : 'idle',
    );
  const [isRestoring, setIsRestoring] = useState<boolean>(
    Boolean(actorId && shopId && status === 'authenticated'),
  );
  const [restorationError, setRestorationError] = useState<Error | null>(null);

  const syncLockRef = useRef(false);
  const activeContextRef = useRef({ actorId, shopId, status });
  activeContextRef.current = { actorId, shopId, status };

  const isCurrentContext = useCallback(
    (expectedActorId: string | null, expectedShopId: string | null) => {
      return (
        activeContextRef.current.status === 'authenticated' &&
        activeContextRef.current.actorId === expectedActorId &&
        activeContextRef.current.shopId === expectedShopId
      );
    },
    [],
  );

  const {
    data: locationState,
    isLoading,
    isError: isLocationError,
    error: rawLocationError,
    refetch,
  } = useQuery({
    queryKey: buildBarbershopLocationQueryKey(shopId, actorId),
    queryFn: async () => {
      if (!shopId) throw new Error('Barbearia não selecionada.');
      return barbershopLocationApi.getLocation(shopId, token);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const locationError = (rawLocationError as Error) ?? null;

  // Sincroniza campo de busca inicial quando a localização da unidade carrega
  useEffect(() => {
    if (locationState?.address && !addressQuery.trim()) {
      setAddressQuery(locationState.address);
    }
  }, [locationState?.address, addressQuery]);

  // Limpa estados voláteis ao trocar de unidade ou ator e restaura referências incertas
  useEffect(() => {
    setCandidates([]);
    setSelectedCandidate(null);
    setAdjustedPoint(null);
    setErrorMessage(null);
    setConflictDetected(false);
    setUncertainMutationId(null);
    setQuotaRetrySeconds(null);
    setServiceUnavailable(false);
    setRestorationError(null);

    if (actorId && shopId && status === 'authenticated') {
      const currentGen = ++restorationGenerationRef.current;
      setIsRestoring(true);
      setRestorationStatus('restoring');
      let cancelled = false;

      attemptStore
        .listReferences(actorId)
        .then((refs) => {
          if (
            cancelled ||
            currentGen !== restorationGenerationRef.current ||
            !isCurrentContext(actorId, shopId)
          ) {
            return;
          }
          const matching = refs.find(
            (ref) =>
              ref.resourceKind === 'LOCATION' &&
              ref.resourceId === shopId &&
              (ref.status === 'uncertain' || ref.status === 'submitting'),
          );
          if (matching) {
            setUncertainMutationId(matching.requestId);
            setRestorationStatus('uncertain');
            setErrorMessage(
              'Existe uma confirmação de localização anterior em estado incerto. Reconcilie o estado antes de realizar nova alteração.',
            );
          } else {
            setUncertainMutationId(null);
            setRestorationStatus('ready');
          }
        })
        .catch((cause) => {
          if (
            cancelled ||
            currentGen !== restorationGenerationRef.current ||
            !isCurrentContext(actorId, shopId)
          ) {
            return;
          }
          const err =
            cause instanceof Error
              ? cause
              : new Error('Falha ao ler o armazenamento local');
          setRestorationStatus('error');
          setRestorationError(err);
          setErrorMessage(
            'Falha ao verificar histórico de tentativas locais. Clique em tentar novamente.',
          );
        })
        .finally(() => {
          if (
            !cancelled &&
            currentGen === restorationGenerationRef.current &&
            isCurrentContext(actorId, shopId)
          ) {
            setIsRestoring(false);
          }
        });

      return () => {
        cancelled = true;
      };
    } else {
      setIsRestoring(false);
      setRestorationStatus('idle');
    }
  }, [shopId, actorId, status, isCurrentContext]);

  const retryRestoration = useCallback(async () => {
    if (!actorId || !shopId || status !== 'authenticated') return;
    const currentGen = ++restorationGenerationRef.current;
    setIsRestoring(true);
    setRestorationStatus('restoring');
    setRestorationError(null);
    setErrorMessage(null);

    try {
      const refs = await attemptStore.listReferences(actorId);
      if (
        currentGen !== restorationGenerationRef.current ||
        !isCurrentContext(actorId, shopId)
      ) {
        return;
      }
      const matching = refs.find(
        (ref) =>
          ref.resourceKind === 'LOCATION' &&
          ref.resourceId === shopId &&
          (ref.status === 'uncertain' || ref.status === 'submitting'),
      );
      if (matching) {
        setUncertainMutationId(matching.requestId);
        setRestorationStatus('uncertain');
        setErrorMessage(
          'Existe uma confirmação de localização anterior em estado incerto. Reconcilie o estado antes de realizar nova alteração.',
        );
      } else {
        setUncertainMutationId(null);
        setRestorationStatus('ready');
      }
    } catch (cause) {
      if (
        currentGen !== restorationGenerationRef.current ||
        !isCurrentContext(actorId, shopId)
      ) {
        return;
      }
      const err =
        cause instanceof Error
          ? cause
          : new Error('Falha ao ler o armazenamento local');
      setRestorationStatus('error');
      setRestorationError(err);
      setErrorMessage(
        'Falha ao verificar histórico de tentativas locais. Clique em tentar novamente.',
      );
    } finally {
      if (
        currentGen === restorationGenerationRef.current &&
        isCurrentContext(actorId, shopId)
      ) {
        setIsRestoring(false);
      }
    }
  }, [actorId, shopId, status, isCurrentContext]);

  const pinOffsetMeters =
    selectedCandidate && adjustedPoint
      ? Math.round(
          calculateGeoDistanceMeters(selectedCandidate.point, adjustedPoint),
        )
      : 0;

  const isPinOutOfBounds = pinOffsetMeters > MAX_PIN_ADJUSTMENT_METERS;

  const selectCandidate = useCallback(
    (candidate: GeocodingCandidate) => {
      if (isRestoring || restorationStatus === 'restoring') {
        setErrorMessage(
          'Aguardando verificação de tentativas locais anteriores.',
        );
        return;
      }
      if (restorationStatus === 'error') {
        setErrorMessage(
          'Falha ao verificar histórico de tentativas locais. Clique em tentar novamente antes de alterar o candidato.',
        );
        return;
      }
      if (uncertainMutationId || restorationStatus === 'uncertain') {
        setErrorMessage(
          'Existe uma confirmação anterior em estado incerto. Reconcilie a tentativa antes de alterar o candidato.',
        );
        return;
      }
      if (isCandidateExpired(candidate)) {
        setErrorMessage(
          'Este candidato de endereço expirou. Realize uma nova busca para obter coordenadas atualizadas.',
        );
        return;
      }
      setSelectedCandidate(candidate);
      setAdjustedPoint({
        latitude: candidate.point.latitude,
        longitude: candidate.point.longitude,
      });
      setAddressQuery(candidate.displayAddress);
      setErrorMessage(null);
    },
    [uncertainMutationId, isRestoring, restorationStatus],
  );

  const adjustPin = useCallback(
    (point: GeoPoint) => {
      if (isRestoring || restorationStatus === 'restoring') {
        setErrorMessage(
          'Aguardando verificação de tentativas locais anteriores.',
        );
        return;
      }
      if (restorationStatus === 'error') {
        setErrorMessage(
          'Falha ao verificar histórico de tentativas locais. Clique em tentar novamente antes de mover o pino.',
        );
        return;
      }
      if (uncertainMutationId || restorationStatus === 'uncertain') {
        setErrorMessage(
          'Existe uma confirmação anterior em estado incerto. Reconcilie a tentativa antes de mover o pino.',
        );
        return;
      }
      if (!selectedCandidate) return;
      const dist = calculateGeoDistanceMeters(selectedCandidate.point, point);
      setAdjustedPoint(point);
      if (dist > MAX_PIN_ADJUSTMENT_METERS) {
        setErrorMessage(
          `O ajuste fino do pino (${Math.round(dist)}m) excede o limite de ${MAX_PIN_ADJUSTMENT_METERS}m do endereço geocodificado. Faça uma nova busca caso o endereço esteja incorreto.`,
        );
      } else {
        setErrorMessage(null);
      }
    },
    [selectedCandidate, uncertainMutationId, isRestoring, restorationStatus],
  );

  const searchCandidates = useCallback(async () => {
    if (!actorId || !shopId || isSearching || isSaving) return;
    if (!isAuthorized) {
      setErrorMessage(
        'Apenas proprietários (OWNER) ativos da unidade têm permissão para buscar endereços comerciais.',
      );
      return;
    }
    const clean = addressQuery.trim();
    if (clean.length < 3) {
      setErrorMessage('Digite pelo menos 3 caracteres para buscar o endereço.');
      return;
    }

    const startActor = actorId;
    const startShop = shopId;
    setIsSearching(true);
    setErrorMessage(null);
    setQuotaRetrySeconds(null);
    setServiceUnavailable(false);

    try {
      const response = await barbershopLocationApi.searchAddress({
        address: clean,
        shopId,
        token,
      });

      if (!isCurrentContext(startActor, startShop)) return;

      setCandidates(response.candidates);
      if (response.candidates.length === 0) {
        setSelectedCandidate(null);
        setAdjustedPoint(null);
        setErrorMessage(
          'Nenhum candidato encontrado para este endereço. Verifique a grafia ou informe rua, número e cidade.',
        );
      } else {
        const first = response.candidates[0];
        setSelectedCandidate(first);
        setAdjustedPoint({
          latitude: first.point.latitude,
          longitude: first.point.longitude,
        });
      }
    } catch (err: unknown) {
      if (!isCurrentContext(startActor, startShop)) return;

      const quota = barbershopLocationApi.isQuotaExceededError(err);
      if (quota.isQuota) {
        setQuotaRetrySeconds(quota.retryAfterSeconds ?? 60);
        setErrorMessage(
          `Limite de buscas de endereço atingido. Aguarde ${quota.retryAfterSeconds ?? 60} segundos antes de tentar novamente.`,
        );
        return;
      }

      if (barbershopLocationApi.isServiceUnavailableError(err)) {
        setServiceUnavailable(true);
        setErrorMessage(
          'O serviço de geocodificação está temporariamente indisponível (503). Tente novamente em instantes.',
        );
        return;
      }

      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível buscar o endereço informado.',
      );
    } finally {
      if (isCurrentContext(startActor, startShop)) {
        setIsSearching(false);
      }
    }
  }, [
    actorId,
    shopId,
    isSearching,
    isSaving,
    isAuthorized,
    addressQuery,
    token,
    isCurrentContext,
  ]);

  const confirmLocation = useCallback(async (): Promise<BarbershopLocationState | null> => {
    if (syncLockRef.current || isSaving) {
      return null;
    }
    syncLockRef.current = true;
    setIsSaving(true);

    try {
      const currentMembership = memberships?.find((m) => m.id === shopId);
      if (
        !isAuthorized ||
        currentMembership?.role !== 'OWNER' ||
        currentMembership?.state !== 'ACTIVE'
      ) {
        setErrorMessage(
          'Apenas proprietários (OWNER) ativos da unidade têm permissão para confirmar a localização comercial.',
        );
        return null;
      }

      if (isRestoring || restorationStatus === 'restoring') {
        setErrorMessage(
          'Aguardando verificação de tentativas anteriores. Tente novamente em instantes.',
        );
        return null;
      }

      if (restorationStatus === 'error') {
        setErrorMessage(
          'Não foi possível verificar tentativas anteriores no armazenamento local. Tente novamente.',
        );
        return null;
      }

      if (uncertainMutationId || restorationStatus === 'uncertain') {
        setErrorMessage(
          'Existe uma tentativa anterior pendente de reconciliação. Consulte o resultado antes de confirmar novamente.',
        );
        return null;
      }

      if (!actorId || !shopId || !selectedCandidate || !adjustedPoint) {
        return null;
      }

      if (!locationState || isLocationError) {
        setErrorMessage(
          'Não é possível confirmar a localização sem carregar o estado autoritativo atual da barbearia. Atualize a tela antes de confirmar.',
        );
        return null;
      }

      if (isCandidateExpired(selectedCandidate)) {
        setErrorMessage(
          'O candidato selecionado expirou (validade de 15 minutos). Realize uma nova busca antes de confirmar.',
        );
        return null;
      }

      if (isPinOutOfBounds) {
        setErrorMessage(
          `O pino ajustado excede a tolerância máxima de ${MAX_PIN_ADJUSTMENT_METERS}m em relação ao candidato Google.`,
        );
        return null;
      }

      let now: number;
      try {
        now = serverClock.getRequiredNow();
      } catch {
        setErrorMessage(
          'Não foi possível validar o horário sincronizado com o servidor. Aguarde a sincronização do relógio e tente novamente.',
        );
        return null;
      }

      const startActor = actorId;
      const startShop = shopId;
      const expectedVersion = locationState.version;
      const mutationId = generateUuidV7(now);
      const cleanAddress = (
        addressQuery.trim() || selectedCandidate.displayAddress
      ).trim();

      setErrorMessage(null);
      setConflictDetected(false);

      try {
        await attemptStore.save(startActor, {
          requestId: mutationId,
          actorId: startActor,
          operation: 'UPDATE_LOCATION',
          resourceKind: 'LOCATION',
          resourceId: startShop,
          status: 'submitting',
          createdAt: now,
          originScope: 'UNIT',
        });
      } catch {
        setErrorMessage(
          'Falha ao salvar a tentativa localmente. O envio foi cancelado por segurança.',
        );
        return null;
      }

      if (!isCurrentContext(startActor, startShop)) {
        return null;
      }

      try {
        const updated = await barbershopLocationApi.updateLocation({
          shopId: startShop,
          address: cleanAddress,
          candidateId: selectedCandidate.candidateId,
          latitude: adjustedPoint.latitude,
          longitude: adjustedPoint.longitude,
          expectedVersion,
          mutationId,
          token,
        });

        await attemptStore
          .save(startActor, {
            requestId: mutationId,
            actorId: startActor,
            operation: 'UPDATE_LOCATION',
            resourceKind: 'LOCATION',
            resourceId: startShop,
            status: 'confirmed',
            createdAt: now,
            originScope: 'UNIT',
          })
          .catch(() => undefined);
        await attemptStore.clearResolved(startActor).catch(() => undefined);

        if (!isCurrentContext(startActor, startShop)) {
          return null;
        }

        setUncertainMutationId(null);
        setCandidates([]);
        setSelectedCandidate(null);
        queryClient.setQueryData(
          buildBarbershopLocationQueryKey(startShop, startActor),
          updated,
        );
        void queryClient.invalidateQueries({ queryKey: ['discovery'] });
        return updated;
      } catch (err: unknown) {
        if (!isCurrentContext(startActor, startShop)) {
          return null;
        }

        if (barbershopLocationApi.isVersionConflictError(err)) {
          await attemptStore
            .save(startActor, {
              requestId: mutationId,
              actorId: startActor,
              operation: 'UPDATE_LOCATION',
              resourceKind: 'LOCATION',
              resourceId: startShop,
              status: 'error',
              createdAt: now,
              originScope: 'UNIT',
              errorMessage: 'LOCATION_VERSION_CONFLICT',
            })
            .catch(() => undefined);
          await attemptStore.clearResolved(startActor).catch(() => undefined);
          setUncertainMutationId(null);
          setConflictDetected(true);
          setErrorMessage(
            'A localização comercial foi alterada em outra sessão (conflito de versão 409). Recarregue o estado atual antes de confirmar novamente.',
          );
          return null;
        }

        if (barbershopLocationApi.isUncertainError(err)) {
          await attemptStore
            .save(startActor, {
              requestId: mutationId,
              actorId: startActor,
              operation: 'UPDATE_LOCATION',
              resourceKind: 'LOCATION',
              resourceId: startShop,
              status: 'uncertain',
              createdAt: now,
              originScope: 'UNIT',
            })
            .catch(() => undefined);
          setUncertainMutationId(mutationId);
          setRestorationStatus('uncertain');
          setErrorMessage(
            'A confirmação demorou além do esperado ou a resposta não pôde ser interpretada. Verifique o estado da unidade para reconciliar sem duplicar.',
          );
          return null;
        }

        await attemptStore
          .save(startActor, {
            requestId: mutationId,
            actorId: startActor,
            operation: 'UPDATE_LOCATION',
            resourceKind: 'LOCATION',
            resourceId: startShop,
            status: 'error',
            createdAt: now,
            originScope: 'UNIT',
          })
          .catch(() => undefined);
        await attemptStore.clearResolved(startActor).catch(() => undefined);
        setUncertainMutationId(null);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Não foi possível confirmar a localização comercial.',
        );
        return null;
      }
    } finally {
      syncLockRef.current = false;
      setIsSaving(false);
    }
  }, [
    actorId,
    shopId,
    isSaving,
    isAuthorized,
    isRestoring,
    restorationStatus,
    memberships,
    selectedCandidate,
    adjustedPoint,
    isPinOutOfBounds,
    locationState,
    isLocationError,
    uncertainMutationId,
    addressQuery,
    isCurrentContext,
    token,
    queryClient,
  ]);

  const reconcileAfterUncertainty = useCallback(async () => {
    if (syncLockRef.current || isSaving) return;
    syncLockRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (!actorId || !shopId) return;
      const startActor = actorId;
      const startShop = shopId;

      const authoritative = await barbershopLocationApi.getLocation(
        startShop,
        token,
      );
      if (!isCurrentContext(startActor, startShop)) return;

      queryClient.setQueryData(
        buildBarbershopLocationQueryKey(startShop, startActor),
        authoritative,
      );

      if (
        uncertainMutationId &&
        authoritative.lastOwnerMutation?.id === uncertainMutationId
      ) {
        let now = Date.now();
        try {
          now = serverClock.getRequiredNow();
        } catch {
          now = serverClock.now() ?? Date.now();
        }
        await attemptStore
          .save(startActor, {
            requestId: uncertainMutationId,
            actorId: startActor,
            operation: 'UPDATE_LOCATION',
            resourceKind: 'LOCATION',
            resourceId: startShop,
            status: 'confirmed',
            createdAt: now,
            originScope: 'UNIT',
          })
          .catch(() => undefined);
        await attemptStore.clearResolved(startActor).catch(() => undefined);
        setUncertainMutationId(null);
        setRestorationStatus('ready');
        setCandidates([]);
        setSelectedCandidate(null);
        void queryClient.invalidateQueries({ queryKey: ['discovery'] });
      } else {
        // A ausência de lastOwnerMutation não prova que a tentativa foi descartada
        // O resultado permanece UNKNOWN sem apagar a incerteza
        setRestorationStatus('uncertain');
        setErrorMessage(
          'O servidor ainda não confirmou nem rejeitou a tentativa anterior. A operação permanece em estado incerto (UNKNOWN).',
        );
      }
    } catch (err: unknown) {
      if (!isCurrentContext(actorId, shopId)) return;
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Falha ao reconciliar o estado da localização comercial.',
      );
    } finally {
      syncLockRef.current = false;
      setIsSaving(false);
    }
  }, [
    actorId,
    shopId,
    token,
    isCurrentContext,
    queryClient,
    uncertainMutationId,
    isSaving,
  ]);

  const reloadAuthoritativeState = useCallback(async () => {
    setConflictDetected(false);
    setErrorMessage(null);
    await refetch();
  }, [refetch]);

  return {
    locationState: locationState ?? null,
    isLoading,
    isLocationError,
    locationError,
    isSearching,
    isSaving,
    isAuthorized,
    isRestoring,
    restorationStatus,
    restorationError,
    retryRestoration,
    addressQuery,
    setAddressQuery,
    candidates,
    selectedCandidate,
    adjustedPoint,
    pinOffsetMeters,
    isPinOutOfBounds,
    errorMessage,
    conflictDetected,
    uncertainMutationId,
    quotaRetrySeconds,
    serviceUnavailable,
    searchCandidates,
    selectCandidate,
    adjustPin,
    confirmLocation,
    reconcileAfterUncertainty,
    reloadAuthoritativeState,
  };
}
