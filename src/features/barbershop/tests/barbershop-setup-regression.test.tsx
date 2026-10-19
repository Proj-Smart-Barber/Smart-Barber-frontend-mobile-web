// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Alert: ({ message }: any) => <div>{message}</div>,
  Button: ({ title, onPress, disabled, loading, testID }: any) => (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      data-testid={testID}
    >
      {title}
    </button>
  ),
  FormField: ({ label, error, children }: any) => (
    <div>
      <label>{label}</label>
      {children}
      {error ? <span>{error}</span> : null}
    </div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  TextInput: ({ placeholder, value, onChangeText, onBlur }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChangeText?.(e.target.value)}
      onBlur={onBlur}
    />
  ),
}));

const mockReplace = vi.fn();
const mockPush = vi.fn();

const fixture = vi.hoisted(() => ({
  session: {
    status: 'authenticated',
    token: 'jwt-owner',
    identity: { id: '11111111-1111-4111-8111-111111111111' },
    barbershop: null,
    registerBarbershop: vi.fn(),
    signOut: vi.fn(),
  },
  store: {
    listReferences: vi.fn(),
    save: vi.fn(),
    read: vi.fn(),
    clearResolved: vi.fn(),
  },
}));

vi.mock('react-native-maps', () => ({
  default: () => null,
  MapView: () => null,
  Marker: () => null,
  PROVIDER_GOOGLE: 'google',
}));

vi.mock('expo', () => ({
  requireOptionalNativeModule: () => ({}),
  requireNativeModule: () => ({}),
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
}));

vi.mock('expo-modules-core', () => {
  class MockEventEmitter {
    addListener = vi.fn(() => ({ remove: vi.fn() }));
    removeListener = vi.fn();
    removeAllListeners = vi.fn();
    emit = vi.fn();
  }
  return {
    EventEmitter: MockEventEmitter,
    NativeModulesProxy: {},
    requireNativeModule: () => ({}),
    requireNativeViewManager: () => () => null,
    Platform: { OS: 'web' },
  };
});

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  Feather: () => null,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock('@/features/auth', () => ({
  useSession: () => fixture.session,
}));

vi.mock('@/shared/operations/operation-attempt-store', () => ({
  createOperationAttemptStore: () => fixture.store,
  operationAttemptStore: fixture.store,
}));

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { sm: 4, md: 8, lg: 12 },
    colors: {
      brand: { primary: '#BD2026', silver: '#7C879F' },
      text: { primary: '#FFF', secondary: '#CCC', muted: '#888' },
      background: { primary: '#121212', card: '#1E1E1E' },
      surface: { input: '#252525' },
      border: { subtle: '#333' },
      feedback: {
        error: '#F00',
        errorBackground: '#300',
        errorBorder: '#500',
        success: '#0F0',
        successBackground: '#030',
        successBorder: '#050',
      },
    },
    isDark: true,
  }),
  useReducedMotion: () => false,
  useReducedTransparency: () => false,
}));

vi.mock('@/features/discovery/ui/GoogleMapCanvas', () => ({
  GoogleMapCanvas: () => <div data-testid="google-map-canvas" />,
}));

vi.mock('@/shared/brand', () => ({
  BrandMark: () => <div data-testid="brand-mark" />,
}));

vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children }: any) => <div>{children}</div>,
}));

import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import BarbershopSetupScreen from '@/app/(app)/barbershop-setup';
import {
  barbershopLocationApi,
  LocationResponseParsingError,
} from '../api/barbershop-location.api';
import { serverClock } from '@/features/bookings/lib/server-clock';

