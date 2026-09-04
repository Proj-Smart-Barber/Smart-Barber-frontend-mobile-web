import { describe, it, expect } from 'vitest';
import { loginSchema } from '../model/login.schema';

describe('loginSchema', () => {
  it('deve validar credenciais válidas', () => {
    const result = loginSchema.safeParse({
      email: 'owner@smartbarber.com',
      password: 'secretpassword',
    });

    expect(result.success).toBe(true);
  });

  it('deve rejeitar e-mail vazio', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: '123456',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Informe seu e-mail');
    }
  });

  it('deve rejeitar e-mail com formato inválido', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '123456',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Formato de e-mail inválido');
    }
  });

  it('deve rejeitar senha vazia', () => {
    const result = loginSchema.safeParse({
      email: 'owner@smartbarber.com',
      password: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Informe sua senha');
    }
  });
});
