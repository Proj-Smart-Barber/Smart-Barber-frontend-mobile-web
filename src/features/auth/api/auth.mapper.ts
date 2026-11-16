import { RawStaffDto, Staff, normalizeStaffRole } from '@/entities/staff';
import type { AuthIdentity, AccountType } from '@/entities/user';
import type { SessionDto, SessionGrant, MeResponseDto } from './auth.dto';
import { decodeJwt } from '../lib/jwt-helper';

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

export function mapTemporarySessionDtoToGrant(dto: SessionDto): SessionGrant {
  const token = dto.access_token;
  // Read the JWT only to decide when to end the local session.
  const jwt = decodeJwt(token);
  const expiration = jwt?.exp;
  const tokenExpiresAt = typeof expiration === 'number' ? new Date(expiration * 1000) : null;
  if (!tokenExpiresAt || !Number.isFinite(tokenExpiresAt.getTime()) || tokenExpiresAt.getTime() <= 0) {
    throw new Error('O servidor retornou uma sessão inválida.');
  }

  const serverTime = Date.parse(dto.serverTime ?? '');
  const reportedExpiry = Date.parse(dto.accessExpiresAt ?? '');
  const hasServerTiming = Number.isFinite(serverTime) && Number.isFinite(reportedExpiry);
  const accessExpiresAt = hasServerTiming
    ? new Date(Math.min(tokenExpiresAt.getTime(), reportedExpiry)).toISOString()
    : tokenExpiresAt.toISOString();

  return {
    accessToken: token,
    accessExpiresAt,
    sessionExpiresAt: accessExpiresAt,
    serverTime: hasServerTiming ? new Date(serverTime).toISOString() : new Date().toISOString(),
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
