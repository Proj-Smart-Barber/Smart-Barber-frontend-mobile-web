import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth.api';
import { registerSchema, validatePasswordPolicy } from '../model/register.schema';
import { httpClient } from '@/shared/api';

const registration = {
  name: 'Cliente Teste', cpf: '11144477735', email: 'client@example.com',
  password: 'senha123', passwordConfirmation: 'senha123',
};

describe('Cadastro público de cliente', () => {
  const expired = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    expired.mockClear();
    httpClient.setSessionHooks({ getAccessToken: () => 'stale-token', onAccessExpired: expired });
  });
  afterEach(() => { httpClient.setSessionHooks(null); vi.unstubAllGlobals(); });

  it('aceita exatamente 8 caracteres, rejeita 7 e mantém o limite UTF-8', () => {
    expect(registerSchema.safeParse(registration).success).toBe(true);
    expect(validatePasswordPolicy('1234567').valid).toBe(false);
    expect(validatePasswordPolicy('🔐'.repeat(8)).valid).toBe(true);
    expect(validatePasswordPolicy('🔐'.repeat(7)).valid).toBe(false);
    expect(validatePasswordPolicy('a'.repeat(72)).valid).toBe(true);
    expect(validatePasswordPolicy('a'.repeat(73)).valid).toBe(false);
  });

  it('cadastra e solicita verificação sem bearer ou cookies antigos', async () => {
    const fetchSpy = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ userId: 'new-client' }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchSpy);
    await authApi.register({ ...registration, onboardingIntent: 'CLIENT' });
    await authApi.sendEmailVerification(registration.email);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(new URL(fetchSpy.mock.calls[0][0]).pathname).toBe('/api/users');
    for (const [, options] of fetchSpy.mock.calls) {
      expect(new Headers(options.headers).has('Authorization')).toBe(false);
      expect(options.credentials).toBe('omit');
    }
    expect(expired).not.toHaveBeenCalled();
  });

  it('não inicia recuperação de sessão se uma chamada pública falhar com 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'public_error' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })));
    await expect(authApi.register({ ...registration, onboardingIntent: 'CLIENT' })).rejects.toMatchObject({ status: 401 });
    expect(expired).not.toHaveBeenCalled();
  });

  it('usa os dois aliases sem barra final quando o endpoint primário retorna 404', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response('NOT_FOUND', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ userId: 'new-client' }), {
        status: 201, headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(authApi.register({ ...registration, onboardingIntent: 'CLIENT' }))
      .resolves.toMatchObject({ userId: 'new-client' });
    expect(fetchSpy.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/api/users', '/api/staffs']);
    expect(expired).not.toHaveBeenCalled();
  });

  it('preserva a recuperação para uma requisição autenticada protegida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })));
    await expect(authApi.getIdentity('stale-token')).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
  });
});
