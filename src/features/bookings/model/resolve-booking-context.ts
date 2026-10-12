import type { BookingDto } from '../api/bookings.dto';

export interface OperationalMembership {
  shopId: string;
  role: 'OWNER' | 'ADMIN' | 'BARBER' | string;
  status?: string;
}

export interface ResolveBookingContextParams {
  actorId?: string | null;
  selectedMembership?: OperationalMembership | null;
  booking?: BookingDto | null;
  requestedScope?: 'PERSONAL' | 'UNIT' | null;
}

export interface ResolvedBookingContext {
  isValid: boolean;
  resolvedScope: 'PERSONAL' | 'UNIT';
  canAccess: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canComplete: boolean;
  canMarkNoShow: boolean;
  isBarberSelfOnly: boolean;
  reason?: string;
}

/**
 * resolveBookingContext: Valida contexto frontend de acesso e ações da reserva.
 * Garante consistência de escopo sem substituir a autoridade do RBAC no backend.
 */
export function resolveBookingContext(
  params: ResolveBookingContextParams
): ResolvedBookingContext {
  const { actorId, selectedMembership, booking, requestedScope } = params;

  // Escopo padrão é PERSONAL se não especificado
  const targetScope = requestedScope === 'UNIT' ? 'UNIT' : 'PERSONAL';

  if (!actorId) {
    return {
      isValid: false,
      resolvedScope: targetScope,
      canAccess: false,
      canReschedule: false,
      canCancel: false,
      canComplete: false,
      canMarkNoShow: false,
      isBarberSelfOnly: false,
      reason: 'Ator não autenticado.',
    };
  }

  // 1. Escopo Operacional da Unidade (UNIT)
  if (targetScope === 'UNIT') {
    if (!selectedMembership || selectedMembership.status === 'INACTIVE') {
      return {
        isValid: false,
        resolvedScope: 'UNIT',
        canAccess: false,
        canReschedule: false,
        canCancel: false,
        canComplete: false,
        canMarkNoShow: false,
        isBarberSelfOnly: false,
        reason: 'Vínculo operacional ativo com a unidade é obrigatório.',
      };
    }

    // Se a reserva foi fornecida, valida correspondência de unidade
    if (booking) {
      if (booking.barbershopId !== selectedMembership.shopId) {
        return {
          isValid: false,
          resolvedScope: 'UNIT',
          canAccess: false,
          canReschedule: false,
          canCancel: false,
          canComplete: false,
          canMarkNoShow: false,
          isBarberSelfOnly: false,
          reason: 'Acesso negado: a reserva pertence a outra unidade.',
        };
      }

      // Se o usuário é BARBER, só tem acesso e pode gerenciar se for o barbeiro designado
      const isBarber = selectedMembership.role === 'BARBER';
      if (isBarber && booking.barbermanId !== actorId) {
        return {
          isValid: false,
          resolvedScope: 'UNIT',
          canAccess: false,
          canReschedule: false,
          canCancel: false,
          canComplete: false,
          canMarkNoShow: false,
          isBarberSelfOnly: true,
          reason: 'Profissional só pode acessar e gerenciar agendamentos da sua própria agenda.',
        };
      }

      const canReschedule =
        booking.capabilities?.reschedule?.allowed ??
        (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
      const canCancel =
        booking.capabilities?.cancel?.allowed ??
        (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
      const canComplete =
        booking.capabilities?.complete?.allowed ??
        (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
      const canMarkNoShow =
        booking.capabilities?.noShow?.allowed ??
        (booking.status === 'CONFIRMED' || booking.status === 'PENDING');

      return {
        isValid: true,
        resolvedScope: 'UNIT',
        canAccess: true,
        canReschedule,
        canCancel,
        canComplete,
        canMarkNoShow,
        isBarberSelfOnly: isBarber,
      };
    }

    // Sem reserva ainda (ex: criação de nova reserva operacional)
    return {
      isValid: true,
      resolvedScope: 'UNIT',
      canAccess: true,
      canReschedule: true,
      canCancel: true,
      canComplete: true,
      canMarkNoShow: true,
      isBarberSelfOnly: selectedMembership.role === 'BARBER',
    };
  }

  // 2. Escopo Pessoal do Consumidor (PERSONAL)
  if (booking) {
    // Escopo PERSONAL exige que o ator seja o beneficiário (consumidor)
    const isOwner =
      booking.customerId === actorId ||
      booking.createdByUserId === actorId ||
      (booking.customer && (booking.customer as any).id === actorId);

    if (!isOwner) {
      return {
        isValid: false,
        resolvedScope: 'PERSONAL',
        canAccess: false,
        canReschedule: false,
        canCancel: false,
        canComplete: false,
        canMarkNoShow: false,
        isBarberSelfOnly: false,
        reason: 'Acesso negado: a reserva pertence a outro cliente.',
      };
    }

    const canReschedule =
      booking.capabilities?.reschedule?.allowed ??
      (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
    const canCancel =
      booking.capabilities?.cancel?.allowed ??
      (booking.status === 'CONFIRMED' || booking.status === 'PENDING');

    return {
      isValid: true,
      resolvedScope: 'PERSONAL',
      canAccess: true,
      canReschedule,
      canCancel,
      canComplete: false, // Cliente final não conclui fisicamente
      canMarkNoShow: false, // Cliente final não marca No-Show
      isBarberSelfOnly: false,
    };
  }

  return {
    isValid: true,
    resolvedScope: 'PERSONAL',
    canAccess: true,
    canReschedule: true,
    canCancel: true,
    canComplete: false,
    canMarkNoShow: false,
    isBarberSelfOnly: false,
  };
}
