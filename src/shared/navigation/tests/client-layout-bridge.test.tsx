// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { ThemeProvider } from '@/shared/theme';
import { ToastProvider } from '@/shared/ui';
import ClientLayoutGroup, { ClientLayoutContent } from '@/app/(client)/_layout';
import { ClientExperienceProvider, useClientExperienceContext } from '@/features/discovery';

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

describe('ClientLayoutGroup — Ponte Transitória do CTA Agendar (Tarefa 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/(client)';
  });

  it('sem contexto (fora do feed): encaminha para /(client)/explore e exibe orientação de escolha', () => {
    mockPathname = '/(client)';

    render(
      <ThemeProvider initialMode="dark">
        <ToastProvider>
          <ClientLayoutGroup />
        </ToastProvider>
      </ThemeProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    expect(mockPush).toHaveBeenCalledWith('/(client)/explore');
    expect(screen.getByText(/Escolha uma barbearia e use Serviço ou Catálogo para iniciar a reserva/i)).toBeDefined();
  });

  it('sem contexto mas já no Explorar: não empilha /(client)/explore novamente e exibe orientação', () => {
    mockPathname = '/(client)/explore';

    render(
      <ThemeProvider initialMode="dark">
        <ToastProvider>
          <ClientLayoutGroup />
        </ToastProvider>
      </ThemeProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    // Não deve chamar push para explore novamente
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText(/Escolha uma barbearia e use Serviço ou Catálogo para iniciar a reserva/i)).toBeDefined();
  });

  it('com contexto válido de mídia no feed: encaminha ao catálogo com serviceId pré-selecionado', () => {
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
      <ThemeProvider initialMode="dark">
        <ToastProvider>
          <ClientExperienceProvider actorId="client-1">
            <MediaPublisher media={testMedia} />
            <ClientLayoutContent />
          </ClientExperienceProvider>
        </ToastProvider>
      </ThemeProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    expect(mockPush).toHaveBeenCalledWith('/barbershops/shop-abc-123/services?serviceId=srv-456');
  });

  it('com contexto de unidade sem serviço específico: encaminha ao catálogo geral da barbearia', () => {
    mockPathname = '/(client)/explore';

    const testMediaAmbiental = {
      shopId: 'shop-def-789',
      shopName: 'Barbearia Vintage',
      mediaId: 'media-002',
      service: null,
    };

    render(
      <ThemeProvider initialMode="dark">
        <ToastProvider>
          <ClientExperienceProvider actorId="client-1">
            <MediaPublisher media={testMediaAmbiental} />
            <ClientLayoutContent />
          </ClientExperienceProvider>
        </ToastProvider>
      </ThemeProvider>,
    );

    const agendarBtn = screen.getByRole('button', { name: /Agendar/i });
    fireEvent.click(agendarBtn);

    expect(mockPush).toHaveBeenCalledWith('/barbershops/shop-def-789/services');
  });
});
