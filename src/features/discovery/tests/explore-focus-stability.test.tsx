// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import ClientExploreScreen from '@/app/(client)/explore';
import {
  ClientExperienceProvider,
  useClientExperienceContext,
} from '../model/client-experience-context';
import { exploreFeedApi } from '../api/explore-feed.api';
import { discoveryApi } from '../api/discovery.api';
import { ClientNavigationShell } from '@/shared/navigation/ClientNavigationShell';
import * as StackRouterModule from 'expo-router/build/react-navigation/routers/StackRouter';
import ClientLayoutGroup from '@/app/(client)/_layout';

const mockPush = vi.fn();
const mockSetParams = vi.fn();
let mockSearchParams: Record<string, any> = {};
let mockPathname = '/(client)/explore';
let mockIsFocused = true;

const capturedStackScreens: Array<{ name: string; dangerouslySingular?: any; getId?: any }> = [];

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    setParams: mockSetParams,
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
  useIsFocused: () => mockIsFocused,
  Stack: Object.assign(
    ({ children }: any) => <div data-testid="mock-stack">{children}</div>,
    {
      Screen: (props: any) => {
        capturedStackScreens.push(props);
        return null;
      },
    },
  ),
}));

const mockVideoPlay = vi.fn();
const mockVideoPause = vi.fn();
let activeVideoPropsList: Array<{ url: string; active: boolean }> = [];

vi.mock('@/features/discovery/ui/ExploreVideo', () => ({
  ExploreVideo: (props: { url: string; poster?: string; active: boolean }) => {
    React.useEffect(() => {
      activeVideoPropsList.push({ url: props.url, active: props.active });
      if (props.active) {
        mockVideoPlay(props.url);
      } else {
        mockVideoPause(props.url);
      }
      return () => {
        mockVideoPause(props.url);
      };
    }, [props.active, props.url]);
    return (
      <div
        data-testid="explore-video-player"
        data-url={props.url}
        data-active={String(props.active)}
      />
    );
  },
}));

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
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    status: 'authenticated',
    identity: { id: 'client-1', name: 'Cliente Teste', email: 'cliente@teste.com' },
    memberships: [],
    selectedShopId: 'shop-1',
    isOwner: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/features/reviews/ui/BarbershopReviewsList', () => ({
  BarbershopReviewsList: () => <div data-testid="mock-reviews-list">Reviews</div>,
}));

vi.mock('@/features/services/model/use-public-services', () => ({
  usePublicServices: () => ({
    services: [],
    isLoading: false,
    selectedIds: [],
    toggleService: vi.fn(),
    isHandoffModalOpen: false,
    setIsHandoffModalOpen: vi.fn(),
    totalSelectedCents: 0,
    totalDurationMinutes: 0,
  }),
}));

function ExperienceProbe({
  onSnapshot,
}: {
  onSnapshot: (state: ReturnType<typeof useClientExperienceContext>) => void;
}) {
  const ctx = useClientExperienceContext();
  React.useEffect(() => {
    onSnapshot(ctx);
  }, [ctx, onSnapshot]);
  return null;
}

const VIDEO_FEED_FIXTURE = {
  items: [
    {
      barbershop: {
        id: 'shop-video-1',
        slug: 'barbearia-video-1',
        name: 'Barbearia Vídeo Imersivo',
        location: 'Vila Madalena, São Paulo',
        logoUrl: null,
        rating: 4.9,
        reviewCount: 24,
        googleMapsUrl: null,
      },
      distanceMeters: 350,
      distanceBasis: 'user' as const,
      rankingScore: {
        score: 0.94,
        distanceComponent: 0.9,
        reputationComponent: 0.98,
        bayesRating: 4.88,
      },
      media: [
        {
          id: 'media-vid-1',
          kind: 'service' as const,
          mediaId: 'asset-vid-1',
          serviceId: 'srv-vid-1',
          url: 'https://cdn.example.com/corte-video.mp4',
          posterUrl: 'https://cdn.example.com/corte-poster.jpg',
          mimeType: 'video/mp4',
          width: 1080,
          height: 1920,
          alt: 'Vídeo de Corte Degradê',
          service: {
            id: 'srv-vid-1',
            title: 'Corte Degradê Navalhado',
            priceInCents: 6500,
            durationInMinutes: 45,
          },
        },
        {
          id: 'media-img-2',
          kind: 'service' as const,
          mediaId: 'asset-img-2',
          serviceId: 'srv-img-2',
          url: 'https://cdn.example.com/barba.jpg',
          mimeType: 'image/jpeg',
          width: 1080,
          height: 1920,
          alt: 'Barba Clássica',
          service: {
            id: 'srv-img-2',
            title: 'Barba Clássica',
            priceInCents: 4500,
            durationInMinutes: 30,
          },
        },
      ],
    },
  ],
  nextCursor: null,
  hasNext: false,
  total: 1,
  rankingVersion: 'v1',
  snapshotExpiresAt: new Date().toISOString(),
};

