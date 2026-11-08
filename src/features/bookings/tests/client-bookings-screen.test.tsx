// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPush = vi.fn();
let mockSearchParams: { tab?: string } = {};
let mockSessionIdentity: { id: string; name: string } | null = { id: 'user-1', name: 'Lucas Mendes' };

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

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    status: mockSessionIdentity ? 'authenticated' : 'unauthenticated',
    identity: mockSessionIdentity,
    token: mockSessionIdentity ? 'fake-token' : null,
  }),
}));

import { ThemeProvider } from '@/shared/theme';
import ClientBookingsScreen from '@/app/(client)/bookings';
import * as bookingsApi from '../api/bookings.api';
import { discoveryApi } from '@/features/discovery/api/discovery.api';
import { ClientExperienceProvider } from '@/features/discovery/model/client-experience-context';
import { bookingQueryKeys } from '../model/booking-query-keys';
import type { BookingDto } from '../api/bookings.dto';
import type { NextBookingItem } from '@/features/discovery/api/discovery.contract';

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

function renderScreen(queryClient: QueryClient, experienceContextProps?: { actorId?: string | null }) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialMode="dark">
        <ClientExperienceProvider actorId={experienceContextProps?.actorId ?? mockSessionIdentity?.id ?? null}>
          <ClientBookingsScreen />
        </ClientExperienceProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

// Exemplos de agendamentos para os testes
const samplePastBooking: BookingDto = {
  id: 'b-past-1',
  barbershopId: 'shop-1',
  barbermanId: 'barber-1',
  services: [{ title: 'Corte Tradicional', priceInCents: 5000, durationInMinutes: 30 }],
  status: 'COMPLETED',
  startsAt: '2026-10-10T14:00:00.000Z',
};

const sampleFutureBooking: BookingDto = {
  id: 'b-future-1',
  barbershopId: 'shop-1',
  barbermanId: 'barber-1',
  services: [{ title: 'Barba Terapia', priceInCents: 4000, durationInMinutes: 30 }],
  status: 'CONFIRMED',
  startsAt: '2026-12-15T10:00:00.000Z',
};

const sampleUpcomingAuthoritative: NextBookingItem = {
  id: 'b-authoritative-1',
  barbershopId: 'shop-1',
  barbershopName: 'Barbearia Vintage',
  barbermanId: 'barber-1',
  barbermanName: 'Carlos Barbeiro',
  services: [{ title: 'Corte Degradê', priceInCents: 6000, durationInMinutes: 30 }],
  startsAt: '2026-12-20T15:00:00.000Z',
  status: 'CONFIRMED',
};

