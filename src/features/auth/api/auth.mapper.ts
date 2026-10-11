import { RawStaffDto, Staff, normalizeStaffRole } from '@/entities/staff';
import type { AuthIdentity, AccountType } from '@/entities/user';
import type { SessionDto, SessionGrant, MeResponseDto } from './auth.dto';

export function mapStaffDtoToEntity(raw: RawStaffDto): Staff {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    avatarUrl: raw.avatarUrl || null,
    role: normalizeStaffRole(raw.role),
  };
}

export function mapSessionDtoToGrant(dto: SessionDto): SessionGrant {
  if (!dto.access_token) {
    throw new Error('access_token ausente no SessionDto');
  }

  const serverTime = dto.serverTime ?? new Date().toISOString();
  const accessExpiresAt =
    dto.accessExpiresAt ??
    new Date(new Date(serverTime).getTime() + 15 * 60 * 1000).toISOString();
  const sessionExpiresAt =
    dto.sessionExpiresAt ??
    new Date(new Date(serverTime).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    accessToken: dto.access_token,
    refreshToken: dto.refresh_token,
    accessExpiresAt,
    sessionExpiresAt,
    serverTime,
  };
}

export function mapMeResponseToIdentity(res: MeResponseDto): AuthIdentity {
  const userData = res.user;

  if (!userData) {
    if (res.staff) {
      throw new Error('Perfil inválido: accountType é obrigatório no contrato de identidade');
    }
    throw new Error('Resposta de perfil inválida ou incompleta recebida do servidor');
  }

  if (!userData.accountType) {
    throw new Error('Perfil inválido: accountType é obrigatório no contrato de identidade');
  }

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    accountType: userData.accountType as AccountType,
    emailVerifiedAt: userData.emailVerifiedAt ?? null,
    phoneNumber: userData.phoneNumber ?? null,
    avatarUrl: userData.avatarUrl ?? null,
    onboardingIntent: userData.onboardingIntent ?? null,
    credentialVersion: userData.credentialVersion ?? 1,
    createdAt: userData.createdAt,
    staff: res.staff
      ? {
          id: res.staff.id,
          role: res.staff.role || 'BARBERMAN',
          avatarUrl: res.staff.avatarUrl,
          phoneNumber: (res.staff as any).phoneNumber ?? null,
        }
      : null,
  };
}
