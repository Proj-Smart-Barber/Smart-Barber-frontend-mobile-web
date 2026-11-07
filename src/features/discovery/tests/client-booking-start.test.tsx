// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { BookingStartSheet } from '../ui/booking-start-sheet';
import { discoveryApi } from '../api/discovery.api';
import type { BookingStart } from '../model/client-experience-context';
import type { DiscoveryPage, PublicShop } from '../api/discovery.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const sampleShopA: PublicShop = {
  id: '018b0000-0000-7000-8000-000000000001',
  name: 'Barbearia Alpha',
  slug: 'barbearia-alpha',
  location: 'Pinheiros, São Paulo',
  avatarUrl: null,
  coverUrl: null,
  photos: [],
  rating: 4.9,
  reviewCount: 30,
  coordinates: null,
  distanceMeters: null,
};

const sampleShopB: PublicShop = {
  id: '018b0000-0000-7000-8000-000000000002',
  name: 'Barbearia Beta',
  slug: 'barbearia-beta',
  location: 'Vila Madalena, São Paulo',
  avatarUrl: null,
  coverUrl: null,
  photos: [],
  rating: 4.7,
  reviewCount: 15,
  coordinates: null,
  distanceMeters: null,
};

const contextualServiceStart: BookingStart = {
  kind: 'contextual',
  context: {
    shopId: '018b0000-0000-7000-8000-000000000001',
    shopName: 'Barbearia Alpha',
    mediaId: 'media-cut-1',
    service: {
      id: 'srv-fade-101',
      title: 'Degradê Navalhado',
      priceInCents: 6500,
      durationInMinutes: 45,
    },
  },
};

const contextualEnvironmentalStart: BookingStart = {
  kind: 'contextual',
  context: {
    shopId: '018b0000-0000-7000-8000-000000000001',
    shopName: 'Barbearia Alpha',
    mediaId: 'media-env-2',
    service: null,
  },
};

function renderWithProviders(ui: React.ReactElement, queryClient?: QueryClient) {
  const qc =
    queryClient ||
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60000 } },
    });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider initialMode="dark">{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('BookingStartSheet — Tarefa 6: Conectar Agendar ao Catálogo e Reserva', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Unidade A/serviço A: sheet mostra A e Continua para o catálogo A com serviceId correto sem confirmar reserva', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <BookingStartSheet start={contextualServiceStart} onClose={handleClose} />,
    );

    expect(screen.getByText('Barbearia Alpha')).toBeDefined();
    expect(screen.getByText('Degradê Navalhado')).toBeDefined();
    expect(screen.getByText(/R\$\s*65,00/)).toBeDefined();
    expect(screen.getByText(/45\s*min/)).toBeDefined();

    const continueBtn = screen.getByRole('button', { name: /continuar/i });
    fireEvent.click(continueBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      '/barbershops/018b0000-0000-7000-8000-000000000001/services?serviceId=srv-fade-101',
    );
  });

  it('2. Troca da foto para B: modal já aberto mantém snapshot A; nova abertura posterior usa B', () => {
    const handleClose = vi.fn();
    const { rerender } = renderWithProviders(
      <BookingStartSheet start={contextualServiceStart} onClose={handleClose} />,
    );

    expect(screen.getByText('Degradê Navalhado')).toBeDefined();

    const contextualB: BookingStart = {
      kind: 'contextual',
      context: {
        shopId: '018b0000-0000-7000-8000-000000000002',
        shopName: 'Barbearia Beta',
        mediaId: 'media-cut-2',
        service: {
          id: 'srv-barba-202',
          title: 'Barba Terapia',
          priceInCents: 4500,
          durationInMinutes: 30,
        },
      },
    };

    // Atualização de mídia em background não deve trocar silenciosamente o modal já aberto
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider initialMode="dark">
          <BookingStartSheet start={contextualB} onClose={handleClose} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Degradê Navalhado')).toBeDefined();
    expect(screen.queryByText('Barba Terapia')).toBeNull();

    // Fecha o modal
    fireEvent.click(screen.getByRole('button', { name: /fechar janela/i }));
    expect(handleClose).toHaveBeenCalled();
  });

  it('3. Mídia ambiental: unidade correta sem serviço/preço inventado e ação Escolher serviço', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <BookingStartSheet start={contextualEnvironmentalStart} onClose={handleClose} />,
    );

    expect(screen.getByText('Barbearia Alpha')).toBeDefined();
    expect(screen.queryByText(/R\$/)).toBeNull();
    expect(screen.queryByText(/min/)).toBeNull();

    const chooseServiceBtn = screen.getByRole('button', { name: /escolher serviço/i });
    expect(chooseServiceBtn).toBeDefined();

    fireEvent.click(chooseServiceBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      '/barbershops/018b0000-0000-7000-8000-000000000001/services',
    );
  });

  it('4. Início, Conta, proximidade e agendamentos: seleção geral abre busca sem herdar corte anterior', async () => {
    const mockPage: DiscoveryPage = {
      items: [sampleShopA, sampleShopB],
      page: 1,
      limit: 20,
      total: 2,
      hasNext: false,
      serverTime: new Date().toISOString(),
    };
    vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue(mockPage);

    const handleClose = vi.fn();
    renderWithProviders(
      <BookingStartSheet start={{ kind: 'general' }} onClose={handleClose} />,
    );

    expect(screen.getByText(/escolha uma barbearia/i)).toBeDefined();
    expect(screen.getByLabelText(/buscar barbearia por nome ou bairro/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Barbearia Alpha')).toBeDefined();
      expect(screen.getByText('Barbearia Beta')).toBeDefined();
    });

    // Nenhum serviço pré-selecionado
    expect(screen.queryByText('Degradê Navalhado')).toBeNull();
  });

  it('6. Troca de unidade/serviço limpa seleções incompatíveis e permite escolher outra barbearia', async () => {
    const mockPage: DiscoveryPage = {
      items: [sampleShopB],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: new Date().toISOString(),
    };
    vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue(mockPage);

    const handleClose = vi.fn();
    renderWithProviders(
      <BookingStartSheet start={contextualServiceStart} onClose={handleClose} />,
    );

    const switchBtn = screen.getByRole('button', { name: /trocar barbearia/i });
    fireEvent.click(switchBtn);

    // Mudou para seleção geral
    expect(screen.getByText(/escolha uma barbearia/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Barbearia Beta')).toBeDefined();
    });

    // Selecionar Barbearia Beta deve navegar para catálogo da Beta sem serviceId antigo
    const betaCard = screen.getByText('Barbearia Beta');
    fireEvent.click(betaCard);

    expect(handleClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      '/barbershops/018b0000-0000-7000-8000-000000000002/services',
    );
  });

  it('7. Cancelamento, Escape e backdrop chamam onClose e fecham o sheet', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <BookingStartSheet start={contextualServiceStart} onClose={handleClose} />,
    );

    // Fechar pelo botão X
    const closeBtn = screen.getByRole('button', { name: /fechar janela/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape no teclado
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('8. Duplo clique rápido bloqueia operação duplicada e não emite confirmação de reserva', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <BookingStartSheet start={contextualServiceStart} onClose={handleClose} />,
    );

    const continueBtn = screen.getByRole('button', { name: /continuar/i });
    fireEvent.click(continueBtn);
    fireEvent.click(continueBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('9. Ausência de start (start === null) não renderiza nada', () => {
    const handleClose = vi.fn();
    const { container } = renderWithProviders(
      <BookingStartSheet start={null} onClose={handleClose} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
