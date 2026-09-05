import type { AppointmentStatus, DashboardAppointment } from '../api/dashboard.contract';

/**
 * Retorna saudação de acordo com a hora do dia
 */
export function getGreetingByHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  }
  if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  }
  return 'Boa noite';
}

/**
 * Formata valor em centavos para moeda corrente BRL
 */
export function formatCurrency(cents: number): string {
  const value = (cents || 0) / 100;
  return value
    .toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    .replace(/\u00a0/g, ' ');
}

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
    case 'CONFIRMED':
      return 'brand';
    case 'WAITING':
      return 'brand';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'error';
    default:
      return 'brand';
  }
}

/**
 * Identifica o próximo atendimento a ser realizado
 */
export function findNextAppointment(
  appointments: DashboardAppointment[],
): DashboardAppointment | null {
  const active = appointments.filter(
    (a) => a.status === 'IN_SERVICE' || a.status === 'CONFIRMED' || a.status === 'WAITING',
  );

  if (active.length === 0) return null;

  // Dá prioridade para o que já está em atendimento ou o primeiro cronológico
  const inService = active.find((a) => a.status === 'IN_SERVICE');
  if (inService) return inService;

  return active[0];
}