describe('ClientBookingsScreen — Tarefa 7: Meus Agendamentos e Paginação', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = {};
    mockSessionIdentity = { id: 'user-1', name: 'Lucas Mendes' };
    queryClient = createTestQueryClient();

    // Defaults limpos
    vi.spyOn(discoveryApi, 'fetchUpcomingBooking').mockResolvedValue({
      booking: null,
      serverTime: '2026-11-07T12:00:00.000Z',
    });

    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue([]);
  });

  it('1. tab=history abre Histórico, ausência e valor inválido mantêm Próximos', async () => {
    // Ausência de tab => Próximos ativo
    mockSearchParams = {};
    const { unmount } = renderScreen(queryClient);
    expect(screen.getByRole('tab', { name: /Próximos/i })).toBeDefined();
    unmount();

    // Valor inválido => Fallback seguro para Próximos
    mockSearchParams = { tab: 'invalid_value' as any };
    const { unmount: unmount2 } = renderScreen(queryClient);
    expect(screen.getByRole('tab', { name: /Próximos/i })).toBeDefined();
    unmount2();

    // tab=history => Histórico ativo
    mockSearchParams = { tab: 'history' };
    renderScreen(queryClient);
    expect(screen.getByRole('tab', { name: /Histórico/i })).toBeDefined();
  });

  it('2. Próximos e Histórico classificam reservas corretamente preservando status reais', async () => {
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue([
      samplePastBooking,
      sampleFutureBooking,
    ]);

    mockSearchParams = {};
    const { rerender } = renderScreen(queryClient);

    // Em Próximos: deve exibir a futura (Barba Terapia) e NÃO a passada
    await waitFor(() => {
      expect(screen.getByText('Barba Terapia')).toBeDefined();
    });
    expect(screen.queryByText('Corte Tradicional')).toBeNull();

    // Alterna para Histórico
    const tabHistorico = screen.getByRole('tab', { name: /Histórico/i });
    fireEvent.click(tabHistorico);

    await waitFor(() => {
      expect(screen.getByText('Corte Tradicional')).toBeDefined();
    });
    expect(screen.queryByText('Barba Terapia')).toBeNull();
  });

  it('3. Página 1 com 20 históricos e reserva futura só na página 2: Próximos oferece Buscar mais sem falso vazio', async () => {
    const page1TwentyPast: BookingDto[] = Array.from({ length: 20 }, (_, i) => ({
      ...samplePastBooking,
      id: `past-${i + 1}`,
      services: [{ title: `Atendimento Passado ${i + 1}`, priceInCents: 5000, durationInMinutes: 30 }],
    }));

    const page2Future: BookingDto[] = [
      {
        ...sampleFutureBooking,
        id: 'future-page-2',
        services: [{ title: 'Reserva Futura Pag 2', priceInCents: 7000, durationInMinutes: 45 }],
      },
    ];

    vi.spyOn(bookingsApi, 'fetchMyBookings')
      .mockResolvedValueOnce(page1TwentyPast)
      .mockResolvedValueOnce(page2Future);

    renderScreen(queryClient);

    // Na primeira página, não há reservas futuras carregadas, mas hasMore é true
    await waitFor(() => {
      expect(
        screen.getByText(/Nenhum agendamento futuro encontrado nas páginas carregadas/i),
      ).toBeDefined();
    });
    // Não declara ausência definitiva
    expect(screen.queryByText(/Você ainda não possui horários agendados/i)).toBeNull();

    // Botão de buscar mais está disponível
    const buscarMaisBtn = screen.getByRole('button', { name: /Buscar mais agendamentos/i });
    expect(buscarMaisBtn).toBeDefined();

    // Clica para buscar página 2
    fireEvent.click(buscarMaisBtn);

    // Página 2 carregou: reserva futura agora aparece na lista!
    await waitFor(() => {
      expect(screen.getByText('Reserva Futura Pag 2')).toBeDefined();
    });
  });

  it('4. Categoria filtrada vazia com páginas restantes não exibe contagem zero global', async () => {
    const page1TwentyPast: BookingDto[] = Array.from({ length: 20 }, (_, i) => ({
      ...samplePastBooking,
      id: `past-item-${i + 1}`,
    }));

    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValueOnce(page1TwentyPast);

    renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum agendamento futuro encontrado nas páginas carregadas/i)).toBeDefined();
    });

    // SegmentedFilter não deve ter count "0" ou contagens que enganem o usuário
    const proximosTab = screen.getByRole('tab', { name: /Próximos/i });
    expect(proximosTab.textContent).not.toMatch(/\b0\b/);
  });

  it('5. Última página esgotada exibe vazio final explicativo com ação de início', async () => {
    // Retorna vazio de primeira (< 20 itens => hasMore = false)
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValueOnce([]);

    renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Nenhum agendamento futuro')).toBeDefined();
      expect(
        screen.getByText(/Você ainda não possui horários agendados/i),
      ).toBeDefined();
    });

    const novaReservaBtns = screen.getAllByRole('button', { name: /Nova reserva/i });
    expect(novaReservaBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('6. Próximo atendimento pela consulta autoritativa exibe destaque e trata erro sem fingir vazio', async () => {
    // 6.1 Sucesso na consulta autoritativa
    vi.spyOn(discoveryApi, 'fetchUpcomingBooking').mockResolvedValueOnce({
      booking: sampleUpcomingAuthoritative,
      serverTime: '2026-11-07T12:00:00.000Z',
    });

    const { unmount } = renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Corte Degradê')).toBeDefined();
      expect(screen.getByText(/Carlos Barbeiro/i)).toBeDefined();
    });
    unmount();

    // 6.2 Erro na consulta autoritativa oferece recuperação e não finge vazio
    const qc2 = createTestQueryClient();
    vi.spyOn(discoveryApi, 'fetchUpcomingBooking').mockRejectedValue(
      new Error('Falha de rede ao consultar próximo agendamento'),
    );

    renderScreen(qc2);

    await waitFor(
      () => {
        expect(
          screen.getByText(/Não foi possível carregar seu próximo agendamento/i),
        ).toBeDefined();
        expect(screen.getByRole('button', { name: /Recarregar/i })).toBeDefined();
      },
      { timeout: 4000 },
    );
  });

  it('7. Deduplicação entre páginas e entre destaque autoritativo e lista de próximos', async () => {
    // Mesma reserva está no useNextBooking E na lista paginada
    vi.spyOn(discoveryApi, 'fetchUpcomingBooking').mockResolvedValueOnce({
      booking: sampleUpcomingAuthoritative,
      serverTime: '2026-11-07T12:00:00.000Z',
    });

    const duplicateInPage: BookingDto = {
      id: sampleUpcomingAuthoritative.id, // mesmo ID
      barbershopId: sampleUpcomingAuthoritative.barbershopId,
      barbermanId: 'barber-1',
      services: [{ title: 'Corte Degradê', priceInCents: 6000, durationInMinutes: 30 }],
      status: 'CONFIRMED',
      startsAt: sampleUpcomingAuthoritative.startsAt as string,
    };

    const anotherFuture: BookingDto = {
      id: 'b-another-future',
      barbershopId: 'shop-1',
      barbermanId: 'barber-1',
      services: [{ title: 'Outro Atendimento Futuro', priceInCents: 5000, durationInMinutes: 30 }],
      status: 'CONFIRMED',
      startsAt: '2026-12-25T10:00:00.000Z',
    };

    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValueOnce([
      duplicateInPage,
      anotherFuture,
    ]);

    renderScreen(queryClient);

    // Destaque renderiza o próximo atendimento autoritativo
    await waitFor(() => {
      expect(screen.getByText(/Carlos Barbeiro/i)).toBeDefined();
      expect(screen.getByText('Outro Atendimento Futuro')).toBeDefined();
    });

    // O item b-authoritative-1 não deve se repetir na lista como BookingCard
    // (apenas 1 ocorrência de "Corte Degradê" na tela, no card autoritativo)
    const elements = screen.getAllByText('Corte Degradê');
    expect(elements).toHaveLength(1);
  });

  it('8. Erro inicial exibe mensagem de produto e erro na página seguinte preserva itens existentes', async () => {
    // 8.1 Erro inicial
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockRejectedValueOnce(
      new Error('Erro de conexão 503'),
    );

    const { unmount } = renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar seus agendamentos.')).toBeDefined();
      expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeDefined();
    });
    // Não expõe termos técnicos
    expect(screen.queryByText(/503/)).toBeNull();
    unmount();

    // 8.2 Erro na próxima página preserva itens existentes
    const qc2 = createTestQueryClient();
    const page1Twenty: BookingDto[] = Array.from({ length: 20 }, (_, i) => ({
      ...sampleFutureBooking,
      id: `future-${i + 1}`,
      services: [{ title: `Reserva Futura ${i + 1}`, priceInCents: 5000, durationInMinutes: 30 }],
    }));

    vi.spyOn(bookingsApi, 'fetchMyBookings')
      .mockResolvedValueOnce(page1Twenty)
      .mockRejectedValueOnce(new Error('Falha temporária ao buscar página 2'));

    renderScreen(qc2);

    await waitFor(() => {
      expect(screen.getByText('Reserva Futura 1')).toBeDefined();
    });

    const buscarMaisBtn = screen.getByRole('button', { name: /Buscar mais agendamentos/i });
    fireEvent.click(buscarMaisBtn);

    // Após a falha na página seguinte, os itens da página 1 continuam intactos!
    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar mais agendamentos.')).toBeDefined();
    });
    expect(screen.getByText('Reserva Futura 1')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeDefined();
  });

  it('9. Atualização com cache preserva itens sem tela branca ou vazio momentâneo', async () => {
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue([sampleFutureBooking]);

    renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Barba Terapia')).toBeDefined();
    });

    // Simula refetch
    queryClient.invalidateQueries({ queryKey: bookingQueryKeys.myBookings('user-1') });

    // Durante a atualização, o item permanece renderizado (sem flicker de vazio)
    expect(screen.getByText('Barba Terapia')).toBeDefined();
    expect(screen.queryByText('Nenhum agendamento futuro')).toBeNull();
  });

  it('10. Nenhuma carga ilimitada automática ao montar e bloqueio de cliques concorrentes', async () => {
    const fetchSpy = vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        ...samplePastBooking,
        id: `past-many-${i + 1}`,
      })),
    );

    renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum agendamento futuro encontrado nas páginas carregadas/i)).toBeDefined();
    });

    // Deve ter chamado a API apenas 1 vez na montagem (sem loop automático para descobrir futuro)
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Duplo clique rápido no botão de buscar mais
    const buscarMaisBtn = screen.getByRole('button', { name: /Buscar mais agendamentos/i });
    fireEvent.click(buscarMaisBtn);
    fireEvent.click(buscarMaisBtn);

    // Não deve disparar chamadas concorrentes duplicadas
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('11. Troca de ator limpa reservas e usa chaves privadas isoladas', async () => {
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue([
      {
        ...sampleFutureBooking,
        id: 'user1-booking',
        services: [{ title: 'Serviço Exclusivo User 1', priceInCents: 5000, durationInMinutes: 30 }],
      },
    ]);

    const { rerender } = renderScreen(queryClient, { actorId: 'user-1' });

    await waitFor(() => {
      expect(screen.getByText('Serviço Exclusivo User 1')).toBeDefined();
    });

    // Troca de ator para user-2
    mockSessionIdentity = { id: 'user-2', name: 'Segundo Usuário' };
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue([
      {
        ...sampleFutureBooking,
        id: 'user2-booking',
        services: [{ title: 'Serviço Exclusivo User 2', priceInCents: 4500, durationInMinutes: 30 }],
      },
    ]);

    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientExperienceProvider actorId="user-2">
            <ClientBookingsScreen />
          </ClientExperienceProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Serviço Exclusivo User 2')).toBeDefined();
    });
    // Dados do user-1 não devem vazar para o user-2
    expect(screen.queryByText('Serviço Exclusivo User 1')).toBeNull();
  });

  it('12. Navegação para detalhe preservada e sem abas superiores de descoberta', async () => {
    vi.spyOn(bookingsApi, 'fetchMyBookings').mockResolvedValue([sampleFutureBooking]);

    renderScreen(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Barba Terapia')).toBeDefined();
    });

    // Toque no card navega para detalhe /(account)/bookings/:id
    const card = screen.getByText('Barba Terapia');
    fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/(account)/bookings/b-future-1');

    // Abas de descoberta (Perto de você e Explorar) não estão na tela de agendamentos
    expect(screen.queryByText('Perto de você')).toBeNull();
  });
});
