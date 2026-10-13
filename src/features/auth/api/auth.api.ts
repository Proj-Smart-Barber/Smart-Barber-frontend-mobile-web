import { Platform } from 'react-native';
import { httpClient } from '@/shared/api';
import type { Staff } from '@/entities/staff';
import type { Barbershop } from '@/entities/barbershop';
import type { AuthIdentity, Membership } from '@/entities/user';
import {
  LoginRequestDto,
  LoginResponseDto,
  SessionDto,
  SessionGrant,
  RegisterRequestDto,
  RegisterResponseDto,
  MeResponseDto,
  ConfirmEmailVerificationResponseDto,
  ResetPasswordRequestDto,
  ChangePasswordRequestDto,
} from './auth.dto';
import { mapSessionDtoToGrant, mapMeResponseToIdentity, mapStaffDtoToEntity } from './auth.mapper';

export class AuthApi {
  /**
   * Realiza login no backend: POST /api/users/sessions/auth
   */
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto & SessionGrant> {
    let dto: SessionDto;
    try {
      dto = await httpClient.post<SessionDto>('/api/users/sessions/auth', credentials);
    } catch (err: any) {
      if (err?.status === 404) {
        dto = await httpClient.post<SessionDto>('/api/staffs/sessions/auth', credentials);
      } else {
        throw err;
      }
    }

    const grant = mapSessionDtoToGrant(dto);
    return {
      ...dto,
      ...grant,
    };
  }

  /**
   * Atualiza a sessão (refresh token)
   * Web: não envia corpo (cookie HttpOnly é anexado pelo browser)
   * Native: envia { refresh_token }
   */
  async refresh(refreshToken?: string | null): Promise<SessionGrant> {
    const isWeb = Platform.OS === 'web';
    const body = isWeb ? {} : { refresh_token: refreshToken };

    const dto = await httpClient.post<SessionDto>('/api/users/sessions/refresh', body);
    return mapSessionDtoToGrant(dto);
  }

  /**
   * Encerra a sessão atual
   * Web: não envia corpo (cookie HttpOnly é limpo pelo servidor)
   * Native: envia { refresh_token }
   */
  async signOut(refreshToken?: string | null): Promise<void> {
    const isWeb = Platform.OS === 'web';
    const body = isWeb ? {} : { refresh_token: refreshToken };

    await httpClient.post<void>('/api/users/sessions/sign-out', body);
  }

  /**
   * Encerra todas as sessões ativas do usuário
   */
  async logoutAll(accessToken?: string | null): Promise<void> {
    await httpClient.post<void>('/api/users/sessions/logout-all', {}, { token: accessToken });
  }

  /**
   * Altera a senha do usuário autenticado
   */
  async changePassword(data: ChangePasswordRequestDto, accessToken?: string | null): Promise<void> {
    await httpClient.patch<void>('/api/users/me/password', data, { token: accessToken });
  }

  /**
   * Cria nova conta de usuário: POST /api/users/
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
   * Busca perfil autoritativo do usuário logado: GET /api/users/me
   */
  async getIdentity(token?: string | null): Promise<AuthIdentity> {
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

    return mapMeResponseToIdentity(response);
  }

  /**
   * Busca barbearias vinculadas ao usuário autenticado: GET /api/users/me/barbershops
   */
  async getMemberships(token?: string | null): Promise<Membership[]> {
    let response: { barbershops: Membership[] };
    try {
      response = await httpClient.get<{ barbershops: Membership[] }>('/api/users/me/barbershops', {
        token,
      });
    } catch (err: any) {
      if (err?.status === 404) {
        response = await httpClient.get<{ barbershops: Membership[] }>(
          '/api/staffs/me/barbershops',
          { token },
        );
      } else {
        throw err;
      }
    }
    // This endpoint (including /staffs alias) returns ACTIVE memberships only.
    return (response?.barbershops || []).map(m => ({ ...m, state: m.state ?? 'ACTIVE' }));
  }

  /**
   * Envia link de verificação de e-mail
   */
  async sendEmailVerification(email: string): Promise<void> {
    await httpClient.post<void>('/api/users/verification-email', { email });
  }

  /**
   * Confirma verificação de e-mail por token
   */
  async confirmEmailVerification(token: string): Promise<ConfirmEmailVerificationResponseDto> {
    return await httpClient.post<ConfirmEmailVerificationResponseDto>(
      '/api/users/verification-email/confirm',
      { token },
    );
  }

  /**
   * Envia link de recuperação de senha
   */
  async sendPasswordRecovery(email: string): Promise<void> {
    await httpClient.post<void>('/api/users/password-recovery', { email });
  }

  /**
   * Redefine senha com token de recuperação
   */
  async resetPassword(data: ResetPasswordRequestDto): Promise<void> {
    await httpClient.post<void>('/api/users/password-recovery/reset', data);
  }

  /**
   * Compatibilidade legado: busca perfil staff
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

    const staffData = response?.user || response?.staff;

    if (!response || !staffData) {
      throw new Error('Resposta de perfil inválida ou incompleta recebida do servidor.');
    }

    return {
      staff: mapStaffDtoToEntity(staffData as any),
      barbershop: response.barbershop ?? null,
    };
  }

  /**
   * Compatibilidade legado: busca barbearias
   */
  async getMyBarbershops(token?: string | null): Promise<Array<{ id: string; name: string; role: string; status: string; timezone: string }>> {
    return this.getMemberships(token);
  }
}

export const authApi = new AuthApi();