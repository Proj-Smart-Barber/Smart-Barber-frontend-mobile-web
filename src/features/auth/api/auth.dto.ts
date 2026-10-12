import { RawStaffDto } from '@/entities/staff';
import { Barbershop } from '@/entities/barbershop';
import type { AccountType, AuthIdentity, Membership } from '@/entities/user';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface SessionDto {
  access_token: string;
  refresh_token?: string;
  accessExpiresAt?: string;
  sessionExpiresAt?: string;
  serverTime?: string;
}

export interface LoginResponseDto extends SessionDto {}

export interface SessionGrant {
  accessToken: string;
  refreshToken?: string;
  accessExpiresAt: string;
  sessionExpiresAt: string;
  serverTime: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
  cpf: string;
  onboardingIntent?: string;
}

export interface RegisterResponseDto {
  staffId?: string;
  userId?: string;
}

export interface MeResponseDto {
  user?: {
    id: string;
    name: string;
    email: string;
    accountType: AccountType;
    emailVerifiedAt: string | null;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    onboardingIntent?: string | null;
    credentialVersion?: number;
    createdAt?: string;
  };
  staff?: RawStaffDto;
  barbershop?: Barbershop | null;
  serverTime?: string;
}

export interface MyBarbershopsResponseDto {
  barbershops: Membership[];
}

export interface SendEmailVerificationRequestDto {
  email: string;
}

export interface ConfirmEmailVerificationRequestDto {
  token: string;
}

export interface ConfirmEmailVerificationResponseDto {
  verified: boolean;
  alreadyVerified: boolean;
  userId: string;
  email: string;
  emailVerifiedAt: string;
}

export interface SendPasswordRecoveryRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}
