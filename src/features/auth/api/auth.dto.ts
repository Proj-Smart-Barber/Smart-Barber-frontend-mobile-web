import { RawStaffDto } from '@/entities/staff';

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  access_token: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
  cpf: string;
}

export interface RegisterResponseDto {
  staffId: string;
}

export interface MeResponseDto {
  staff: RawStaffDto;
}
