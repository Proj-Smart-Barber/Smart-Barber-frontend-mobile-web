import { describe, it, expect } from 'vitest';
import { registerSchema, formatCpf } from '../model/register.schema';

describe('registerSchema & formatCpf', () => {
  it('deve formatar CPF corretamente com máscara 000.000.000-00', () => {
    expect(formatCpf('12345678900')).toBe('123.456.789-00');
    expect(formatCpf('123')).toBe('123');
    expect(formatCpf('123456')).toBe('123.456');
    expect(formatCpf('123456789')).toBe('123.456.789');
    expect(formatCpf('123.456.789-00')).toBe('123.456.789-00');
  });

  it('deve aprovar dados de cadastro válidos com confirmação de senha idêntica', () => {
    const validData = {
      name: 'Carlos Silva',
      cpf: '123.456.789-00',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhaforte',
      passwordConfirmation: 'minhasenhaforte',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar confirmação de senha diferente da senha', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '123.456.789-00',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhaforte',
      passwordConfirmation: 'outrasenha',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('As senhas não coincidem');
    }
  });

  it('deve rejeitar CPF com quantidade de dígitos menor que 11', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '123.456',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhaforte',
      passwordConfirmation: 'minhasenhaforte',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('CPF deve conter 11 dígitos');
    }
  });

  it('deve rejeitar senha menor que 6 caracteres', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '123.456.789-00',
      email: 'carlos@smartbarber.com',
      password: '123',
      passwordConfirmation: '123',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('no mínimo 6 caracteres');
    }
  });
});
