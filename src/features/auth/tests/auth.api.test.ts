import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi } from '../api/auth.api';

describe('AuthApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve realizar login chamando POST /api/users/sessions/auth e retornar access_token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ access_token: 'fake-jwt-token' }),
    } as Response);

    const result = await authApi.login({
      email: 'owner@smartbarber.com',
      password: 'secretpassword',
    });

    expect(result.access_token).toBe('fake-jwt-token');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/sessions/auth'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('deve cadastrar staff chamando POST /api/users/ e retornar staffId', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ staffId: 'new-staff-uuid' }),
    } as Response);

    const result = await authApi.register({
      name: 'Novo Barbeiro',
      email: 'novo@smartbarber.com',
      password: 'password123',
      cpf: '111.222.333-44',
    });

    expect(result.staffId).toBe('new-staff-uuid');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('deve buscar perfil /me e normalizar role OWNER', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        staff: {
          id: 'user-uuid',
          name: 'Carlos Silva',
          email: 'owner@smartbarber.com',
          avatarUrl: null,
          role: 'OWNER',
        },
        barbershop: {
          id: 'shop-uuid',
          name: 'Smart Barber',
          timezone: 'America/Sao_Paulo',
        },
      }),
    } as Response);

    const profile = await authApi.getMe('test-token');
    expect(profile.staff.id).toBe('user-uuid');
    expect(profile.staff.role).toBe('OWNER');
    expect(profile.barbershop?.id).toBe('shop-uuid');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/me'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      })
    );
  });

  it('deve aceitar payload de perfil com campo user em vez de staff', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        user: {
          id: 'user-uuid-2',
          name: 'Wellington Porto',
          email: 'wellington@smartbarber.com',
          avatarUrl: null,
          role: 'OWNER',
        },
      }),
    } as Response);

    const profile = await authApi.getMe('test-token');
    expect(profile.staff.id).toBe('user-uuid-2');
    expect(profile.staff.name).toBe('Wellington Porto');
  });
});
