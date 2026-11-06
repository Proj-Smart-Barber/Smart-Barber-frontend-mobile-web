import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import {
  type LocationPermissionPort,
  type ForegroundPermissionSnapshot,
  createLocationPermissionPort,
} from './location-permission';
import {
  locationStore,
  type LocationSession,
} from './location-provider';

export const LOCATION_INTRO_STORAGE_KEY = '@smart_barber:location_intro:v1';

export type LocationOnboardingStage =
  | 'checking'
  | 'intro'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'unavailable';

export interface UseClientLocationOnboardingOptions {
  actorId?: string | null;
  enabled?: boolean;
  permissionPort?: LocationPermissionPort;
}

export interface UseClientLocationOnboardingResult {
  stage: LocationOnboardingStage;
  requestPhase: 'permission' | 'position' | null;
  canAskAgain: boolean;
  isPositionSlow: boolean;
  isSettingsGuideVisible: boolean;
  continueRequest: () => Promise<void>;
  retryPosition: () => Promise<void>;
  recoverPermission: () => Promise<void>;
  dismissIntro: () => Promise<void>;
  closeSettingsGuide: () => void;
  locationSession: LocationSession;
}

let memoryIntroCache: string | null = null;

export function resetLocationIntroStorageForTests(): void {
  memoryIntroCache = null;
}

export async function getLocationIntroSeen(): Promise<boolean> {
  if (memoryIntroCache !== null) {
    return memoryIntroCache === '1';
  }
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return memoryIntroCache === '1';
  }
  if (Platform.OS === 'web') {
    try {
      const val =
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(LOCATION_INTRO_STORAGE_KEY)
          : null;
      if (val !== null) {
        memoryIntroCache = val;
      }
      return val === '1';
    } catch {
      return memoryIntroCache === '1';
    }
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const val = await AsyncStorage.getItem(LOCATION_INTRO_STORAGE_KEY);
    if (val !== null) {
      memoryIntroCache = val;
    }
    return val === '1';
  } catch {
    return memoryIntroCache === '1';
  }
}

export async function setLocationIntroSeen(seen: boolean): Promise<void> {
  const val = seen ? '1' : null;
  memoryIntroCache = val;
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return;
  }
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (seen) {
          window.localStorage.setItem(LOCATION_INTRO_STORAGE_KEY, '1');
        } else {
          window.localStorage.removeItem(LOCATION_INTRO_STORAGE_KEY);
        }
      }
    } catch {}
    return;
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (seen) {
      await AsyncStorage.setItem(LOCATION_INTRO_STORAGE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(LOCATION_INTRO_STORAGE_KEY);
    }
  } catch {}
}

