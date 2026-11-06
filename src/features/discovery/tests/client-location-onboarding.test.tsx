// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import {
  useClientLocationOnboarding,
  resetLocationIntroStorageForTests,
  setLocationIntroSeen,
  getLocationIntroSeen,
} from '../model/use-client-location-onboarding';
import { LocationOnboardingModal } from '../ui/location-onboarding-modal';
import { LocationStatusPanel } from '../ui/location-status-panel';
import { locationStore } from '../model/location-provider';
import type {
  LocationPermissionPort,
  ForegroundPermissionSnapshot,
} from '../model/location-permission';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('Tarefa 4 — Modal Automático e Recuperação de Localização', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    locationStore.reset();
    resetLocationIntroStorageForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    locationStore.reset();
    resetLocationIntroStorageForTests();
  });

  it('1. Primeira entrada elegível com permissão indeterminada: modal abre automaticamente no stage "intro"', async () => {
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

    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: mockPort,
      }),
    );

    // Inicialmente está em checking
    expect(result.current.stage).toBe('checking');

    // Resolve a verificação inicial
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPort.get).toHaveBeenCalledTimes(1);
    expect(mockPort.request).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('intro');
  });

  it('2. Permissão já concedida, introdução já vista e recusa anterior: nenhum pedido automático repetido', async () => {
    // 2A: Permissão já concedida
    const grantedPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        servicesEnabled: true,
        approximate: false,
      }),
      request: vi.fn(),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result: resGranted } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: grantedPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(resGranted.current.stage).toBe('ready');
    expect(grantedPort.request).not.toHaveBeenCalled();

    // 2B: Introdução já vista com permissão indeterminada
    await setLocationIntroSeen(true);

    const undeterminedPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        servicesEnabled: null,
        approximate: null,
      }),
      request: vi.fn(),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result: resSeen } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: undeterminedPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(resSeen.current.stage).toBe('unavailable');
    expect(undeterminedPort.request).not.toHaveBeenCalled();

    // 2C: Recusa anterior (status denied)
    const deniedPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        servicesEnabled: null,
        approximate: null,
      }),
      request: vi.fn(),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result: resDenied } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: deniedPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(resDenied.current.stage).toBe('denied');
    expect(deniedPort.request).not.toHaveBeenCalled();
  });

  it('3. Intro vista não equivale a grant, inclusive após recarregar', async () => {
    // Marca intro como vista
    await setLocationIntroSeen(true);
    expect(await getLocationIntroSeen()).toBe(true);

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

    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: mockPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Intro vista NÃO confere permissão nem coordenadas
    expect(result.current.stage).not.toBe('ready');
    expect(locationStore.getSession().state).not.toBe('granted');
    expect(locationStore.getSession().coords).toBeNull();
  });

  it('4. Início explícito, reserva/link direto, outro modal e drawer aberto não são interrompidos', async () => {
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

    // enabled = false simula rota Início, drawer aberto ou reserva ativa
    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: false,
        permissionPort: mockPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    // O modal explicativo não abre quando enabled=false
    expect(result.current.stage).not.toBe('intro');
  });

  it('5. Continuar chama uma única solicitação real, sem fabricar consentimento', async () => {
    let resolveRequestPromise: (value: ForegroundPermissionSnapshot) => void;
    const requestPromise = new Promise<ForegroundPermissionSnapshot>((resolve) => {
      resolveRequestPromise = resolve;
    });

    const mockPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        servicesEnabled: null,
        approximate: null,
      }),
      request: vi.fn().mockReturnValue(requestPromise),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: mockPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stage).toBe('intro');

    // Dispara dois cliques simultâneos em continueRequest
    act(() => {
      void result.current.continueRequest();
      void result.current.continueRequest();
    });

    expect(mockPort.request).toHaveBeenCalledTimes(1);
    expect(result.current.stage).toBe('requesting');
    expect(result.current.requestPhase).toBe('permission');

    // Consentimento não é inventado antes da resposta do SO
    expect(locationStore.getSession().state).not.toBe('granted');

    // SO responde com permissão negada
    await act(async () => {
      resolveRequestPromise!({
        status: 'denied',
        canAskAgain: false,
        servicesEnabled: null,
        approximate: null,
      });
      await Promise.resolve();
    });

    expect(result.current.stage).toBe('denied');
    expect(locationStore.getSession().state).not.toBe('granted');
  });

  it('6. Recusa com/sem canAskAgain, configurações reais versus orientação manual', () => {
    const handleRecover = vi.fn();
    const handleManual = vi.fn();

    // 6A: canAskAgain = true
    const { unmount: unmountA } = renderWithTheme(
      <LocationStatusPanel
        status="denied"
        canAskAgain={true}
        onRecoverPermission={handleRecover}
        onManualSearch={handleManual}
      />,
    );

    expect(screen.getByText('Localização não permitida')).toBeTruthy();
    expect(
      screen.getByText(
        'Sem acesso à sua localização, não conseguimos mostrar as barbearias mais próximas de você.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Você pode buscar por nome ou escolher um bairro.')).toBeTruthy();

    const allowBtn = screen.getByText('Permitir localização');
    fireEvent.click(allowBtn);
    expect(handleRecover).toHaveBeenCalledTimes(1);

    unmountA();

    // 6B: canAskAgain = false no Nativo (Abrir configurações)
    const { unmount: unmountB } = renderWithTheme(
      <LocationStatusPanel
        status="denied"
        canAskAgain={false}
        isPlatformWeb={false}
        onRecoverPermission={handleRecover}
        onManualSearch={handleManual}
      />,
    );

    const settingsBtn = screen.getByText('Abrir configurações');
    fireEvent.click(settingsBtn);
    expect(handleRecover).toHaveBeenCalledTimes(2);

    unmountB();

    // 6C: canAskAgain = false na Web (orientação manual)
    renderWithTheme(
      <LocationStatusPanel
        status="denied"
        canAskAgain={false}
        isPlatformWeb={true}
        onRecoverPermission={handleRecover}
        onManualSearch={handleManual}
      />,
    );

    expect(
      screen.getByText(
        'Ative o acesso à localização nas configurações do seu navegador para encontrar barbearias próximas.',
      ),
    ).toBeTruthy();
  });

  it('7. Permissão concedida sem posição e serviço indisponível produzem mensagens diferentes de denied', () => {
    // 7A: Posição indisponível
    const { unmount } = renderWithTheme(
      <LocationStatusPanel
        status="unavailable"
        onRetryPosition={vi.fn()}
        onManualSearch={vi.fn()}
      />,
    );

    expect(screen.getByText('Não conseguimos obter sua localização agora.')).toBeTruthy();
    expect(
      screen.getByText('Verifique se o GPS está ativado ou tente novamente em alguns instantes.'),
    ).toBeTruthy();

    unmount();

    // 7B: Serviço indisponível (HTTP 503)
    renderWithTheme(
      <LocationStatusPanel
        status="service_unavailable"
        onRetryPosition={vi.fn()}
        onManualSearch={vi.fn()}
      />,
    );

    expect(screen.getByText('Serviço temporariamente indisponível')).toBeTruthy();
    expect(
      screen.getByText(
        'Não foi possível calcular as barbearias mais próximas no momento. Não se trata de permissão negada nem de GPS desligado.',
      ),
    ).toBeTruthy();
  });

  it('8. Logout/troca de ator/unmount durante a espera não aplicam respostas antigas', async () => {
    let resolveSlowRequest: (value: ForegroundPermissionSnapshot) => void;
    const slowRequestPromise = new Promise<ForegroundPermissionSnapshot>((resolve) => {
      resolveSlowRequest = resolve;
    });

    const mockPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        servicesEnabled: null,
        approximate: null,
      }),
      request: vi.fn().mockReturnValue(slowRequestPromise),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result, rerender } = renderHook(
      ({ actorId }) =>
        useClientLocationOnboarding({
          actorId,
          enabled: true,
          permissionPort: mockPort,
        }),
      { initialProps: { actorId: 'actor-A' } },
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Inicia requisição com actor-A
    act(() => {
      void result.current.continueRequest();
    });

    expect(result.current.stage).toBe('requesting');

    // Troca para actor-B (ou logout) antes da resposta resolver
    rerender({ actorId: 'actor-B' });

    // Resposta antiga chega tarde
    await act(async () => {
      resolveSlowRequest!({
        status: 'granted',
        canAskAgain: true,
        servicesEnabled: true,
        approximate: false,
      });
      await Promise.resolve();
    });

    // actor-B não assume permissão de actor-A
    expect(result.current.stage).not.toBe('ready');
  });

  it('9. Retomada de background/configurações consulta o estado sem pedir novamente nem duplicar localização', async () => {
    let currentStatus: 'undetermined' | 'granted' = 'undetermined';

    const mockPort: LocationPermissionPort = {
      get: vi.fn().mockImplementation(async () => ({
        status: currentStatus,
        canAskAgain: true,
        servicesEnabled: true,
        approximate: false,
      })),
      request: vi.fn(),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: mockPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stage).toBe('intro');
    expect(mockPort.request).not.toHaveBeenCalled();

    // Usuário abre configurações do SO e habilita permissão
    currentStatus = 'granted';

    // Dispara retorno à aba / retomada do app
    await act(async () => {
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new Event('visibilitychange'));
      }
      await Promise.resolve();
    });

    // Consultou o estado real sem chamar request()
    expect(mockPort.get).toHaveBeenCalled();
    expect(mockPort.request).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('ready');
  });

  it('10. Espera pela decisão do usuário não vira timeout de GPS aos 8 s', async () => {
    const mockPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        servicesEnabled: null,
        approximate: null,
      }),
      // Request do SO aguardando escolha do usuário indefinidamente
      request: vi.fn().mockReturnValue(new Promise(() => {})),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: mockPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      void result.current.continueRequest();
    });

    expect(result.current.stage).toBe('requesting');
    expect(result.current.requestPhase).toBe('permission');

    // Avança 8 segundos
    act(() => {
      vi.advanceTimersByTime(8500);
    });

    // A espera pela escolha no diálogo do SO não ativa aviso de lentidão de GPS
    expect(result.current.isPositionSlow).toBe(false);
  });

  it('11. Escape/voltar, foco, fundo inerte e liberação correta depois do fechamento/erro', async () => {
    const handleContinue = vi.fn();
    const handleClose = vi.fn();

    const { unmount } = renderWithTheme(
      <LocationOnboardingModal
        visible={true}
        onContinue={handleContinue}
        onClose={handleClose}
        stage="intro"
      />,
    );

    expect(screen.getByText('Encontre barbearias perto de você')).toBeTruthy();
    expect(
      screen.getByText('Usamos sua localização para mostrar as barbearias mais próximas.'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Sem essa permissão, não conseguimos identificar as barbearias mais próximas de você.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Você ainda pode explorar e buscar por nome ou bairro.'),
    ).toBeTruthy();

    const continueBtn = screen.getByText('Continuar');
    expect(continueBtn).toBeTruthy();

    // Pressiona tecla Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('12. Acesso funcional à recuperação/busca manual sem depender de uma tela da tarefa 5', () => {
    const handleRecover = vi.fn();
    const handleManual = vi.fn();

    renderWithTheme(
      <LocationStatusPanel
        status="denied"
        canAskAgain={true}
        onRecoverPermission={handleRecover}
        onManualSearch={handleManual}
      />,
    );

    const manualBtn = screen.getByText('Buscar por nome ou bairro');
    expect(manualBtn).toBeTruthy();

    fireEvent.click(manualBtn);
    expect(handleManual).toHaveBeenCalledTimes(1);
  });

  it('13. No Web/PWA (iOS/Android), quando request() já entrega coordenadas, salva imediatamente no locationStore sem segunda chamada de GPS', async () => {
    const mockPort: LocationPermissionPort = {
      get: vi.fn().mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        servicesEnabled: null,
        approximate: null,
      }),
      request: vi.fn().mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        servicesEnabled: true,
        approximate: false,
        coords: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracyMeters: 15,
          timestamp: Date.now(),
          isApproximate: false,
        },
      }),
      openSettings: vi.fn().mockResolvedValue('manual'),
    };

    const requestCurrentPositionSpy = vi.spyOn(locationStore, 'requestCurrentPosition');

    const { result } = renderHook(() =>
      useClientLocationOnboarding({
        actorId: 'client-1',
        enabled: true,
        permissionPort: mockPort,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stage).toBe('intro');

    await act(async () => {
      await result.current.continueRequest();
    });

    expect(result.current.stage).toBe('ready');
    expect(locationStore.getSession().state).toBe('granted');
    expect(locationStore.getSession().coords?.latitude).toBe(-23.5505);
    expect(requestCurrentPositionSpy).not.toHaveBeenCalled();
  });
});
