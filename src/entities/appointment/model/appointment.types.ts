/**
 * Tipos de domínio da entidade Appointment
 * Vocabulário oficial de status do Design System (seção 32)
 */
export type AppointmentStatus =
  | 'WAITING'
  | 'CONFIRMED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