describe('Estabilidade de Foco, Mídia e Histórico do Feed (F0/F1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = {};
    mockPathname = '/(client)/explore';
    mockIsFocused = true;
    activeVideoPropsList = [];
    capturedStackScreens.length = 0;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('pausa vídeo imediatamente e retira publicação de mídia ativa quando a rota explore perde foco, preservando snapshot de reserva e restaurando ao voltar', async () => {
    vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValue(VIDEO_FEED_FIXTURE as any);
    vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      hasNext: false,
      serverTime: new Date().toISOString(),
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const latestCtxRef: { current: ReturnType<typeof useClientExperienceContext> | null } = {
      current: null,
    };

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientExperienceProvider actorId="client-1">
            <ExperienceProbe onSnapshot={(ctx) => (latestCtxRef.current = ctx)} />
            <ClientExploreScreen />
          </ClientExperienceProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Barbearia Vídeo Imersivo')).toBeTruthy();
    expect(await screen.findByTestId('explore-video-player')).toBeTruthy();
    expect(mockVideoPlay).toHaveBeenCalledWith('https://cdn.example.com/corte-video.mp4');
    expect(latestCtxRef.current?.activeMedia).toEqual({
      shopId: 'shop-video-1',
      shopName: 'Barbearia Vídeo Imersivo',
      mediaId: 'media-vid-1',
      service: {
        id: 'srv-vid-1',
        title: 'Corte Degradê Navalhado',
        priceInCents: 6500,
        durationInMinutes: 45,
      },
    });

    // Inicia reserva para capturar snapshot imutável antes de perder foco
    act(() => {
      latestCtxRef.current?.requestBooking();
    });
    expect(latestCtxRef.current?.bookingStart).toEqual({
      kind: 'contextual',
      context: {
        shopId: 'shop-video-1',
        shopName: 'Barbearia Vídeo Imersivo',
        mediaId: 'media-vid-1',
        service: {
          id: 'srv-vid-1',
          title: 'Corte Degradê Navalhado',
          priceInCents: 6500,
          durationInMinutes: 45,
        },
      },
    });
    act(() => {
      latestCtxRef.current?.closeBooking();
    });

    // Simula perda de foco da rota explore (usuário navegou para /(client)/bookings ou /(client)/profile no Stack)
    mockIsFocused = false;
    mockPathname = '/(client)/bookings';
    mockVideoPause.mockClear();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientExperienceProvider actorId="client-1">
            <ExperienceProbe onSnapshot={(ctx) => (latestCtxRef.current = ctx)} />
            <ClientExploreScreen />
          </ClientExperienceProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // O player de vídeo deve ser pausado/desativado e a mídia ativa não deve continuar publicada fora de foco
    expect(screen.queryByTestId('explore-video-player')).toBeNull();
    expect(mockVideoPause).toHaveBeenCalledWith('https://cdn.example.com/corte-video.mp4');
    expect(latestCtxRef.current?.activeMedia).toBeNull();

    // Ao recuperar foco para /(client)/explore, restaura a instância única do feed e republica a mídia ativa
    mockIsFocused = true;
    mockPathname = '/(client)/explore';
    mockVideoPlay.mockClear();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientExperienceProvider actorId="client-1">
            <ExperienceProbe onSnapshot={(ctx) => (latestCtxRef.current = ctx)} />
            <ClientExploreScreen />
          </ClientExperienceProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const players = await screen.findAllByTestId('explore-video-player');
    expect(players).toHaveLength(1);
    expect(mockVideoPlay).toHaveBeenCalledWith('https://cdn.example.com/corte-video.mp4');
    expect(latestCtxRef.current?.activeMedia?.shopId).toBe('shop-video-1');
  });

  it('pausa vídeo quando o documento fica oculto (visibilitychange -> hidden) e retoma ao voltar a visible', async () => {
    vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValue(VIDEO_FEED_FIXTURE as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const latestCtxRef: { current: ReturnType<typeof useClientExperienceContext> | null } = {
      current: null,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientExperienceProvider actorId="client-1">
            <ExperienceProbe onSnapshot={(ctx) => (latestCtxRef.current = ctx)} />
            <ClientExploreScreen />
          </ClientExperienceProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId('explore-video-player')).toBeTruthy();

    mockVideoPause.mockClear();
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.queryByTestId('explore-video-player')).toBeNull();
    expect(mockVideoPause).toHaveBeenCalledWith('https://cdn.example.com/corte-video.mp4');
    expect(latestCtxRef.current?.activeMedia).toBeNull();

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByTestId('explore-video-player')).toBeTruthy();
    expect(latestCtxRef.current?.activeMedia?.shopId).toBe('shop-video-1');
  });

  it('não empilha navegação redundante ao tocar na aba já ativa da cápsula e mantém histórico limitado após 30 alternâncias explore <-> bookings', () => {
    mockPathname = '/(client)/explore';

    render(
      <ThemeProvider initialMode="dark">
        <ClientNavigationShell>
          <div>Conteúdo</div>
        </ClientNavigationShell>
      </ThemeProvider>,
    );

    // Tocar repetidamente na aba já selecionada ('Explorar') não deve disparar router.push
    const exploreTab = screen.getByRole('tab', { name: /Explorar, selecionado/i });
    fireEvent.click(exploreTab);
    fireEvent.click(exploreTab);
    expect(mockPush).not.toHaveBeenCalled();

    // Tocar em uma aba inativa ('Meus agendamentos') dispara navegação normalmente
    const bookingsTab = screen.getByRole('tab', { name: /Meus agendamentos/i });
    fireEvent.click(bookingsTab);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/(client)/bookings');

    // Verifica que a configuração real de Stack.Screen do (client)/_layout deduplica 30 alternâncias no StackRouter
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientLayoutGroup />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const routeNames = ['index', 'explore', 'bookings', 'notifications', 'profile'];
    const routeGetIdList: Record<string, any> = {};
    for (const screenProps of capturedStackScreens) {
      if (screenProps.dangerouslySingular) {
        routeGetIdList[screenProps.name] =
          typeof screenProps.dangerouslySingular === 'function'
            ? screenProps.dangerouslySingular
            : () => screenProps.name;
      } else if (screenProps.getId) {
        routeGetIdList[screenProps.name] = screenProps.getId;
      }
    }

    const createStackRouter =
      (StackRouterModule as any).StackRouter ??
      (StackRouterModule as any).default?.StackRouter;
    const baseRouter = createStackRouter({} as any);
    let state: any = {
      type: 'stack',
      key: 'stack-client',
      routeKeySeq: 1,
      index: 0,
      routeNames,
      routes: [{ key: 'explore-0', name: 'explore', params: {} }],
      stale: false,
    };

    for (let i = 0; i < 30; i += 1) {
      const target = i % 2 === 0 ? 'bookings' : 'explore';
      const action = { type: 'PUSH', payload: { name: target, params: {} } } as any;
      const result: any = baseRouter.getStateForAction(state, action, {
        routeNames,
        routeParamList: {},
        routeGetIdList,
      });
      state = result?.state ?? result ?? state;
    }

    expect(state.routes.length).toBeLessThanOrEqual(3);
    expect(state.routes.filter((r: any) => r.name === 'explore')).toHaveLength(1);
    expect(state.routes.filter((r: any) => r.name === 'bookings')).toHaveLength(1);
  });
});
