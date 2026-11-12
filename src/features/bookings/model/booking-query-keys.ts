import type { QueryClient } from '@tanstack/react-query';
import type { FetchMyBookingsParams, FetchUnitBookingsParams, BookingAvailabilityRequestDto } from '../api/bookings.dto';

export function normalizeServiceIds(serviceIds?: readonly string[] | null): string[] {
  if (!serviceIds || serviceIds.length === 0) return [];
  return Array.from(
    new Set(
      serviceIds
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0),
    ),
  ).sort();
}

export const bookingQueryKeys = {
  all: ['bookings'] as const,
  professionals: (shopId: string) => ['barbershop', shopId, 'professionals'] as const,
  availability: (shopId: string, params: BookingAvailabilityRequestDto) =>
    [
      'barbershop',
      shopId,
      'availability',
      {
        ...params,
        serviceIds: normalizeServiceIds(params?.serviceIds),
      },
    ] as const,
  myBookings: (actorId?: string | null, params?: FetchMyBookingsParams) =>
    ['bookings', 'me', actorId ?? 'anon', params ?? {}] as const,
  unitBookings: (
    shopId: string,
    params?: FetchUnitBookingsParams,
    actorId?: string | null,
    role?: string | null
  ) =>
    role
      ? (['barbershop', shopId, 'bookings', actorId ?? 'anon', role, params ?? {}] as const)
      : (['barbershop', shopId, 'bookings', actorId ?? 'anon', params ?? {}] as const),
  unitBookingsBootstrap: (
    shopId: string,
    actorId?: string | null,
    role?: string | null,
    barbermanId?: string | null
  ) =>
    ['barbershop', shopId, 'bookings', 'bootstrap', actorId ?? 'anon', role ?? 'unknown', barbermanId ?? 'all'] as const,
  detail: (bookingId: string, scope?: string, actorId?: string | null) =>
    ['bookings', 'detail', bookingId, scope ?? 'PERSONAL', actorId ?? 'anon'] as const,
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
    // Agendas da unidade (invalida tanto ['agenda', shopId] quanto o formato canônico ['agenda', 'day', shopId])
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['agenda', params.shopId],
      })
    );
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['agenda', 'day', params.shopId],
      })
    );
    // Dashboards da unidade
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['dashboard', params.shopId],
      })
    );
    // Financeiro da unidade (garante atualização de previsão, concluídos e atendimentos após mutação de reserva)
    promises.push(
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'finance' && q.queryKey.includes(params.shopId!),
      })
    );
  } else {
    promises.push(
      queryClient.invalidateQueries({
        queryKey: ['finance'],
      })
    );
  }

  if (params.actorId) promises.push(queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'dashboard' && q.queryKey.includes(params.actorId!) }));

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
