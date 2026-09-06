import { describe, it, expect } from 'vitest';
import { changePasswordSchema } from '../model/change-password.schema';

describe('changePasswordSchema', () => {
  it('deve validar com sucesso quando senhas corretas e distintas forem fornecidas', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'senhaAtualAntiga123',
      newPassword: 'novaSenhaSegura456',
      confirmPassword: 'novaSenhaSegura456',
    });

    expect(result.success).toBe(true);
  });

  it('deve falhar se a senha atual estiver vazia', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'novaSenhaSegura456',
      confirmPassword: 'novaSenhaSegura456',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Informe sua senha atual');
    }
  });

  it('deve falhar se a nova senha for igual à senha atual', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'mesmaSenha123',
      newPassword: 'mesmaSenha123',
      confirmPassword: 'mesmaSenha123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const matchError = result.error.issues.find(
        (i) => i.path.includes('newPassword')
      );
      expect(matchError?.message).toBe('A nova senha deve ser diferente da senha atual');
    }
  });

  it('deve falhar se a confirmação da nova senha não coincidir', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'senhaAntiga123',
      newPassword: 'novaSenhaSegura456',
      confirmPassword: 'outraCoisaDiferente',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('confirmPassword')
      );
      expect(confirmError?.message).toBe('As senhas não conferem');
    }
  });

  it('deve falhar se a nova senha tiver menos de 6 caracteres', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'senhaAntiga123',
      newPassword: '123',
      confirmPassword: '123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('mínimo 6 caracteres');
    }
  });
});
