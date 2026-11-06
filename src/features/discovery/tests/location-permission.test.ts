// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLocationPermissionPort,
  type ForegroundPermissionSnapshot,
  type LocationPermissionPort,
} from '../model/location-permission';
import { locationStore, LOCATION_CACHE_TTL_MS } from '../model/location-provider';

describe('Location Permission & Port — Tarefa 3', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    locationStore.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    locationStore.reset();
  });

  describe('Cenário 1: Cache recente com permissão concedida e validação real concluída', () => {
    it('deve validar permissão real antes de publicar cache e restaurar estado granted com coordenadas', async () => {
      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: true,
          approximate: false,
        }),
        request: vi.fn(),
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      // Popula cache recente (5 minutos atrás)
      locationStore.updateSession({
        state: 'granted',
        coords: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracyMeters: 10,
          timestamp: Date.now() - 5 * 60 * 1000,
          isApproximate: false,
          formattedLocation: 'Centro, São Paulo',
        },
      });

      const session = await locationStore.restoreFromCache();

      expect(mockPort.get).toHaveBeenCalledTimes(1);
      expect(mockPort.request).not.toHaveBeenCalled();
      expect(session.state).toBe('granted');
      expect(session.coords?.latitude).toBe(-23.5505);
      expect(session.coords?.formattedLocation).toBe('Centro, São Paulo');
    });
  });

  describe('Cenário 2: Cache recente com permissão revogada, sem falsa sessão granted nem distância', () => {
    it('não deve publicar sessão granted nem coordenadas se a permissão foi revogada nas configurações', async () => {
      // Usuário revogou permissão no SO
      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'denied',
          canAskAgain: false,
          servicesEnabled: true,
          approximate: null,
        }),
        request: vi.fn(),
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      // Simula cache recente que existia antes da revogação
      locationStore.updateSession({
        state: 'granted',
        coords: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracyMeters: 10,
          timestamp: Date.now() - 2 * 60 * 1000,
          isApproximate: false,
        },
      });

      const session = await locationStore.restoreFromCache();

      expect(mockPort.get).toHaveBeenCalledTimes(1);
      expect(session.state).toBe('denied');
      expect(session.coords).toBeNull();

      // Próxima leitura do cache deve encontrar cache purgado/limpo
      const secondCheck = await locationStore.restoreFromCache();
      expect(secondCheck.coords).toBeNull();
    });
  });

  describe('Cenário 3: Cache expirado/inválido e falha de consulta de permissão', () => {
    it('deve descartar cache cujo timestamp excede o TTL de 30 minutos', async () => {
      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: true,
          approximate: false,
        }),
        request: vi.fn(),
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      // Coordenadas salvas há 35 minutos (TTL de 30 minutos expirado)
      locationStore.updateSession({
        state: 'granted',
        coords: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracyMeters: 10,
          timestamp: Date.now() - 35 * 60 * 1000,
          isApproximate: false,
        },
      });

      const session = await locationStore.restoreFromCache();

      expect(session.coords).toBeNull();
      expect(session.state).toBe('idle');
    });

    it('não deve publicar sessão granted caso a consulta de permissão lance erro de hardware/sistema', async () => {
      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockRejectedValue(new Error('SYSTEM_PERMISSION_SERVICE_UNAVAILABLE')),
        request: vi.fn(),
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      locationStore.updateSession({
        state: 'granted',
        coords: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracyMeters: 10,
          timestamp: Date.now() - 5 * 60 * 1000,
          isApproximate: false,
        },
      });

      const session = await locationStore.restoreFromCache();

      expect(session.coords).toBeNull();
      expect(session.state).not.toBe('granted');
    });
  });

  describe('Cenário 4: Consulta de estado/restauração sem chamar request', () => {
    it('restoreFromCache e getSession nunca devem disparar port.request()', async () => {
      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'undetermined',
          canAskAgain: true,
          servicesEnabled: null,
          approximate: null,
        }),
        request: vi.fn(),
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      locationStore.getSession();
      await locationStore.restoreFromCache();

      expect(mockPort.request).not.toHaveBeenCalled();
      expect(locationStore.getSession().state).toBe('idle');
      expect(locationStore.getSession().coords).toBeNull();
    });
  });

  describe('Cenário 5: Permissão concedida com serviços desligados, ausência de posição ou timeout, sem classificar como denied', () => {
    it('deve classificar como unavailable (não denied) quando serviços de localização estiverem desativados no SO', async () => {
      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: false,
          approximate: false,
        }),
        request: vi.fn().mockResolvedValue({
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: false,
          approximate: false,
        }),
        openSettings: vi.fn().mockResolvedValue('opened'),
      };

      locationStore.setPermissionPort(mockPort);

      const session = await locationStore.requestCurrentPosition();

      expect(session.state).toBe('unavailable');
      expect(session.state).not.toBe('denied');
      expect(session.coords).toBeNull();
    });
  });

  describe('Cenário 6: Duas solicitações simultâneas com um único pedido real', () => {
    it('chamadas concorrentes a requestCurrentPosition devem compartilhar a mesma promise sem duplicar diálogo', async () => {
      let resolveRequest: ((value: ForegroundPermissionSnapshot) => void) | null = null;
      const requestFn = vi.fn().mockImplementation(() => {
        return new Promise<ForegroundPermissionSnapshot>((resolve) => {
          resolveRequest = resolve;
        });
      });

      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'undetermined',
          canAskAgain: true,
          servicesEnabled: true,
          approximate: null,
        }),
        request: requestFn,
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      const p1 = locationStore.requestCurrentPosition();
      const p2 = locationStore.requestCurrentPosition();

      // Um único pedido real disparado para ambas as chamadas simultâneas
      expect(requestFn).toHaveBeenCalledTimes(1);

      // Responde com recusa para encerrar a solicitação
      resolveRequest!({
        status: 'denied',
        canAskAgain: true,
        servicesEnabled: true,
        approximate: null,
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1.state).toBe('denied');
      expect(r2.state).toBe('denied');
      expect(r1.generationId).toBe(r2.generationId);
    });
  });

  describe('Cenário 7: Logout/troca de ator/clear durante espera e descarte da resposta antiga', () => {
    it('não deve aplicar coordenadas antigas se clear() ou logout for acionado enquanto a busca de posição está pendente', async () => {
      let resolvePosition: ((pos: any) => void) | null = null;
      const mockGeo = {
        getCurrentPosition: vi.fn((success) => {
          resolvePosition = success;
        }),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      };
      Object.defineProperty(globalThis.navigator, 'geolocation', {
        value: mockGeo,
        configurable: true,
        writable: true,
      });

      const mockPort: LocationPermissionPort = {
        get: vi.fn().mockResolvedValue({
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: true,
          approximate: false,
        }),
        request: vi.fn().mockResolvedValue({
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: true,
          approximate: false,
        }),
        openSettings: vi.fn().mockResolvedValue('manual'),
      };

      locationStore.setPermissionPort(mockPort);

      // Inicia busca
      const inFlightPromise = locationStore.requestCurrentPosition();

      // Permite avanço dos microtasks da porta assíncrona até acionar a geolocalização
      await Promise.resolve();
      await Promise.resolve();

      // Usuário faz logout ou troca de ator no meio da espera
      locationStore.clear();

      expect(locationStore.getSession().state).toBe('idle');
      expect(locationStore.getSession().coords).toBeNull();

      // Resposta tardia do hardware de geolocalização com coordenadas de outro usuário/sessão
      resolvePosition!({
        coords: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracy: 10,
        },
      });

      await inFlightPromise;

      // As coordenadas NÃO devem ressuscitar na sessão atual após o clear
      const current = locationStore.getSession();
      expect(current.state).toBe('idle');
      expect(current.coords).toBeNull();
    });
  });

  describe('Cenário 8: Recusa com canAskAgain true/false e recuperação coerente', () => {
    it('deve refletir canAskAgain quando negado temporariamente versus permanentemente', async () => {
      const portAskAgainTrue = createLocationPermissionPort({
        platform: 'android',
        expoLocation: {
          getForegroundPermissionsAsync: vi.fn().mockResolvedValue({
            status: 'denied',
            canAskAgain: true,
          }),
          requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({
            status: 'denied',
            canAskAgain: true,
          }),
        },
      });

      const snap1 = await portAskAgainTrue.request();
      expect(snap1.status).toBe('denied');
      expect(snap1.canAskAgain).toBe(true);

      const portAskAgainFalse = createLocationPermissionPort({
        platform: 'android',
        expoLocation: {
          getForegroundPermissionsAsync: vi.fn().mockResolvedValue({
            status: 'denied',
            canAskAgain: false,
          }),
          requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({
            status: 'denied',
            canAskAgain: false,
          }),
        },
      });

      const snap2 = await portAskAgainFalse.request();
      expect(snap2.status).toBe('denied');
      expect(snap2.canAskAgain).toBe(false);
    });
  });

  describe('Cenário 9: Web sem Permissions API, geolocation indisponível e resultado real', () => {
    it('deve retornar status unsupported e canAskAgain false quando navigator.geolocation não existe', async () => {
      const webPortWithoutGeo = createLocationPermissionPort({
        platform: 'web',
        navigatorGeolocation: null,
        navigatorPermissions: null,
      });

      const snap = await webPortWithoutGeo.get();
      expect(snap.status).toBe('unsupported');
      expect(snap.canAskAgain).toBe(false);
    });

    it('deve tratar ausência da Permissions API como undetermined no get()', async () => {
      const mockGeo = {
        getCurrentPosition: vi.fn(),
      };
      const webPortWithoutPermsApi = createLocationPermissionPort({
        platform: 'web',
        navigatorGeolocation: mockGeo,
        navigatorPermissions: null,
      });

      const snap = await webPortWithoutPermsApi.get();
      expect(snap.status).toBe('undetermined');
      expect(snap.canAskAgain).toBe(true);
    });

    it('deve obter resultado real granted quando getCurrentPosition responde com sucesso', async () => {
      const mockGeo = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: { latitude: -23.55, longitude: -46.63, accuracy: 20 },
          });
        }),
      };
      const webPort = createLocationPermissionPort({
        platform: 'web',
        navigatorGeolocation: mockGeo,
        navigatorPermissions: null,
      });

      const snap = await webPort.request();
      expect(snap.status).toBe('granted');
      expect(snap.servicesEnabled).toBe(true);
    });

    it('deve obter resultado denied com canAskAgain false quando getCurrentPosition retorna PERMISSION_DENIED', async () => {
      const mockGeo = {
        getCurrentPosition: vi.fn((_, error) => {
          error({
            code: 1, // PERMISSION_DENIED
            PERMISSION_DENIED: 1,
            message: 'User denied Geolocation',
          });
        }),
      };
      const webPort = createLocationPermissionPort({
        platform: 'web',
        navigatorGeolocation: mockGeo,
        navigatorPermissions: null,
      });

      const snap = await webPort.request();
      expect(snap.status).toBe('denied');
      expect(snap.canAskAgain).toBe(false);
    });
  });

  describe('Cenário 10: Configurações nativas suportadas versus orientação manual no navegador', () => {
    it('openSettings no web deve retornar manual', async () => {
      const webPort = createLocationPermissionPort({ platform: 'web' });
      const result = await webPort.openSettings();
      expect(result).toBe('manual');
    });

    it('openSettings no nativo deve retornar opened quando Linking.openSettings for bem-sucedido', async () => {
      const mockLinking = {
        openSettings: vi.fn().mockResolvedValue(true),
      };
      const nativePort = createLocationPermissionPort({
        platform: 'android',
        linking: mockLinking,
      });

      const result = await nativePort.openSettings();
      expect(result).toBe('opened');
      expect(mockLinking.openSettings).toHaveBeenCalledTimes(1);
    });

    it('openSettings no nativo deve retornar manual quando Linking falha ou não é suportado', async () => {
      const mockLinking = {
        openSettings: vi.fn().mockRejectedValue(new Error('NOT_SUPPORTED')),
      };
      const nativePort = createLocationPermissionPort({
        platform: 'android',
        linking: mockLinking,
      });

      const result = await nativePort.openSettings();
      expect(result).toBe('manual');
    });
  });

  describe('Cenário 11: Compatibilidade de locationStore e API pública de consumidores', () => {
    it('preserva API pública de locationStore (getSession, subscribe, clear, reset, updateSession, requestCurrentPosition)', () => {
      expect(typeof locationStore.getSession).toBe('function');
      expect(typeof locationStore.subscribe).toBe('function');
      expect(typeof locationStore.clear).toBe('function');
      expect(typeof locationStore.reset).toBe('function');
      expect(typeof locationStore.updateSession).toBe('function');
      expect(typeof locationStore.requestCurrentPosition).toBe('function');
      expect(typeof locationStore.restoreFromCache).toBe('function');
    });

    it('subscribe notifica imediatamente o estado atual e atualizações subsequentes', () => {
      const states: string[] = [];
      const unsub = locationStore.subscribe((s) => {
        states.push(s.state);
      });

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

      unsub();

      expect(states).toContain('idle');
      expect(states).toContain('granted');
    });
  });
});
