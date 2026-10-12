import type { QueryClient } from '@tanstack/react-query';
import type { FetchMyBookingsParams, FetchUnitBookingsParams, BookingAvailabilityRequestDto } from '../api/bookings.dto';

export const bookingQueryKeys = {
  all: ['bookings'] as const,
  professionals: (shopId: string) => ['barbershop', shopId, 'professionals'] as const,
  availability: (shopId: string, params: BookingAvailabilityRequestDto) =>
    ['barbershop', shopId, 'availability', params] as const,
  myBookings: (actorId?: string | null, params?: FetchMyBookingsParams) =>
    ['bookings', 'me', actorId ?? 'anon', params ?? {}] as const,
  unitBookings: (shopId: string, params?: FetchUnitBookingsParams) =>
    ['barbershop', shopId, 'bookings', params ?? {}] as const,
  detail: (bookingId: string, scope?: string) =>
    ['bookings', 'detail', bookingId, scope ?? 'PERSONAL'] as const,
  agenda: (shopId: string, professionalId?: string | null, date?: string | null) =>
    ['agenda', shopId, professionalId ?? 'all', date ?? 'all'] as const,
  dashboard: (shopId: string, date?: string | null) =>
    ['dashboard', shopId, date ?? 'today'] as const,
  notifications: (actorId?: string | null) =>
    ['notifications', actorId ?? 'anon'] as const,
};

export interface InvalidateBookingParams {
  actorId?: string | null;
  shopId?: string;
  bookingId?: string;
  oldProfessionalId?: string | null;
  newProfessionalId?: string | null;
  dates?: string[];
}

export async function invalidateBookingQueries(
  queryClient: QueryClient,
  params: InvalidateBookingParams
): Promise<void> {
  const promises: Promise<void>[] = [];

  // 1. Minhas reservas (pessoal)
  promises.push(
    queryClient.invalidateQueries({
      queryKey: ['bookings', 'me'],
    })
  );

  // 2. Detalhe da reserva (se fornecido)
  if (params.bookingId) {
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['bookings', 'detail', params.bookingId],
      })
    );
  }

  // 3. Unidade afetada
  if (params.shopId) {
    // Disponibilidade de horários
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['barbershop', params.shopId, 'availability'],
      })
    );
    // Reservas operacionais da unidade
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['barbershop', params.shopId, 'bookings'],
      })
    );
    // Agendas da unidade
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['agenda', params.shopId],
      })
    );
    // Dashboards da unidade
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['dashboard', params.shopId],
      })
    );
  }

  // 4. Notificações do ator
  if (params.actorId) {
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['notifications', params.actorId],
      })
    );
  }

  await Promise.all(promises);
}
