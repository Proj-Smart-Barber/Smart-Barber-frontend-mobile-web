import { describe, it, expect } from 'vitest';
import { resetPasswordSchema } from '../model/reset-password.schema';

describe('resetPasswordSchema', () => {
  it('deve validar com sucesso quando token e senhas coincidentes forem fornecidos', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-reset-token-123',
      password: 'novaSenha123',
      confirmPassword: 'novaSenha123',
    });

    expect(result.success).toBe(true);
  });

  it('deve falhar se o token for vazio', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      password: 'novaSenha123',
      confirmPassword: 'novaSenha123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Token de recuperação é obrigatório');
    }
  });

  it('deve falhar se a nova senha tiver menos de 6 caracteres', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'token-123',
      password: '123',
      confirmPassword: '123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('mínimo 6 caracteres');
    }
  });

  it('deve falhar se as senhas não coincidirem', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'token-123',
      password: 'senhaSegura1',
      confirmPassword: 'outraSenhaDiferente',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('confirmPassword')
      );
      expect(confirmError?.message).toBe('As senhas não conferem');
    }
  });
});
