import { httpClient } from '@/shared/api';
import type { Staff } from '@/entities/staff';
import type { Barbershop } from '@/entities/barbershop';
import {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
  MeResponseDto,
} from './auth.dto';
import { mapStaffDtoToEntity } from './auth.mapper';

export class AuthApi {
  /**
   * Realiza login no backend: POST /api/users/sessions/auth (com fallback para /api/staffs/sessions/auth)
   */
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    try {
      return await httpClient.post<LoginResponseDto>('/api/users/sessions/auth', credentials);
    } catch (err: any) {
      if (err?.status === 404) {
        return await httpClient.post<LoginResponseDto>('/api/staffs/sessions/auth', credentials);
      }
      throw err;
    }
  }

  /**
   * Cria nova conta de Staff/User: POST /api/users/ (com fallback para /api/staffs/)
   */
  async register(data: RegisterRequestDto): Promise<RegisterResponseDto> {
    try {
      return await httpClient.post<RegisterResponseDto>('/api/users/', data);
    } catch (err: any) {
      if (err?.status === 404) {
        return await httpClient.post<RegisterResponseDto>('/api/staffs/', data);
      }
      throw err;
    }
  }

  /**
   * Busca perfil do usuário logado: GET /api/users/me (com fallback para /api/staffs/me)
   */
  async getMe(token?: string | null): Promise<{ staff: Staff; barbershop: Barbershop | null }> {
    let response: MeResponseDto;
    try {
      response = await httpClient.get<MeResponseDto>('/api/users/me', { token });
    } catch (err: any) {
      if (err?.status === 404) {
        response = await httpClient.get<MeResponseDto>('/api/staffs/me', { token });
      } else {
        throw err;
      }
    }

    const staffData = response?.staff || response?.user;

    if (!response || !staffData) {
      throw new Error('Resposta de perfil inválida ou incompleta recebida do servidor.');
    }

    return {
      staff: mapStaffDtoToEntity(staffData),
      barbershop: response.barbershop ?? null,
    };
  }

  /**
   * Busca barbearias vinculadas ao staff/user autenticado: GET /api/users/me/barbershops (com fallback para /api/staffs/me/barbershops)
   */
  async getMyBarbershops(token?: string | null): Promise<Array<{ id: string; name: string; role: string; status: string; timezone: string }>> {
    let response: { barbershops: Array<{ id: string; name: string; role: string; status: string; timezone: string }> };
    try {
      response = await httpClient.get<{ barbershops: Array<{ id: string; name: string; role: string; status: string; timezone: string }> }>(
        '/api/users/me/barbershops',
        { token },
      );
    } catch (err: any) {
      if (err?.status === 404) {
        response = await httpClient.get<{ barbershops: Array<{ id: string; name: string; role: string; status: string; timezone: string }> }>(
          '/api/staffs/me/barbershops',
          { token },
        );
      } else {
        throw err;
      }
    }
    return response?.barbershops || [];
  }
}

export const authApi = new AuthApi();