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
}

export interface LocationSession {
  generationId: string;
  state: LocationPermissionState;
  coords: EphemeralCoordinates | null;
  errorMessage?: string;
}

const STALE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos de validade de UX
const GPS_REQUEST_TIMEOUT_MS = 10 * 1000; // 10 segundos de timeout de hardware

class EphemeralLocationStore {
  private currentSession: LocationSession = {
    generationId: Math.random().toString(36).substring(2, 15),
    state: 'idle',
    coords: null,
  };

  private listeners = new Set<(session: LocationSession) => void>();

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
   * Limpa integralmente as coordenadas em memória (ao deslogar ou trocar de ator)
   */
  clear() {
    this.currentSession = {
      generationId: Math.random().toString(36).substring(2, 15),
      state: 'idle',
      coords: null,
    };
    this.notify();
  }

  /**
   * Alias para clear() para compatibilidade em teardown de testes
   */
  reset() {
    this.clear();
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
    this.notify();

    if (Platform.OS === 'web') {
      return this.requestWebPosition(newGenId);
    }

    return this.requestNativePosition(newGenId);
  }

  private requestWebPosition(expectedGenId: string): Promise<LocationSession> {
    return new Promise<LocationSession>((resolve) => {
      if (typeof window === 'undefined' || !navigator?.geolocation) {
        this.currentSession = {
          generationId: expectedGenId,
          state: 'unavailable',
          coords: null,
          errorMessage: 'Geolocalização não é suportada neste navegador.',
        };
        this.notify();
        return resolve(this.currentSession);
      }

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (this.currentSession.generationId === expectedGenId) {
          this.currentSession = {
            generationId: expectedGenId,
            state: 'timeout',
            coords: null,
            errorMessage: 'Tempo esgotado ao tentar obter a localização.',
          };
          this.notify();
          resolve(this.currentSession);
        }
      }, GPS_REQUEST_TIMEOUT_MS);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (timedOut) return;
          clearTimeout(timer);

          if (this.currentSession.generationId !== expectedGenId) return;

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy ?? null;
          const isApprox = accuracy !== null && accuracy > 1000;

          this.currentSession = {
            generationId: expectedGenId,
            state: 'granted',
            coords: {
              latitude: lat,
              longitude: lng,
              accuracyMeters: accuracy,
              timestamp: Date.now(),
              isApproximate: isApprox,
            },
          };
          this.notify();
          resolve(this.currentSession);
        },
        (err) => {
          if (timedOut) return;
          clearTimeout(timer);

          if (this.currentSession.generationId !== expectedGenId) return;

          let state: LocationPermissionState = 'unavailable';
          let message = 'Não foi possível obter sua localização.';

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
          resolve(this.currentSession);
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
      this.currentSession = {
        generationId: expectedGenId,
        state: 'granted',
        coords: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracyMeters: accuracy,
          timestamp: Date.now(),
          isApproximate: accuracy !== null && accuracy > 1000,
        },
      };
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
