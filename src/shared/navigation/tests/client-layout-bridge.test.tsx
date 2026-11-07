// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/shared/theme';
import { ToastProvider } from '@/shared/ui';
import ClientLayoutGroup, { ClientLayoutContent } from '@/app/(client)/_layout';
import {
  ClientExperienceProvider,
  useClientExperienceContext,
  discoveryApi,
  setLocationIntroSeen,
} from '@/features/discovery';

const mockPush = vi.fn();
let mockPathname = '/(client)';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  Stack: Object.assign(
    ({ children }: any) => <div data-testid="mock-stack">{children}</div>,
    { Screen: () => null },
  ),
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    identity: { id: 'client-1', name: 'Lucas Mendes', email: 'lucas@exemplo.com' },
    memberships: [],
    selectedShopId: 'shop-1',
    isOwner: false,
    signOut: vi.fn(),
  }),
}));

function MediaPublisher({ media }: { media: any }) {
  const { publishActiveMedia } = useClientExperienceContext();
  React.useEffect(() => {
    publishActiveMedia(media);
  }, [media, publishActiveMedia]);
  return null;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

describe('ClientLayoutGroup — Fluxo Interativo do CTA Agendar (Tarefa 6)', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPathname = '/(client)';
    queryClient = createTestQueryClient();
    await setLocationIntroSeen(true);
    vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      hasNext: false,
      serverTime: new Date().toISOString(),
    });
  });

  it('sem contexto: ao clicar em Agendar, abre sheet interativo de busca de barbearias', async () => {
    mockPathname = '/(client)';

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ToastProvider>
            <ClientLayoutGroup />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Agendar atendimento/i })).toBeDefined();
    });
    expect(screen.getByText(/Escolha uma barbearia/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar barbearia por nome/i)).toBeDefined();
    expect(
      screen.queryByText(/Escolha uma barbearia e use Serviço ou Catálogo para iniciar a reserva/i),
    ).toBeNull();
  });

  it('com contexto de unidade sem serviço específico (foto ambiental): abre sheet e permite ver catálogo', async () => {
    mockPathname = '/(client)/explore';

    const testMediaAmbiental = {
      shopId: 'shop-def-789',
      shopName: 'Barbearia Vintage',
      mediaId: 'media-002',
      service: null,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ToastProvider>
            <ClientExperienceProvider actorId="client-1">
              <MediaPublisher media={testMediaAmbiental} />
              <ClientLayoutContent />
            </ClientExperienceProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Agendar atendimento/i })).toBeDefined();
    });
    expect(screen.getByText('Barbearia Vintage')).toBeDefined();
    expect(screen.getByText(/Unidade selecionada no feed/i)).toBeDefined();

    const escolherServicoBtn = screen.getByRole('button', { name: /escolher serviço/i });
    fireEvent.click(escolherServicoBtn);

    expect(mockPush).toHaveBeenCalledWith('/barbershops/shop-def-789/services');
  });

  it('com contexto válido de serviço visível: apresenta unidade e serviço e permite continuar para catálogo', async () => {
    mockPathname = '/(client)/explore';

    const testMedia = {
      shopId: 'shop-abc-123',
      shopName: 'Barbearia Modelo',
      mediaId: 'media-001',
      service: {
        id: 'srv-456',
        title: 'Corte e Barba',
        priceInCents: 7500,
        durationInMinutes: 60,
      },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ToastProvider>
            <ClientExperienceProvider actorId="client-1">
              <MediaPublisher media={testMedia} />
              <ClientLayoutContent />
            </ClientExperienceProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Agendar atendimento/i })).toBeDefined();
    });
    expect(screen.getByText('Barbearia Modelo')).toBeDefined();
    expect(screen.getByText('Corte e Barba')).toBeDefined();
    expect(screen.getByText('R$ 75,00')).toBeDefined();

    const continuarBtn = screen.getByRole('button', { name: /continuar/i });
    fireEvent.click(continuarBtn);

    expect(mockPush).toHaveBeenCalledWith('/barbershops/shop-abc-123/services?serviceId=srv-456');
  });

  it('com serviço visível: permite alternar para busca geral de barbearias', async () => {
    mockPathname = '/(client)/explore';

    const testMedia = {
      shopId: 'shop-abc-123',
      shopName: 'Barbearia Modelo',
      mediaId: 'media-001',
      service: {
        id: 'srv-456',
        title: 'Corte e Barba',
        priceInCents: 7500,
        durationInMinutes: 60,
      },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ToastProvider>
            <ClientExperienceProvider actorId="client-1">
              <MediaPublisher media={testMedia} />
              <ClientLayoutContent />
            </ClientExperienceProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /trocar barbearia ou serviço/i })).toBeDefined();
    });

    const trocarBtn = screen.getByRole('button', { name: /trocar barbearia ou serviço/i });
    fireEvent.click(trocarBtn);

    expect(screen.getByText(/Escolha uma barbearia/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Buscar barbearia por nome/i)).toBeDefined();
  });
});
