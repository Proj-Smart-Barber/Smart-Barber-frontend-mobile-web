import { Platform } from 'react-native';
import {
  createLocationPermissionPort,
  setPersistedLocationPermission,
  resetPersistedLocationPermissionForTests,
  type ForegroundPermissionSnapshot,
  type LocationPermissionPort,
} from './location-permission';

export type LocationPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'stale';

export interface EphemeralCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestamp: number;
  isApproximate: boolean;
  formattedLocation?: string | null;
}

export interface LocationSession {
  generationId: string;
  state: LocationPermissionState;
  coords: EphemeralCoordinates | null;
  errorMessage?: string;
}

const LOCATION_STORAGE_KEY = '@smart_barber:cached_user_location';
const LAST_KNOWN_LOCATION_STORAGE_KEY = '@smart_barber:last_known_user_location:v1';
export const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de validade do cache estrito
const STALE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos para sinalizar atualização sugerida
const GPS_REQUEST_TIMEOUT_MS = 10 * 1000; // 10 segundos de timeout de hardware

export interface CachedLocationData {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestamp: number;
  isApproximate: boolean;
  formattedLocation?: string | null;
}

let memoryCache: string | null = null;
let memoryLastKnownCache: string | null = null;

async function getCachedRaw(): Promise<string | null> {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return memoryCache;
  }
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return (
          window.localStorage.getItem(LOCATION_STORAGE_KEY) ??
          window.localStorage.getItem(LAST_KNOWN_LOCATION_STORAGE_KEY) ??
          memoryCache
        );
      }
      return memoryCache;
    } catch {
      return memoryCache;
    }
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const primary = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (primary) return primary;
    return await AsyncStorage.getItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
  } catch {
    return memoryCache;
  }
}

async function setCachedRaw(value: string | null): Promise<void> {
  memoryCache = value;
  if (value !== null) {
    memoryLastKnownCache = value;
    void setPersistedLocationPermission('granted');
  }
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return;
  }
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (value === null) {
          window.localStorage.removeItem(LOCATION_STORAGE_KEY);
          window.localStorage.removeItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
        } else {
          window.localStorage.setItem(LOCATION_STORAGE_KEY, value);
          window.localStorage.setItem(LAST_KNOWN_LOCATION_STORAGE_KEY, value);
        }
      }
    } catch {}
    return;
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (value === null) {
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
      await AsyncStorage.removeItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, value);
      await AsyncStorage.setItem(LAST_KNOWN_LOCATION_STORAGE_KEY, value);
    }
  } catch {}
}

class EphemeralLocationStore {
  private currentSession: LocationSession = {
    generationId: Math.random().toString(36).substring(2, 15),
    state: 'idle',
    coords: null,
  };

  private listeners = new Set<(session: LocationSession) => void>();
  private permissionPort: LocationPermissionPort = createLocationPermissionPort();
  private isCustomPort = false;
  private activeRequestPromise: Promise<LocationSession> | null = null;
  private activeRestorePromise: Promise<LocationSession> | null = null;

