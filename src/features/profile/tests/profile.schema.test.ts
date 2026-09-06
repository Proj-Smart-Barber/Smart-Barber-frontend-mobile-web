import { describe, it, expect } from 'vitest';
import { profileSchema } from '../model/profile.schema';

describe('profileSchema', () => {
  it('deve validar com sucesso nome e avatarUrl válidos', () => {
    const result = profileSchema.safeParse({
      name: 'Wellington Porto',
      avatarUrl: 'https://github.com/wellingtonspdev.png',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Wellington Porto');
      expect(result.data.avatarUrl).toBe('https://github.com/wellingtonspdev.png');
    }
  });

  it('deve aceitar avatarUrl vazio ou nulo (opcional)', () => {
    const resultEmpty = profileSchema.safeParse({
      name: 'Wellington Porto',
      avatarUrl: '',
    });
    expect(resultEmpty.success).toBe(true);

    const resultNull = profileSchema.safeParse({
      name: 'Wellington Porto',
      avatarUrl: null,
    });
    expect(resultNull.success).toBe(true);
  });

  it('deve falhar se o nome tiver menos de 3 caracteres', () => {
    const result = profileSchema.safeParse({
      name: 'Al',
      avatarUrl: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('mínimo 3 caracteres');
    }
  });

  it('deve falhar se o avatarUrl for uma URL inválida', () => {
    const result = profileSchema.safeParse({
      name: 'Wellington Porto',
      avatarUrl: 'nao-e-uma-url',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('URL de imagem válida');
    }
  });
});
