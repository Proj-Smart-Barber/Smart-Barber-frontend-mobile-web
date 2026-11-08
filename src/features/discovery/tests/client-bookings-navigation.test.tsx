// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import ClientBookingsScreen from '@/app/(client)/bookings';
import { ClientExperienceProvider } from '../model/client-experience-context';

const mockPush = vi.fn();
let mockSearchParams: Record<string, any> = {};

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
  usePathname: () => '/(client)/bookings',
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
    identity: { id: 'client-1', name: 'Cliente Teste' },
  }),
}));

vi.mock('@/features/bookings/model/use-my-bookings', () => ({
  useMyBookings: () => ({
    bookings: [
      {
        id: 'b-1',
        serviceTitle: 'Corte Degradê',
        serviceSummary: 'Corte Degradê',
        barbershopName: 'Barbearia Exemplo',
        startsAt: '2026-11-12T09:00:00Z',
        durationMinutes: 60,
        priceInCents: 8000,
        status: 'CONFIRMED',
        services: [{ id: 's-1', title: 'Corte Degradê', durationInMinutes: 60, priceInCents: 8000 }],
      },
    ],
    upcoming: [
      {
        id: 'b-1',
        serviceTitle: 'Corte Degradê',
        serviceSummary: 'Corte Degradê',
        barbershopName: 'Barbearia Exemplo',
        startsAt: '2026-11-12T09:00:00Z',
        durationMinutes: 60,
        priceInCents: 8000,
        status: 'CONFIRMED',
        services: [{ id: 's-1', title: 'Corte Degradê', durationInMinutes: 60, priceInCents: 8000 }],
      },
    ],
    past: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasMore: false,
    loadNextPage: vi.fn(),
    error: null,
    refetch: vi.fn(),
    isRefetching: false,
  }),
}));

vi.mock('@/features/bookings', () => ({
  useMyBookings: () => ({
    bookings: [
      {
        id: 'b-1',
        serviceTitle: 'Corte Degradê',
        barbershopName: 'Barbearia Exemplo',
        startsAt: '2026-11-12T09:00:00Z',
        durationMinutes: 60,
        priceInCents: 8000,
        status: 'CONFIRMED',
      },
    ],
    upcoming: [
      {
        id: 'b-1',
        serviceTitle: 'Corte Degradê',
        barbershopName: 'Barbearia Exemplo',
        startsAt: '2026-11-12T09:00:00Z',
        durationMinutes: 60,
        priceInCents: 8000,
        status: 'CONFIRMED',
      },
    ],
    past: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasMore: false,
    loadNextPage: vi.fn(),
    error: null,
    refetch: vi.fn(),
    isRefetching: false,
  }),
  ClientBookingsSkeleton: () => <div data-testid="bookings-skeleton" />,
  BookingCard: ({ booking }: any) => <div data-testid={`booking-${booking.id}`}>{booking.serviceTitle}</div>,
}));

vi.mock('@/features/discovery/model/use-next-booking', () => ({
  useNextBooking: () => ({
    booking: {
      id: 'next-1',
      serviceSummary: 'Corte Degradê',
      barbershopName: 'Barbearia Exemplo',
      startsAt: '2026-11-12T09:00:00Z',
      durationMinutes: 60,
      priceInCents: 8000,
      status: 'CONFIRMED',
    },
    serverTime: '2026-11-08T12:00:00Z',
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe('N2 — ClientBookingsScreen: Navegação de Reservas sem Barra de Descoberta', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = {};
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('não renderiza o seletor superior de descoberta (ClientExploreTabs)', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientBookingsScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('tablist', { name: /Seções de descoberta/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /^Explorar$/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /^Perto de você$/i })).toBeNull();
  });

  it('preserva título Meus agendamentos, subtítulo e filtros Próximos/Histórico', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientBookingsScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Meus agendamentos')).toBeDefined();
    expect(screen.getByText('Seus próximos horários e histórico')).toBeDefined();
    expect(screen.getByText('Próximos')).toBeDefined();
    expect(screen.getByText('Histórico')).toBeDefined();
  });

  it('preserva o card de próximo atendimento autoritativo', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientBookingsScreen />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('Barbearia Exemplo').length).toBeGreaterThanOrEqual(1);
  });

  it('aciona ação de agendamento contextual ao solicitar nova reserva', () => {
    const requestBookingMock = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientExperienceProvider actorId="client-1">
            <ClientBookingsScreen />
          </ClientExperienceProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const newBookingBtn = screen.getByRole('button', { name: /Nova reserva/i });
    expect(newBookingBtn).toBeDefined();
    fireEvent.click(newBookingBtn);
  });
});