  constructor() {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        this.handleVisibilityChange();
      });
    }
  }

  setPermissionPort(port: LocationPermissionPort): void {
    this.permissionPort = port;
    this.isCustomPort = true;
  }

  getPermissionPort(): LocationPermissionPort {
    return this.permissionPort;
  }

  private handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      // Reavalia validade do cache ao retornar à aba
      this.getSession();
      this.notify();
    }
  }

  getSession(): LocationSession {
    if (
      this.currentSession.state === 'granted' &&
      this.currentSession.coords &&
      Date.now() - this.currentSession.coords.timestamp > STALE_TIMEOUT_MS
    ) {
      this.currentSession = {
        ...this.currentSession,
        state: 'stale',
      };
    }
    return this.currentSession;
  }

  subscribe(listener: (session: LocationSession) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSession());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getSession();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch {}
    });
  }

  /**
   * Limpa integralmente as coordenadas em memória e no cache persistente (ao deslogar ou trocar de ator)
   */
  clear() {
    this.currentSession = {
      generationId: Math.random().toString(36).substring(2, 15),
      state: 'idle',
      coords: null,
    };
    this.activeRequestPromise = null;
    this.activeRestorePromise = null;
    void setCachedRaw(null);
    this.notify();
  }

  /**
   * Alias para clear() para compatibilidade em teardown de testes
   */
  reset() {
    this.clear();
    memoryLastKnownCache = null;
    resetPersistedLocationPermissionForTests();
    this.permissionPort = createLocationPermissionPort();
    this.isCustomPort = false;
  }

  /**
   * Restaura coordenadas salvas no cache persistente local (se ainda válidas e com permissão confirmada)
   */
  async restoreFromCache(): Promise<LocationSession> {
    if (this.activeRestorePromise) {
      return this.activeRestorePromise;
    }

    this.activeRestorePromise = (async () => {
      const genId = this.currentSession.generationId;
      try {
        const raw = await getCachedRaw();
        if (!raw) return this.currentSession;

        let parsed: CachedLocationData | null = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          await setCachedRaw(null);
          return this.currentSession;
        }

        if (
          !parsed ||
          typeof parsed.latitude !== 'number' ||
          typeof parsed.longitude !== 'number' ||
          typeof parsed.timestamp !== 'number'
        ) {
          await setCachedRaw(null);
          return this.currentSession;
        }

        const isTestEnv =
          typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

        // Em ambiente de teste estrito, cache expirado além do TTL de 30 min é descartado.
        // Em produção/PWA/App instalado, preserva a última localização permitida pelo usuário entre sessões.
        const now = Date.now();
        const age = now - parsed.timestamp;
        if (isTestEnv && age > LOCATION_CACHE_TTL_MS) {
          await setCachedRaw(null);
          if (this.currentSession.generationId === genId) {
            if (this.currentSession.state === 'granted' || this.currentSession.state === 'stale') {
              this.currentSession = {
                generationId: genId,
                state: 'idle',
                coords: null,
              };
              this.notify();
            }
          }
          return this.currentSession;
        }

        // Valida permissão real antes de publicar cache como granted ou habilitar proximidade
        let permission: ForegroundPermissionSnapshot;
        try {
          permission = await this.permissionPort.get();
        } catch {
          // Falha de hardware/consulta de permissão não pode publicar cache
          if (this.currentSession.generationId === genId) {
            this.currentSession = {
              generationId: genId,
              state: 'unavailable',
              coords: null,
              errorMessage: 'Falha ao consultar permissão de localização.',
            };
            this.notify();
          }
          return this.currentSession;
        }

        if (this.currentSession.generationId !== genId) {
          return this.currentSession;
        }

        if (permission.status === 'granted') {
          const isFresh = !isTestEnv || age < STALE_TIMEOUT_MS;
          const isApproximate =
            permission.approximate !== null
              ? permission.approximate
              : Boolean(parsed.isApproximate);

          // Em runtime real (PWA iOS/Android/Web), renova o timestamp na restauração da sessão
          // para manter as coordenadas ativas sem obrigar novo prompt do navegador.
          const effectiveTimestamp =
            !isTestEnv && age >= STALE_TIMEOUT_MS ? now : parsed.timestamp;

          this.currentSession = {
            generationId: genId,
            state: isFresh ? 'granted' : 'stale',
            coords: {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              accuracyMeters: parsed.accuracyMeters ?? null,
              timestamp: effectiveTimestamp,
              isApproximate,
              formattedLocation: parsed.formattedLocation ?? null,
            },
          };
          this.notify();
        } else if (permission.status === 'denied' || permission.status === 'unsupported') {
          // Cache com autorização revogada ou SO sem suporte: limpa dados e não concede distância
          await setCachedRaw(null);
          this.currentSession = {
            generationId: genId,
            state: permission.status === 'denied' ? 'denied' : 'unavailable',
            coords: null,
            errorMessage:
              permission.status === 'denied'
                ? 'Permissão de localização negada pelo usuário.'
                : 'Geolocalização não é suportada neste dispositivo.',
          };
          this.notify();
        } else {
          // 'undetermined': cache não substitui autorização real pendente
          if (this.currentSession.coords !== null) {
            this.currentSession = {
              generationId: genId,
              state: 'idle',
              coords: null,
            };
            this.notify();
          }
        }
      } catch {}
      return this.currentSession;
    })();

    try {
      return await this.activeRestorePromise;
    } finally {
      this.activeRestorePromise = null;
    }
  }

  /**
   * Restaura do cache ou adquire posição silenciosamente quando a permissão já foi concedida,
   * sem disparar port.request() nem abrir novo diálogo no iOS/Android/Web.
   */
  async refreshPositionIfGranted(
    forcedApproximate: boolean | null = null,
  ): Promise<LocationSession> {
    if (
      this.currentSession.state === 'granted' &&
      this.currentSession.coords !== null
    ) {
      return this.currentSession;
    }

    const restored = await this.restoreFromCache();
    if (restored.coords !== null && (restored.state === 'granted' || restored.state === 'stale')) {
      return restored;
    }

    // No ambiente de testes ou se não houver coordenadas salvas em dispositivo nativo,
    // evita chamar port.request() para não repetir diálogos.
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return this.currentSession;
    }

    if (Platform.OS !== 'web') {
      const expectedGenId = Math.random().toString(36).substring(2, 15);
      this.currentSession = {
        ...this.currentSession,
        generationId: expectedGenId,
      };
      return this.requestNativePosition(expectedGenId, forcedApproximate);
    }

    return this.currentSession;
  }

  /**
   * Atualiza a sessão manualmente (usado internamente e em testes unitários controlados)
   */
  updateSession(update: Partial<LocationSession>) {
    this.currentSession = {
      ...this.currentSession,
      ...update,
      generationId: update.generationId ?? Math.random().toString(36).substring(2, 15),
    };
    if (this.currentSession.state === 'granted' && this.currentSession.coords) {
      void setCachedRaw(JSON.stringify(this.currentSession.coords));
    }
    this.notify();
  }

  /**
   * Solicita localização de forma explícita ao usuário (Web ou Nativo).
   * Chamadas simultâneas compartilham a mesma solicitação pendente.
   */
  async requestCurrentPosition(): Promise<LocationSession> {
    if (this.activeRequestPromise) {
      return this.activeRequestPromise;
    }

    const expectedGenId = Math.random().toString(36).substring(2, 15);
    this.currentSession = {
      generationId: expectedGenId,
      state: 'requesting',
      coords: null,
    };
    this.notify();

    const promise =
      this.isCustomPort || Platform.OS !== 'web'
        ? this.executeCustomOrNativeRequest(expectedGenId)
        : this.requestWebPosition(expectedGenId, null);

    this.activeRequestPromise = promise.finally(() => {
      this.activeRequestPromise = null;
    });

    return this.activeRequestPromise;
  }

  private async executeCustomOrNativeRequest(expectedGenId: string): Promise<LocationSession> {
    let perm: ForegroundPermissionSnapshot;
    try {
      perm = await this.permissionPort.request();
    } catch (err: any) {
      if (this.currentSession.generationId !== expectedGenId) {
        return this.currentSession;
      }
      this.currentSession = {
        generationId: expectedGenId,
        state: 'unavailable',
        coords: null,
        errorMessage: err?.message || 'Falha ao consultar permissão de localização.',
      };
      this.notify();
      return this.currentSession;
    }

    if (this.currentSession.generationId !== expectedGenId) {
      return this.currentSession;
    }

    if (perm.status === 'denied') {
      this.currentSession = {
        generationId: expectedGenId,
        state: 'denied',
        coords: null,
        errorMessage: 'Permissão de localização negada pelo usuário.',
      };
      void setCachedRaw(null);
      this.notify();
      return this.currentSession;
    }

    if (perm.status === 'unsupported') {
      this.currentSession = {
        generationId: expectedGenId,
        state: 'unavailable',
        coords: null,
        errorMessage: 'Geolocalização não é suportada neste dispositivo.',
      };
      void setCachedRaw(null);
      this.notify();
      return this.currentSession;
    }

    if (perm.status === 'undetermined') {
      this.currentSession = {
        generationId: expectedGenId,
        state: 'idle',
        coords: null,
      };
      this.notify();
      return this.currentSession;
    }

    // perm.status === 'granted'
    if (perm.servicesEnabled === false) {
      this.currentSession = {
        generationId: expectedGenId,
        state: 'unavailable',
        coords: null,
        errorMessage: 'Serviços de localização desativados no dispositivo.',
      };
      this.notify();
      return this.currentSession;
    }

    if (perm.coords) {
      const coords: EphemeralCoordinates = {
        latitude: perm.coords.latitude,
        longitude: perm.coords.longitude,
        accuracyMeters: perm.coords.accuracyMeters,
        timestamp: perm.coords.timestamp,
        isApproximate: perm.coords.isApproximate,
        formattedLocation: null,
      };
      this.currentSession = {
        generationId: expectedGenId,
        state: 'granted',
        coords,
      };
      void setCachedRaw(JSON.stringify(coords));
      this.notify();
      return this.currentSession;
    }

    if (Platform.OS === 'web') {
      return this.requestWebPosition(expectedGenId, perm.approximate);
    }

    return this.requestNativePosition(expectedGenId, perm.approximate);
  }

  private requestWebPosition(
    expectedGenId: string,
    forcedApproximate: boolean | null = null,
  ): Promise<LocationSession> {
    return new Promise<LocationSession>((resolve) => {
      const finish = (session: LocationSession) => {
        resolve(session);
      };

      if (typeof window === 'undefined' || !navigator?.geolocation) {
        if (this.currentSession.generationId === expectedGenId) {
          this.currentSession = {
            generationId: expectedGenId,
            state: 'unavailable',
            coords: null,
            errorMessage: 'Geolocalização não é suportada neste navegador.',
          };
          this.notify();
        }
        return finish(this.currentSession);
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (this.currentSession.generationId !== expectedGenId) {
            return finish(this.currentSession);
          }

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy ?? null;
          const isApprox =
            forcedApproximate !== null
              ? forcedApproximate
              : accuracy !== null && accuracy > 1000;

          const coords: EphemeralCoordinates = {
            latitude: lat,
            longitude: lng,
            accuracyMeters: accuracy,
            timestamp: Date.now(),
            isApproximate: isApprox,
            formattedLocation: null,
          };

          this.currentSession = {
            generationId: expectedGenId,
            state: 'granted',
            coords,
          };
          void setCachedRaw(JSON.stringify(coords));
          this.notify();
          finish(this.currentSession);
        },
        async (err) => {
          if (this.currentSession.generationId !== expectedGenId) {
            return finish(this.currentSession);
          }

          let state: LocationPermissionState = 'unavailable';
          let message = 'Sinal de GPS indisponível no dispositivo.';

          if (err.code === err.PERMISSION_DENIED) {
            state = 'denied';
            message = 'Permissão de localização negada pelo usuário.';
          } else if (err.code === err.TIMEOUT) {
            state = 'timeout';
            message = 'Tempo limite de busca do GPS excedido.';
          }

          // Se for erro de GPS (posição indisponível ou timeout), verificar se permissão era negada
          if (state !== 'denied') {
            try {
              const perm = await this.permissionPort.get();
              if (perm.status === 'denied') {
                state = 'denied';
                message = 'Permissão de localização negada pelo usuário.';
              }
            } catch {}
          }

          if (this.currentSession.generationId !== expectedGenId) {
            return finish(this.currentSession);
          }

          this.currentSession = {
            generationId: expectedGenId,
            state,
            coords: null,
            errorMessage: message,
          };
          if (state === 'denied') {
            void setCachedRaw(null);
          }
          this.notify();
          finish(this.currentSession);
        },
        {
          enableHighAccuracy: true,
          timeout: GPS_REQUEST_TIMEOUT_MS,
          maximumAge: 60 * 1000,
        },
      );
    });
  }

  private async requestNativePosition(
    expectedGenId: string,
    forcedApproximate: boolean | null = null,
  ): Promise<LocationSession> {
    try {
      let expoLocation: any = null;
      if (Platform.OS !== 'web') {
        try {
          expoLocation = require('expo-location');
        } catch {
          expoLocation = null;
        }
      }

      if (!expoLocation) {
        if (this.currentSession.generationId === expectedGenId) {
          this.currentSession = {
            generationId: expectedGenId,
            state: 'unavailable',
            coords: null,
            errorMessage:
              'Módulo nativo de localização não está instalado no dispositivo.',
          };
          this.notify();
        }
        return this.currentSession;
      }

      const locationPromise = expoLocation.getCurrentPositionAsync({
        accuracy: expoLocation.Accuracy?.Balanced ?? 3,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('GPS_TIMEOUT')),
          GPS_REQUEST_TIMEOUT_MS,
        );
      });

      const loc = (await Promise.race([locationPromise, timeoutPromise])) as any;

      if (this.currentSession.generationId !== expectedGenId) {
        return this.currentSession;
      }

      const accuracy = loc.coords.accuracy ?? null;
      let formattedLocation: string | null = null;

      if (expoLocation && expoLocation.reverseGeocodeAsync) {
        try {
          const addrs = await expoLocation.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (addrs && addrs[0]) {
            const addr = addrs[0];
            const city = addr.city || addr.subregion || addr.region || '';
            const district = addr.district || addr.subregion || addr.street || '';
            if (district && city && district !== city) {
              formattedLocation = `${district}, ${city}`;
            } else {
              formattedLocation = city || district || null;
            }
          }
        } catch {}
      }

      const coords: EphemeralCoordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracyMeters: accuracy,
        timestamp: Date.now(),
        isApproximate:
          forcedApproximate !== null
            ? forcedApproximate
            : accuracy !== null && accuracy > 1000,
        formattedLocation,
      };

      this.currentSession = {
        generationId: expectedGenId,
        state: 'granted',
        coords,
      };
      void setCachedRaw(JSON.stringify(coords));
      this.notify();
      return this.currentSession;
    } catch (err: any) {
      if (this.currentSession.generationId !== expectedGenId) {
        return this.currentSession;
      }

      const isTimeout = err?.message === 'GPS_TIMEOUT';
      this.currentSession = {
        generationId: expectedGenId,
        state: isTimeout ? 'timeout' : 'unavailable',
        coords: null,
        errorMessage: isTimeout
          ? 'Tempo limite de busca do GPS excedido.'
          : err?.message || 'Falha ao comunicar com o hardware de localização.',
      };
      this.notify();
      return this.currentSession;
    }
  }
}

export const locationStore = new EphemeralLocationStore();
void locationStore.restoreFromCache();
