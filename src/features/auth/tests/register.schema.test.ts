import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  formatCpf,
  normalizeCpf,
  isValidCpf,
  validatePasswordPolicy,
} from '../model/register.schema';

describe('registerSchema & validações de CPF e senha', () => {
  it('deve formatar CPF corretamente com máscara 000.000.000-00', () => {
    expect(formatCpf('11144477735')).toBe('111.444.777-35');
    expect(formatCpf('123')).toBe('123');
    expect(formatCpf('123456')).toBe('123.456');
    expect(formatCpf('123456789')).toBe('123.456.789');
    expect(formatCpf('111.444.777-35')).toBe('111.444.777-35');
  });

  it('normalizeCpf deve extrair apenas dígitos', () => {
    expect(normalizeCpf('111.444.777-35')).toBe('11144477735');
    expect(normalizeCpf('abc123def')).toBe('123');
  });

  it('isValidCpf deve validar dígitos verificadores corretamente', () => {
    expect(isValidCpf('11144477735')).toBe(true);
    expect(isValidCpf('111.444.777-35')).toBe(true);

    // CPFs com dígitos repetidos (inválidos)
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);

    // CPFs com dígitos verificadores incorretos
    expect(isValidCpf('12345678900')).toBe(false);
    expect(isValidCpf('11144477730')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('validatePasswordPolicy deve validar tamanho mínimo de 15 caracteres e limite de 72 bytes UTF-8', () => {
    // Menos de 15 caracteres
    expect(validatePasswordPolicy('senha-curta').valid).toBe(false);
    expect(validatePasswordPolicy('12345678901234').valid).toBe(false);

    // Exatamente 15 caracteres válidos
    expect(validatePasswordPolicy('123456789012345').valid).toBe(true);
    expect(validatePasswordPolicy('senha-forte-12345').valid).toBe(true);

    // Excedendo 72 bytes em UTF-8
    const longAscii = 'a'.repeat(73);
    expect(validatePasswordPolicy(longAscii).valid).toBe(false);

    // Caracteres multibyte (ex: emoji tem 4 bytes cada; 19 emojis = 76 bytes)
    const emojiPassword = '🔐'.repeat(19); // 19 code points, mas 76 bytes UTF-8
    expect(validatePasswordPolicy(emojiPassword).valid).toBe(false);
  });

  it('deve aprovar dados de cadastro válidos com confirmação de senha idêntica', () => {
    const validData = {
      name: 'Carlos Silva',
      cpf: '111.444.777-35',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhafortesegura123',
      passwordConfirmation: 'minhasenhafortesegura123',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar confirmação de senha diferente da senha', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '111.444.777-35',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhafortesegura123',
      passwordConfirmation: 'outrasenhacompletamente',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('As senhas não coincidem');
    }
  });

  it('deve rejeitar CPF com dígitos verificadores inválidos', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '123.456.789-00',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhafortesegura123',
      passwordConfirmation: 'minhasenhafortesegura123',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('CPF inválido');
    }
  });

  it('deve rejeitar CPF com menos de 11 dígitos', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '111.444',
      email: 'carlos@smartbarber.com',
      password: 'minhasenhafortesegura123',
      passwordConfirmation: 'minhasenhafortesegura123',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('CPF deve conter 11 dígitos');
    }
  });

  it('deve rejeitar senha menor que 15 caracteres', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '111.444.777-35',
      email: 'carlos@smartbarber.com',
      password: 'senha-curta-12',
      passwordConfirmation: 'senha-curta-12',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('no mínimo 15 caracteres');
    }
  });

  it('deve rejeitar senha maior que 72 bytes em UTF-8', () => {
    const invalidData = {
      name: 'Carlos Silva',
      cpf: '111.444.777-35',
      email: 'carlos@smartbarber.com',
      password: 'a'.repeat(73),
      passwordConfirmation: 'a'.repeat(73),
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('não pode exceder 72 bytes');
    }
  });
});
