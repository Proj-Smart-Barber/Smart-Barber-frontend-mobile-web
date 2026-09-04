import { RawStaffRole, StaffRole } from './staff.types';

/**
 * Normaliza o papel do membro da equipe para a UI.
 * Mapeamento estrito conforme Seção 30 do Plano:
 * - OWNER -> OWNER
 * - BARBERMAN -> BARBER
 * - BARBER -> BARBER
 */
export function normalizeStaffRole(rawRole: RawStaffRole | undefined | null): StaffRole {
  if (!rawRole) return 'BARBER';

  const normalized = String(rawRole).trim().toUpperCase();

  if (normalized === 'OWNER') {
    return 'OWNER';
  }

  if (normalized === 'BARBERMAN' || normalized === 'BARBER') {
    return 'BARBER';
  }

  // Fallback seguro caso surja variação não catalogada
  return 'BARBER';
}