export function useClientLocationOnboarding({
  actorId = null,
  enabled = true,
  permissionPort,
}: UseClientLocationOnboardingOptions = {}): UseClientLocationOnboardingResult {
  const [stage, setStage] = useState<LocationOnboardingStage>('checking');
  const [requestPhase, setRequestPhase] = useState<'permission' | 'position' | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isPositionSlow, setIsPositionSlow] = useState(false);
  const [isSettingsGuideVisible, setIsSettingsGuideVisible] = useState(false);
  const [locationSession, setLocationSession] = useState<LocationSession>(() =>
    locationStore.getSession(),
  );

  const activePort = permissionPort ?? locationStore.getPermissionPort();
  const portRef = useRef<LocationPermissionPort>(activePort);
  portRef.current = activePort;

  const generationRef = useRef(0);
  const currentActorIdRef = useRef<string | null>(actorId);
  currentActorIdRef.current = actorId;

  const isRequestingRef = useRef(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Assinatura ao locationStore para refletir alterações de coordenadas e sessão
  useEffect(() => {
    const unsubscribe = locationStore.subscribe((session) => {
      setLocationSession(session);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Timer de lentidão de 8s restrito exclusivamente à fase de hardware GPS ('position')
  useEffect(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }

    if (requestPhase === 'position') {
      slowTimerRef.current = setTimeout(() => {
        setIsPositionSlow(true);
      }, 8000);
    } else {
      setIsPositionSlow(false);
    }

    return () => {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    };
  }, [requestPhase]);

  // Consulta do estado de permissão na entrada elegível
  const evaluateInitialState = useCallback(async () => {
    const gen = ++generationRef.current;
    const actor = currentActorIdRef.current;

    try {
      const snapshot: ForegroundPermissionSnapshot = await portRef.current.get();
      if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
        return;
      }

      setCanAskAgain(snapshot.canAskAgain);

      if (snapshot.status === 'granted') {
        const currentSession = locationStore.getSession();
        if (currentSession.state === 'granted' && currentSession.coords) {
          setStage('ready');
        } else {
          // Permissão concedida no sistema: tenta obter posição em background
          setStage('ready');
        }
        return;
      }

      if (snapshot.status === 'denied' || snapshot.status === 'unsupported') {
        setStage('denied');
        return;
      }

      // Permissão 'undetermined'
      const seen = await getLocationIntroSeen();
      if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
        return;
      }

      if (!seen && enabled) {
        setStage('intro');
      } else {
        setStage('unavailable');
      }
    } catch {
      if (generationRef.current === gen && currentActorIdRef.current === actor) {
        setStage('unavailable');
      }
    }
  }, [enabled]);

  // Efeito de inicialização / mudança de enabled ou ator
  useEffect(() => {
    if (currentActorIdRef.current !== actorId) {
      currentActorIdRef.current = actorId;
      generationRef.current++;
      isRequestingRef.current = false;
      setRequestPhase(null);
    }

    if (enabled) {
      void evaluateInitialState();
    } else {
      // Quando desabilitado (ex.: Início, reserva ativa, drawer aberto), não abre intro
      setStage((prev) => (prev === 'intro' ? 'unavailable' : prev));
    }
  }, [enabled, actorId, evaluateInitialState]);

  // Retomada do background / configurações: consulta o estado sem pedir nova permissão automaticamente
  useEffect(() => {
    const handleActive = () => {
      if (isRequestingRef.current) {
        // Ignora transição se a solicitação estiver em andamento (diálogo do SO ativo)
        return;
      }

      const gen = ++generationRef.current;
      const actor = currentActorIdRef.current;

      void portRef.current.get().then((snapshot) => {
        if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
          return;
        }

        setCanAskAgain(snapshot.canAskAgain);

        if (snapshot.status === 'granted') {
          // Se o usuário concedeu permissão nas configurações do sistema, adquire a posição
          setStage('ready');
          void locationStore.requestCurrentPosition();
        } else if (snapshot.status === 'denied') {
          setStage('denied');
        }
      });
    };

    let sub: any = null;
    if (Platform.OS !== 'web') {
      sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          handleActive();
        }
      });
    } else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      const onVisibility = () => {
        if (document.visibilityState === 'visible') {
          handleActive();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, []);

  // Solicitação disparada pelo botão "Continuar" do modal de introdução
  const continueRequest = useCallback(async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    const gen = ++generationRef.current;
    const actor = currentActorIdRef.current;

    // Registra imediatamente a apresentação da introdução no storage/memória
    setStage('requesting');
    setRequestPhase('permission');
    void setLocationIntroSeen(true);

    try {
      const snapshot = await portRef.current.request();

      if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
        return;
      }

      setCanAskAgain(snapshot.canAskAgain);

      if (snapshot.status === 'granted') {
        setRequestPhase('position');
        try {
          const session = await locationStore.requestCurrentPosition();
          if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
            return;
          }

          if (session.state === 'granted') {
            setStage('ready');
          } else {
            setStage('unavailable');
          }
        } catch {
          if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
            return;
          }
          setStage('unavailable');
        }
      } else if (snapshot.status === 'denied' || snapshot.status === 'unsupported') {
        setStage('denied');
      } else {
        setStage('unavailable');
      }
    } catch {
      if (generationRef.current === gen && currentActorIdRef.current === actor) {
        setStage('unavailable');
      }
    } finally {
      if (generationRef.current === gen) {
        isRequestingRef.current = false;
        setRequestPhase(null);
      }
    }
  }, []);

  // Fechamento manual da explicação sem registrar como recusa do SO
  const dismissIntro = useCallback(async () => {
    await setLocationIntroSeen(true);
    setStage('unavailable');
  }, []);

  // Tentar obter a posição novamente (quando permissão concedida mas sinal de GPS falhou/expirou)
  const retryPosition = useCallback(async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    const gen = ++generationRef.current;
    const actor = currentActorIdRef.current;

    setStage('requesting');
    setRequestPhase('position');

    try {
      const session = await locationStore.requestCurrentPosition();
      if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
        return;
      }

      if (session.state === 'granted') {
        setStage('ready');
      } else {
        setStage('unavailable');
      }
    } catch {
      if (generationRef.current === gen && currentActorIdRef.current === actor) {
        setStage('unavailable');
      }
    } finally {
      if (generationRef.current === gen) {
        isRequestingRef.current = false;
        setRequestPhase(null);
      }
    }
  }, []);

  // Recuperação de permissão a partir de recusa ou configurações
  const recoverPermission = useCallback(async () => {
    if (isRequestingRef.current) return;
    const gen = ++generationRef.current;
    const actor = currentActorIdRef.current;

    const currentSnapshot = await portRef.current.get();
    if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
      return;
    }

    if (currentSnapshot.status === 'granted') {
      await retryPosition();
      return;
    }

    if (currentSnapshot.canAskAgain) {
      isRequestingRef.current = true;
      setStage('requesting');
      setRequestPhase('permission');

      try {
        const snapshot = await portRef.current.request();
        if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
          return;
        }

        setCanAskAgain(snapshot.canAskAgain);

        if (snapshot.status === 'granted') {
          setRequestPhase('position');
          const session = await locationStore.requestCurrentPosition();
          if (generationRef.current !== gen || currentActorIdRef.current !== actor) {
            return;
          }
          setStage(session.state === 'granted' ? 'ready' : 'unavailable');
        } else {
          setStage(snapshot.status === 'denied' ? 'denied' : 'unavailable');
        }
      } catch {
        if (generationRef.current === gen && currentActorIdRef.current === actor) {
          setStage('unavailable');
        }
      } finally {
        if (generationRef.current === gen) {
          isRequestingRef.current = false;
          setRequestPhase(null);
        }
      }
    } else {
      // Bloqueada pelo sistema operacional: direciona para configurações ou guia manual
      const result = await portRef.current.openSettings();
      if (result === 'manual') {
        setIsSettingsGuideVisible(true);
      }
    }
  }, [retryPosition]);

  const closeSettingsGuide = useCallback(() => {
    setIsSettingsGuideVisible(false);
  }, []);

  return {
    stage,
    requestPhase,
    canAskAgain,
    isPositionSlow,
    isSettingsGuideVisible,
    continueRequest,
    retryPosition,
    recoverPermission,
    dismissIntro,
    closeSettingsGuide,
    locationSession,
  };
}
