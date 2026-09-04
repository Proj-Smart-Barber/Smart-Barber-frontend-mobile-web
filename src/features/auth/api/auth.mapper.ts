import { RawStaffDto, Staff, normalizeStaffRole } from '@/entities/staff';

export function mapStaffDtoToEntity(raw: RawStaffDto): Staff {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    avatarUrl: raw.avatarUrl || null,
    role: normalizeStaffRole(raw.role),
  };
}
