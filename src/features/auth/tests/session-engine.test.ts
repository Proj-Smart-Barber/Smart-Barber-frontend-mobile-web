import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tokenStorage } from '@/shared/storage';
import { authApi } from '../api/auth.api';
import { normalizeAuthError } from '../lib/normalize-auth-error';
import { ApiError } from '@/shared/api';

describe('Session Engine Lifecycle Logic', () => {
  beforeEach(async () => {
    await tokenStorage.remove();
    vi.clearAllMocks();
  });

  it('deve armazenar token no login e recuperar perfil com sucesso', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJleHAiOjIwMDAwMDAwMDB9.signature';

    vi.spyOn(authApi, 'login').mockResolvedValue({ access_token: fakeToken });
    vi.spyOn(authApi, 'getMe').mockResolvedValue({
      id: 'user-1',
      name: 'Carlos Silva',
      email: 'owner@smartbarber.com',
      avatarUrl: null,
      role: 'OWNER',
    });

    const loginRes = await authApi.login({
      email: 'owner@smartbarber.com',
      password: 'secretpassword',
    });

    await tokenStorage.set(loginRes.access_token);
    const storedToken = await tokenStorage.get();
    expect(storedToken).toBe(fakeToken);

    const profile = await authApi.getMe(storedToken);
    expect(profile.id).toBe('user-1');
    expect(profile.role).toBe('OWNER');
  });

  it('deve remover token ao executar logout local', async () => {
    await tokenStorage.set('token-ativo');
    expect(await tokenStorage.get()).toBe('token-ativo');

    await tokenStorage.remove();
    expect(await tokenStorage.get()).toBeNull();
  });

  it('deve limpar token se a validação remota retornar token inválido ou malformado', async () => {
    await tokenStorage.set('invalid-token');

    const error = new ApiError('Internal Server Error', 500, {
      error: {
        name: 'JsonWebTokenError',
        message: 'jwt malformed',
      },
    });

    const normalized = normalizeAuthError(error);
    expect(normalized.shouldClearSession).toBe(true);

    if (normalized.shouldClearSession) {
      await tokenStorage.remove();
    }

    expect(await tokenStorage.get()).toBeNull();
  });

  it('NÃO deve remover token caso ocorra indisponibilidade temporária de rede ou erro 500 genérico', async () => {
    await tokenStorage.set('token-ativo');

    const generic500 = new ApiError('Internal Server Error', 500, {
      error: 'Conexão temporariamente recusada pelo banco',
    });

    const normalized = normalizeAuthError(generic500);
    expect(normalized.shouldClearSession).toBe(false);

    if (normalized.shouldClearSession) {
      await tokenStorage.remove();
    }

    expect(await tokenStorage.get()).toBe('token-ativo');
  });
});
