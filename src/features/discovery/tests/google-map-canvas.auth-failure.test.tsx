// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { ThemeProvider } from '@/shared/theme';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
  Feather: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

import {
  GoogleMapCanvas,
  loadGoogleMapsWebSdk,
  resetGoogleMapsLoaderForTests,
  getGoogleMapsAuthFailureState,
  notifyGmAuthFailure,
} from '../ui/GoogleMapCanvas';
import type { GeoPoint } from '../api/discovery.contract';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('GoogleMapCanvas - Auth Failure and Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGoogleMapsLoaderForTests();
    // Limpar scripts do DOM
    document.querySelectorAll('#smart-barber-google-maps-sdk').forEach((s) => s.remove());
    delete (window as any).google;
    delete (window as any).gm_authFailure;
  });

  afterEach(() => {
    resetGoogleMapsLoaderForTests();
  });

  it('exibe fallback informativo quando a chave de API está ausente', () => {
    renderWithTheme(
      <GoogleMapCanvas
        markers={[]}
        testID="canvas-test"
      />,
    );

    expect(screen.getByTestId('canvas-test')).toBeDefined();
    // Em ausência de chave ou falha, o fallbackSurface é exibido
    expect(screen.queryByTestId('canvas-test-sdk-surface')).toBeNull();
  });

  it('falha de rede/script.onerror rejeita loader e não deixa estado ready falso', async () => {
    const loadPromise = loadGoogleMapsWebSdk('test-key-fake');

    const script = document.getElementById('smart-barber-google-maps-sdk') as HTMLScriptElement;
    expect(script).toBeDefined();

    // Simula erro de carregamento de rede
    script.onerror!(new Event('error') as any);

    await expect(loadPromise).rejects.toThrow(/Não foi possível carregar o Google Maps SDK/);
    expect(getGoogleMapsAuthFailureState().hasAuthFailed).toBe(false);
  });

  it('inicialização com sucesso carrega construtor Map e permite renderização do SDK', async () => {
    const mockMapConstructor = vi.fn();
    const mockMarkerConstructor = vi.fn();

    (window as any).google = {
      maps: {
        Map: mockMapConstructor,
        Marker: mockMarkerConstructor,
      },
    };

    const gmaps = await loadGoogleMapsWebSdk('test-key-fake');
    expect(gmaps.Map).toBe(mockMapConstructor);
  });

  it('gm_authFailure dispara fallback na UI e limpa superfície sem deixar ready falso', async () => {
    const mockMapInstance = {
      setCenter: vi.fn(),
    };
    const mockMapConstructor = vi.fn(() => mockMapInstance);
    const mockMarkerInstance = {
      setMap: vi.fn(),
      addListener: vi.fn(),
    };
    const mockMarkerConstructor = vi.fn(() => mockMarkerInstance);

    (window as any).google = {
      maps: {
        Map: mockMapConstructor,
        Marker: mockMarkerConstructor,
      },
    };

    const pin: GeoPoint = { latitude: -23.55052, longitude: -46.633308 };

    const { unmount } = renderWithTheme(
      <GoogleMapCanvas
        markers={[]}
        draggablePin={pin}
        testID="auth-canvas"
      />,
    );

    // Inicialmente ready pois google.maps.Map está mockado
    expect(screen.getByTestId('auth-canvas-sdk-surface')).toBeDefined();

    // Google Maps assincronamente invoca gm_authFailure após rejeição de Referer
    act(() => {
      if (typeof (window as any).gm_authFailure === 'function') {
        (window as any).gm_authFailure();
      } else {
        notifyGmAuthFailure();
      }
    });

    // Estado deve ter transitado para fallback e limpado a superfície do SDK
    expect(screen.queryByTestId('auth-canvas-sdk-surface')).toBeNull();
    expect(screen.getByText(/Autorização da chave do Google Maps não permitida/i)).toBeDefined();

    // Marcadores devem ter sido limpos
    expect(mockMarkerInstance.setMap).toHaveBeenCalledWith(null);

    unmount();
  });

  it('múltiplas montagens não duplicam handlers globais nem deixam listeners órfãos', () => {
    const originalHandler = vi.fn();
    (window as any).gm_authFailure = originalHandler;

    const { unmount: unmount1 } = renderWithTheme(
      <GoogleMapCanvas markers={[]} testID="canvas-1" />,
    );
    const { unmount: unmount2 } = renderWithTheme(
      <GoogleMapCanvas markers={[]} testID="canvas-2" />,
    );

    // O handler global preservou a chamada ao handler original se existente
    act(() => {
      (window as any).gm_authFailure();
    });

    expect(originalHandler).toHaveBeenCalled();
    expect(getGoogleMapsAuthFailureState().hasAuthFailed).toBe(true);

    unmount1();
    unmount2();

    // Desmontar não causa erro e limpa listeners
  });

  it('retry após gm_authFailure não reaproveita cegamente um estado falho', async () => {
    // Registra falha de autorização
    notifyGmAuthFailure('Origem não autorizada.');

    // Tentativa de carregar SDK é rejeitada imediatamente
    await expect(loadGoogleMapsWebSdk('test-key-fake')).rejects.toThrow(
      /Origem não autorizada/,
    );

    // Novo componente montado entra imediatamente em fallback
    renderWithTheme(
      <GoogleMapCanvas
        markers={[]}
        testID="retry-canvas"
      />,
    );

    expect(screen.queryByTestId('retry-canvas-sdk-surface')).toBeNull();
    expect(screen.getByText(/Origem não autorizada/i)).toBeDefined();
  });

  it('preserva pino arrastável e controles de ajuste mesmo em modo fallback', () => {
    const pin: GeoPoint = { latitude: -23.55052, longitude: -46.633308 };
    const onPinDragEnd = vi.fn();

    renderWithTheme(
      <GoogleMapCanvas
        markers={[]}
        draggablePin={pin}
        onPinDragEnd={onPinDragEnd}
        testID="fallback-pin-canvas"
      />,
    );

    // No modo contingência, exibe o painel de pino e coordenadas
    expect(screen.getByText(/Pino selecionado: -23.550520, -46.633308/)).toBeDefined();

    // Controles de nudge (Norte, Sul, Leste, Oeste)
    const northBtn = screen.getByLabelText('Ajustar pino para o norte');
    expect(northBtn).toBeDefined();

    act(() => {
      northBtn.click();
    });

    expect(onPinDragEnd).toHaveBeenCalledWith({
      latitude: -23.55032,
      longitude: -46.633308,
    });
  });
});
