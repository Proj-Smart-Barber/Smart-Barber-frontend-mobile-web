/**
 * Tipos de domínio e DTOs da entidade Staff
 */

export type RawStaffRole = 'OWNER' | 'BARBERMAN' | 'BARBER' | string;

export type StaffRole = 'OWNER' | 'BARBER';

export interface Staff {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: StaffRole;
}

export interface RawStaffDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: RawStaffRole;
}
