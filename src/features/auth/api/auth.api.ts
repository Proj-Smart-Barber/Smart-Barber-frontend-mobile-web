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
   * Realiza login no backend: POST /api/staffs/sessions/auth
   */
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    return httpClient.post<LoginResponseDto>('/api/staffs/sessions/auth', credentials);
  }

  /**
   * Cria nova conta de Staff (Owner): POST /api/staffs/
   */
  async register(data: RegisterRequestDto): Promise<RegisterResponseDto> {
    return httpClient.post<RegisterResponseDto>('/api/staffs/', data);
  }

  /**
   * Busca perfil do usuário logado: GET /api/staffs/me
   */
  async getMe(token?: string | null): Promise<{ staff: Staff; barbershop: Barbershop | null }> {
    const response = await httpClient.get<MeResponseDto>('/api/staffs/me', {
      token,
    });

    if (!response || !response.staff) {
      throw new Error('Resposta de perfil inválida ou incompleta recebida do servidor.');
    }

    return {
      staff: mapStaffDtoToEntity(response.staff),
      barbershop: response.barbershop ?? null,
    };
  }

  /**
   * Busca barbearias vinculadas ao staff autenticado: GET /api/staffs/me/barbershops
   */
  async getMyBarbershops(token?: string | null): Promise<Array<{ id: string; name: string; role: string; status: string; timezone: string }>> {
    const response = await httpClient.get<{ barbershops: Array<{ id: string; name: string; role: string; status: string; timezone: string }> }>(
      '/api/staffs/me/barbershops',
      { token },
    );
    return response?.barbershops || [];
  }
}

export const authApi = new AuthApi();