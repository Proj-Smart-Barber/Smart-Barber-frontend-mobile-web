import { Staff } from '@/entities/staff';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  IAuthExtensionRepository,
  ResetPasswordDto,
  UpdateProfileDto,
} from './auth-extension.contract';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AuthMockAdapter implements IAuthExtensionRepository {
  private networkDelayMs: number;

  constructor(networkDelayMs = 600) {
    this.networkDelayMs = networkDelayMs;
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    await delay(this.networkDelayMs);

    if (dto.email === 'error@test.com') {
      throw new Error('Falha ao processar solicitação de recuperação de senha.');
    }

    return {
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções em instantes.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    await delay(this.networkDelayMs);

    if (dto.token === 'invalid-token' || dto.token === 'expired-token') {
      throw new Error('O link de recuperação é inválido ou expirou. Solicite um novo.');
    }

    if (dto.password.length < 6) {
      throw new Error('A senha deve conter no mínimo 6 caracteres.');
    }

    return {
      message: 'Sua senha foi redefinida com sucesso!',
    };
  }

  async updateProfile(staffId: string, dto: UpdateProfileDto): Promise<Staff> {
    await delay(this.networkDelayMs);

    if (!dto.name || dto.name.trim().length < 3) {
      throw new Error('O nome deve ter pelo menos 3 caracteres.');
    }

    return {
      id: staffId,
      name: dto.name.trim(),
      email: 'owner@smartbarber.com',
      avatarUrl: dto.avatarUrl ?? null,
      role: 'OWNER',
    };
  }

  async changePassword(_staffId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    await delay(this.networkDelayMs);

    if (dto.currentPassword === 'senha-errada') {
      throw new Error('A senha atual informada está incorreta.');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new Error('A nova senha deve ser diferente da senha atual.');
    }

    return {
      message: 'Senha alterada com sucesso!',
    };
  }
}

// Instância singleton do repositório desacoplado
export const authExtensionRepository: IAuthExtensionRepository = new AuthMockAdapter();
