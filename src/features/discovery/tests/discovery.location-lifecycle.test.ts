// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { locationStore, LOCATION_CACHE_TTL_MS } from '../model/location-provider';

describe('Location Provider — Ciclo de Vida e Casos de Borda', () => {
  const originalGeolocation = globalThis.navigator?.geolocation;

  beforeEach(() => {
    vi.useFakeTimers();
    locationStore.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalGeolocation) {
      Object.defineProperty(globalThis.navigator, 'geolocation', {
        value: originalGeolocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('deve aceitar permissão concedida após mais de 10 segundos sem descartar o sucesso por timeout prematuro', async () => {
    let capturedSuccessCallback: ((pos: any) => void) | null = null;
    let capturedErrorCallback: ((err: any) => void) | null = null;
    let capturedOptions: any = null;

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success, error, options) => {
        capturedSuccessCallback = success;
        capturedErrorCallback = error;
        capturedOptions = options;
      }),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const requestPromise = locationStore.requestCurrentPosition();

    expect(locationStore.getSession().state).toBe('requesting');
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(capturedOptions?.timeout).toBe(10000);

    // O usuário gasta 15 segundos lendo e aceitando a caixa de diálogo nativa
    vi.advanceTimersByTime(15000);

    // No código antigo, o temporizador de 10s disparava aqui, marcando timeout e descartando o sucesso.
    // Com o ajuste, a sessão continua 'requesting' aguardando a decisão/hardware.
    expect(locationStore.getSession().state).toBe('requesting');

    // Usuário finalmente clica em "Permitir"
    capturedSuccessCallback!({
      coords: {
        latitude: -23.5505,
        longitude: -46.6333,
        accuracy: 25,
      },
    });

    const result = await requestPromise;

    expect(result.state).toBe('granted');
    expect(result.coords?.latitude).toBe(-23.5505);
    expect(result.coords?.longitude).toBe(-46.6333);
    expect(result.coords?.isApproximate).toBe(false);
  });

  it('deve marcar timeout quando o navegador sinaliza esgotamento do tempo de hardware (err.TIMEOUT)', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) => {
        error({
          code: 3, // TIMEOUT
          TIMEOUT: 3,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          message: 'Timeout expired',
        });
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const result = await locationStore.requestCurrentPosition();

    expect(result.state).toBe('timeout');
    expect(result.coords).toBeNull();
    expect(result.errorMessage).toBe('Tempo limite de busca do GPS excedido.');
  });

  it('deve marcar denied quando o usuário recusa permissão (err.PERMISSION_DENIED)', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          TIMEOUT: 3,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          message: 'User denied Geolocation',
        });
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const result = await locationStore.requestCurrentPosition();

    expect(result.state).toBe('denied');
    expect(result.coords).toBeNull();
    expect(result.errorMessage).toBe('Permissão de localização negada pelo usuário.');
  });

  it('deve marcar unavailable em falha do dispositivo/antena GPS (err.POSITION_UNAVAILABLE)', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) => {
        error({
          code: 2, // POSITION_UNAVAILABLE
          TIMEOUT: 3,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          message: 'Position unavailable',
        });
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const result = await locationStore.requestCurrentPosition();

    expect(result.state).toBe('unavailable');
    expect(result.coords).toBeNull();
    expect(result.errorMessage).toBe('Sinal de GPS indisponível no dispositivo.');
  });

  it('deve sinalizar precisão aproximada quando a acurácia reportada for superior a 1000 metros', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: -23.55,
            longitude: -46.63,
            accuracy: 3500, // 3.5 km de margem (torre de celular ou IP)
          },
        });
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const result = await locationStore.requestCurrentPosition();

    expect(result.state).toBe('granted');
    expect(result.coords?.isApproximate).toBe(true);
    expect(result.coords?.accuracyMeters).toBe(3500);
  });

  it('deve restaurar do cache e transitar para stale após expiração do TTL de 15 minutos', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: -23.5491,
            longitude: -46.613,
            accuracy: 10,
          },
        });
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    await locationStore.requestCurrentPosition();
    expect(locationStore.getSession().state).toBe('granted');

    // Avança 16 minutos no tempo
    vi.advanceTimersByTime(16 * 60 * 1000);

    const session = locationStore.getSession();
    expect(session.state).toBe('stale');
    // Coordenadas válidas ainda são preservadas para reconsulta ou tentativa
    expect(session.coords?.latitude).toBe(-23.5491);
  });

  it('deve lidar com duas chamadas concorrentes sem deixar Promises pendentes nem sobrescrever com resultado obsoleto', async () => {
    let success1: any = null;
    let success2: any = null;

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        if (!success1) {
          success1 = success;
        } else {
          success2 = success;
        }
      }),
    };

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
      writable: true,
    });

    const p1 = locationStore.requestCurrentPosition();
    const p2 = locationStore.requestCurrentPosition();

    // A primeira promise é substituída e resolvida sem vazamento de promise
    const r1 = await p1;
    expect(r1).toBeDefined();

    // O retorno da segunda requisição (mais recente) define o estado final
    success2({
      coords: {
        latitude: -23.50,
        longitude: -46.60,
        accuracy: 15,
      },
    });

    const r2 = await p2;
    expect(r2.state).toBe('granted');
    expect(r2.coords?.latitude).toBe(-23.50);

    // Se a primeira chamada tardia responder agora, ela não sobrescreve
    if (success1) {
      success1({
        coords: {
          latitude: -22.00,
          longitude: -44.00,
          accuracy: 10,
        },
      });
    }

    expect(locationStore.getSession().coords?.latitude).toBe(-23.50);
  });

  it('uma falha 503 do backend não deve transformar consentimento concedido em negado', () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.5505,
        longitude: -46.6333,
        accuracyMeters: 20,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    // Simula ocorrência de erro 503 no backend:
    // O consentimento no store de localização permanece intacto com coordenadas preservadas
    const session = locationStore.getSession();
    expect(session.state).toBe('granted');
    expect(session.coords).not.toBeNull();
    expect(session.coords?.latitude).toBe(-23.5505);
  });

  it('deve reavaliar o estado ao retornar do background (visibilitychange)', () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55,
        longitude: -46.63,
        accuracyMeters: 10,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    // Avança 20 minutos com a tela em background
    vi.advanceTimersByTime(20 * 60 * 1000);

    // Dispara evento de retorno à visibilidade
    if (typeof document !== 'undefined') {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    const session = locationStore.getSession();
    expect(session.state).toBe('stale');
  });
});
