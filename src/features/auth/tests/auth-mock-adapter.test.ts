import { describe, it, expect } from 'vitest';
import { AuthMockAdapter } from '../api/auth-mock-adapter';

describe('AuthMockAdapter', () => {
  const adapter = new AuthMockAdapter(0); // delay 0 para testes rápidos

  describe('forgotPassword', () => {
    it('deve retornar mensagem de sucesso para e-mail válido', async () => {
      const response = await adapter.forgotPassword({
        email: 'gestor@smartbarber.com',
      });
      expect(response.message).toContain('instruções');
    });

    it('deve simular erro de servidor para e-mail de teste error@test.com', async () => {
      await expect(
        adapter.forgotPassword({ email: 'error@test.com' })
      ).rejects.toThrow('Falha ao processar solicitação');
    });
  });

  describe('resetPassword', () => {
    it('deve redefinir senha com sucesso quando token e senha forem válidos', async () => {
      const response = await adapter.resetPassword({
        token: 'token-valido',
        password: 'minhaNovaSenha123',
      });
      expect(response.message).toContain('redefinida com sucesso');
    });

    it('deve falhar para token inválido ou expirado', async () => {
      await expect(
        adapter.resetPassword({
          token: 'invalid-token',
          password: 'minhaNovaSenha123',
        })
      ).rejects.toThrow('inválido ou expirou');
    });

    it('deve falhar se a senha tiver menos de 6 caracteres', async () => {
      await expect(
        adapter.resetPassword({
          token: 'token-valido',
          password: '123',
        })
      ).rejects.toThrow('mínimo 6 caracteres');
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar o nome e avatar do perfil', async () => {
      const staff = await adapter.updateProfile('staff-uuid-1', {
        name: 'Carlos Barbeiro Master',
        avatarUrl: 'https://smartbarber.com/carlos.jpg',
      });

      expect(staff.id).toBe('staff-uuid-1');
      expect(staff.name).toBe('Carlos Barbeiro Master');
      expect(staff.avatarUrl).toBe('https://smartbarber.com/carlos.jpg');
    });

    it('deve rejeitar nome muito curto', async () => {
      await expect(
        adapter.updateProfile('staff-uuid-1', { name: 'Al' })
      ).rejects.toThrow('pelo menos 3 caracteres');
    });
  });

  describe('changePassword', () => {
    it('deve alterar a senha com sucesso quando os dados forem válidos', async () => {
      const response = await adapter.changePassword('staff-uuid-1', {
        currentPassword: 'senhaAtual123',
        newPassword: 'novaSenha456',
      });

      expect(response.message).toContain('alterada com sucesso');
    });

    it('deve rejeitar se a senha atual estiver incorreta', async () => {
      await expect(
        adapter.changePassword('staff-uuid-1', {
          currentPassword: 'senha-errada',
          newPassword: 'novaSenha456',
        })
      ).rejects.toThrow('está incorreta');
    });

    it('deve rejeitar se a nova senha for idêntica à atual', async () => {
      await expect(
        adapter.changePassword('staff-uuid-1', {
          currentPassword: 'mesmaSenha123',
          newPassword: 'mesmaSenha123',
        })
      ).rejects.toThrow('diferente da senha atual');
    });
  });
});
