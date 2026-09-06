import { describe, it, expect } from 'vitest';
import { forgotPasswordSchema } from '../model/forgot-password.schema';

describe('forgotPasswordSchema', () => {
  it('deve validar com sucesso um e-mail correto', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'gestor@smartbarber.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('gestor@smartbarber.com');
    }
  });

  it('deve falhar se o e-mail estiver vazio', () => {
    const result = forgotPasswordSchema.safeParse({
      email: '   ',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Informe seu e-mail');
    }
  });

  it('deve falhar se o formato de e-mail for inválido', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'email-invalido',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Formato de e-mail inválido');
    }
  });
});
