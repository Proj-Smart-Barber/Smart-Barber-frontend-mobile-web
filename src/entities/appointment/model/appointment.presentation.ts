import type { AppointmentStatus } from './appointment.types';

/**
 * Mapeia status do agendamento para label legível
 */
export function mapStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'WAITING':
      return 'Aguardando';
    case 'CONFIRMED':
      return 'Confirmado';
    case 'IN_SERVICE':
      return 'Em atendimento';
    case 'COMPLETED':
      return 'Concluído';
    case 'CANCELLED':
      return 'Cancelado';
    case 'NO_SHOW':
      return 'Não compareceu';
    default:
      return status;
  }
}

/**
 * Mapeia status do agendamento para o tom do componente Badge
 */
export function mapStatusBadgeTone(
  status: AppointmentStatus,
): 'brand' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_SERVICE':
      return 'warning';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'error';
    default:
      return 'brand';
  }
}