describe('BarbershopSetupScreen - Regressões de Segurança de Onboarding', () => {
  const createdShop = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Barbearia Modelo',
  };

  const sampleCandidate = {
    candidateId: '33333333-3333-4333-8333-333333333333',
    displayAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    point: { latitude: -23.5615, longitude: -46.6559 },
    expiresAt: '2099-01-01T00:00:00Z',
    attribution: 'Google Maps' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fixture.session.barbershop = null;
    fixture.session.registerBarbershop.mockImplementation(async () => {
      fixture.session.barbershop = createdShop as any;
      return createdShop;
    });
    fixture.store.listReferences.mockResolvedValue([]);
    fixture.store.save.mockResolvedValue(undefined);
    fixture.store.clearResolved.mockResolvedValue(undefined);

    vi.spyOn(barbershopLocationApi, 'searchAddress').mockResolvedValue({
      candidates: [sampleCandidate],
    });
    vi.spyOn(barbershopLocationApi, 'getLocation').mockResolvedValue({
      shopId: createdShop.id,
      address: 'Av. Paulista, 1000',
      status: 'UNCONFIRMED',
      source: 'MANUAL',
      version: 0,
      point: null,
      confirmedAt: null,
      acquiredAt: null,
      validUntil: null,
      lastOwnerMutation: null,
    });
    vi.spyOn(barbershopLocationApi, 'updateLocation').mockResolvedValue({
      shopId: createdShop.id,
      address: sampleCandidate.displayAddress,
      status: 'CONFIRMED',
      source: 'GOOGLE',
      version: 1,
      point: sampleCandidate.point,
      confirmedAt: '2026-10-19T12:00:00Z',
      acquiredAt: '2026-10-19T12:00:00Z',
      validUntil: null,
      lastOwnerMutation: null,
    });

    serverClock.clear();
    serverClock.syncWithServer('2026-10-19T12:00:00.000Z');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    serverClock.clear();
  });

  async function fillAndSelectCandidate() {
    render(<BarbershopSetupScreen />);

    // Preenche campos obrigatórios
    const nameInput = screen.getByPlaceholderText('Ex: Barbearia Elite');
    const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');
    const locationInput = screen.getByPlaceholderText('Ex: Av. Paulista, 1000 - São Paulo, SP');

    fireEvent.change(nameInput, { target: { value: 'Barbearia Modelo' } });
    fireEvent.change(cnpjInput, { target: { value: '11.222.333/0001-81' } });
    fireEvent.change(locationInput, { target: { value: 'Av. Paulista, 1000' } });

    // Busca no mapa
    const searchBtn = screen.getByText('Validar endereço no Google Maps');
    await act(async () => {
      fireEvent.click(searchBtn);
    });

    await waitFor(() => {
      expect(barbershopLocationApi.searchAddress).toHaveBeenCalled();
    });
  }

  it('unidade criada com storage de tentativas indisponível: não envia PATCH, mantém aviso visível e não redireciona', async () => {
    fixture.store.listReferences.mockRejectedValueOnce(new Error('Storage indisponível'));
    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    // Fail closed: não envia PATCH
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();

    // Mensagem orientando conclusão em Configurações
    expect(
      screen.getByText(/Barbearia criada com sucesso! Falha ao consultar o armazenamento local/),
    ).toBeTruthy();

    // Sessão atualizada com a barbearia criada NÃO causa redirecionamento automático
    expect(mockReplace).not.toHaveBeenCalledWith('/(app)');

    // Botão de ação explícita para configurações está disponível
    expect(screen.getByText('Ir para Configurações')).toBeTruthy();
  });

  it('ação explícita para Configurações: navega ao destino sem duplicar cadastro ou confirmação', async () => {
    fixture.store.listReferences.mockRejectedValueOnce(new Error('Storage indisponível'));
    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Ir para Configurações')).toBeTruthy();
    });

    // Clica no botão explícito para Configurações
    const settingsBtn = screen.getByText('Ir para Configurações');
    await act(async () => {
      fireEvent.click(settingsBtn);
    });

    // Navega para Configurações sem dados privados na URL
    expect(mockPush).toHaveBeenCalledWith('/(app)/settings');
    expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });

  it('tentativa incerta prévia encontrada no storage: não gera novo envio e orienta reconciliação em Configurações', async () => {
    fixture.store.listReferences.mockResolvedValueOnce([
      {
        actorId: fixture.session.identity.id,
        requestId: 'mutation-existing-123',
        operation: 'UPDATE_LOCATION',
        resourceKind: 'LOCATION',
        resourceId: createdShop.id,
        status: 'uncertain',
      },
    ]);

    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    // Não envia PATCH com nova chave
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Barbearia criada com sucesso! Já existe uma confirmação de localização em andamento/),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith('/(app)');
    expect(screen.getByText('Ir para Configurações')).toBeTruthy();
  });

  it('relógio não sincronizado com servidor: bloqueia envio de PATCH e orienta conclusão posterior', async () => {
    serverClock.clear(); // Descalibra o relógio

    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Barbearia criada com sucesso! O relógio não está sincronizado/),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith('/(app)');
    expect(screen.getByText('Ir para Configurações')).toBeTruthy();
  });

  it('falha ao salvar a tentativa localmente antes do PATCH: fail-closed, não envia PATCH', async () => {
    fixture.store.save.mockRejectedValueOnce(new Error('Disk full'));

    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Barbearia criada com sucesso! Falha ao salvar a tentativa localmente/),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith('/(app)');
    expect(screen.getByText('Ir para Configurações')).toBeTruthy();
  });

  it('preserva createdShopId e não repete registerBarbershop em cliques subsequentes', async () => {
    fixture.store.save.mockRejectedValueOnce(new Error('Storage failure'));

    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    // Segundo clique após erro de storage: registerBarbershop não é repetido
    fixture.store.save.mockResolvedValueOnce(undefined);
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Não deve chamar registerBarbershop novamente! Apenas 1 criação.
    expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });

  it('timeout ou resposta 2xx incompatível na confirmação: referência incerta preservada e nenhum reenvio indevido', async () => {
    vi.spyOn(barbershopLocationApi, 'updateLocation').mockRejectedValueOnce(
      new LocationResponseParsingError('Resposta 2xx não compatível com o schema'),
    );

    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    expect(barbershopLocationApi.updateLocation).toHaveBeenCalledTimes(1);

    // Tentativa é gravada como uncertain no storage
    expect(fixture.store.save).toHaveBeenCalledWith(
      fixture.session.identity.id,
      expect.objectContaining({
        status: 'uncertain',
        resourceId: createdShop.id,
        operation: 'UPDATE_LOCATION',
      }),
    );

    // Mensagem de pendência preservada e visível
    expect(
      screen.getByText(/Barbearia criada com sucesso! A confirmação de endereço no mapa ficou pendente/),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalledWith('/(app)');
    expect(screen.getByText('Ir para Configurações')).toBeTruthy();

    // Nova tentativa de clique reutiliza a barbearia sem novo cadastro
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
  });

  it('confirmação bem-sucedida: navegação normal para /(app) ocorre', async () => {
    await fillAndSelectCandidate();

    const submitBtn = screen.getByText('Cadastrar Barbearia');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fixture.session.registerBarbershop).toHaveBeenCalledTimes(1);
    });

    expect(barbershopLocationApi.updateLocation).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });
  });

  it('entrada na rota já com unidade cadastrada: redirecionamento previsto continua funcionando', async () => {
    fixture.session.barbershop = createdShop as any;
    render(<BarbershopSetupScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });
    expect(fixture.session.registerBarbershop).not.toHaveBeenCalled();
    expect(barbershopLocationApi.updateLocation).not.toHaveBeenCalled();
  });
});
