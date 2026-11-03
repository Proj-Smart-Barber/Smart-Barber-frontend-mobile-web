import { Platform } from 'react-native';

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
export const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de validade do cache
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

async function getCachedRaw(): Promise<string | null> {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return memoryCache;
  }
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(LOCATION_STORAGE_KEY)
        : memoryCache;
    } catch {
      return memoryCache;
    }
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
  } catch {
    return memoryCache;
  }
}

async function setCachedRaw(value: string | null): Promise<void> {
  memoryCache = value;
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return;
  }
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (value === null) {
          window.localStorage.removeItem(LOCATION_STORAGE_KEY);
        } else {
          window.localStorage.setItem(LOCATION_STORAGE_KEY, value);
        }
      }
    } catch {}
    return;
  }
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (value === null) {
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, value);
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
  private pendingResolves = new Set<(session: LocationSession) => void>();

  constructor() {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        this.handleVisibilityChange();
      });
    }
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
    void setCachedRaw(null);
    this.notify();
  }

  /**
   * Alias para clear() para compatibilidade em teardown de testes
   */
  reset() {
    this.clear();
  }

  /**
   * Restaura coordenadas salvas no cache persistente local (se ainda válidas)
   */
  async restoreFromCache(): Promise<LocationSession> {
    try {
      const raw = await getCachedRaw();
      if (!raw) return this.currentSession;
      const parsed: CachedLocationData = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number' &&
        typeof parsed.timestamp === 'number'
      ) {
        const isFresh = Date.now() - parsed.timestamp < STALE_TIMEOUT_MS;
        if (isFresh) {
          this.currentSession = {
            generationId: this.currentSession.generationId,
            state: 'granted',
            coords: {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              accuracyMeters: parsed.accuracyMeters ?? null,
              timestamp: parsed.timestamp,
              isApproximate: Boolean(parsed.isApproximate),
              formattedLocation: parsed.formattedLocation ?? null,
            },
          };
          this.notify();
        } else {
          this.currentSession = {
            ...this.currentSession,
            state: 'stale',
            coords: {
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              accuracyMeters: parsed.accuracyMeters ?? null,
              timestamp: parsed.timestamp,
              isApproximate: Boolean(parsed.isApproximate),
              formattedLocation: parsed.formattedLocation ?? null,
            },
          };
          this.notify();
        }
      }
    } catch {}
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
   * Solicita localização de forma explícita ao usuário (Web ou Nativo)
   */
  async requestCurrentPosition(): Promise<LocationSession> {
    const newGenId = Math.random().toString(36).substring(2, 15);
    this.currentSession = {
      generationId: newGenId,
      state: 'requesting',
      coords: null,
    };

    // Notifica cancelamento/substituição de requisições concorrentes pendentes
    for (const resolvePending of this.pendingResolves) {
      try {
        resolvePending(this.currentSession);
      } catch {}
    }
    this.pendingResolves.clear();

    this.notify();

    if (Platform.OS === 'web') {
      return this.requestWebPosition(newGenId);
    }

    return this.requestNativePosition(newGenId);
  }

  private requestWebPosition(expectedGenId: string): Promise<LocationSession> {
    return new Promise<LocationSession>((resolve) => {
      this.pendingResolves.add(resolve);

      const safeResolve = (session: LocationSession) => {
        this.pendingResolves.delete(resolve);
        resolve(session);
      };

      if (typeof window === 'undefined' || !navigator?.geolocation) {
        this.currentSession = {
          generationId: expectedGenId,
          state: 'unavailable',
          coords: null,
          errorMessage: 'Geolocalização não é suportada neste navegador.',
        };
        this.notify();
        return safeResolve(this.currentSession);
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (this.currentSession.generationId !== expectedGenId) {
            return safeResolve(this.currentSession);
          }

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy ?? null;
          const isApprox = accuracy !== null && accuracy > 1000;

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
          safeResolve(this.currentSession);
        },
        (err) => {
          if (this.currentSession.generationId !== expectedGenId) {
            return safeResolve(this.currentSession);
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

          this.currentSession = {
            generationId: expectedGenId,
            state,
            coords: null,
            errorMessage: message,
          };
          this.notify();
          safeResolve(this.currentSession);
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
        this.currentSession = {
          generationId: expectedGenId,
          state: 'unavailable',
          coords: null,
          errorMessage:
            'Módulo nativo de localização não está instalado no dispositivo.',
        };
        this.notify();
        return this.currentSession;
      }

      const { status } =
        await expoLocation.requestForegroundPermissionsAsync();

      if (this.currentSession.generationId !== expectedGenId) {
        return this.currentSession;
      }

      if (status !== 'granted') {
        this.currentSession = {
          generationId: expectedGenId,
          state: 'denied',
          coords: null,
          errorMessage: 'Permissão de localização não concedida.',
        };
        this.notify();
        return this.currentSession;
      }

      const locationPromise = expoLocation.getCurrentPositionAsync({
        accuracy: expoLocation.Accuracy.Balanced,
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
        isApproximate: accuracy !== null && accuracy > 1000,
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
