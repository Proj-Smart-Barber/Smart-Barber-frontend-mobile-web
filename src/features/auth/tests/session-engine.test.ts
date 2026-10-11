import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSessionEngine, SessionEngine } from '../model/session-engine';
import { WebSessionStorage } from '@/shared/storage/session-storage.web';
import { ApiError } from '@/shared/api';
import type { SessionGrant } from '../api/auth.dto';
import type { AuthIdentity, Membership } from '@/entities/user';

describe('Session Engine Core Lifecycle', () => {
  let storage: WebSessionStorage;
  let transport: {
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  let loadIdentity: ReturnType<typeof vi.fn>;
  let loadMemberships: ReturnType<typeof vi.fn>;

  const fakeGrant: SessionGrant = {
    accessToken: 'valid-acc-token',
    refreshToken: 'valid-ref-token',
    accessExpiresAt: '2026-10-11T13:00:00.000Z',
    sessionExpiresAt: '2026-11-11T13:00:00.000Z',
    serverTime: '2026-10-11T12:00:00.000Z',
  };

  const fakeIdentity: AuthIdentity = {
    id: 'user-1',
    name: 'Carlos Silva',
    email: 'carlos@example.com',
    accountType: 'OWNER',
    emailVerifiedAt: '2026-10-11T10:00:00.000Z',
  };

  const fakeMemberships: Membership[] = [
    {
      id: 'shop-1',
      name: 'Smart Barber Central',
      role: 'OWNER',
      status: 'ACTIVE',
      timezone: 'America/Sao_Paulo',
    },
  ];

  beforeEach(() => {
    storage = new WebSessionStorage();
    transport = {
      login: vi.fn().mockResolvedValue(fakeGrant),
      refresh: vi.fn().mockResolvedValue(fakeGrant),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    loadIdentity = vi.fn().mockResolvedValue(fakeIdentity);
    loadMemberships = vi.fn().mockResolvedValue(fakeMemberships);
  });

  it('concurrent_expiry_refreshes_once', async () => {
    const engine = createSessionEngine({
      transport,
      persistence: storage,
      loadIdentity,
      loadMemberships,
    });

    const [res1, res2] = await Promise.all([engine.refresh(), engine.refresh()]);

    expect(transport.refresh).toHaveBeenCalledTimes(1);
    expect(res1.accessToken).toBe(fakeGrant.accessToken);
    expect(res2.accessToken).toBe(fakeGrant.accessToken);
  });

  it('logout_blocks_late_restore', async () => {
    const engine = createSessionEngine({
      transport,
      persistence: storage,
      loadIdentity,
      loadMemberships,
    });

    await engine.signIn({ email: 'carlos@example.com', password: 'password123' });
    expect(engine.getSnapshot().status).toBe('authenticated');

    await engine.signOut();
    expect(engine.getSnapshot().status).toBe('unauthenticated');

    await engine.restore();
    expect(engine.getSnapshot().status).toBe('unauthenticated');
  });

  it('offline_logout_survives_restart', async () => {
    const engine1 = createSessionEngine({
      transport,
      persistence: storage,
      loadIdentity,
      loadMemberships,
    });

    await engine1.signIn({ email: 'carlos@example.com', password: 'password123' });
    transport.signOut.mockRejectedValue(new Error('Network offline'));
    await engine1.signOut();

    // Novo engine criado após restart da aplicação
    const engine2 = createSessionEngine({
      transport,
      persistence: storage,
      loadIdentity,
      loadMemberships,
    });

    await engine2.restore();
    expect(engine2.getSnapshot().status).toBe('unauthenticated');
    expect(loadIdentity).toHaveBeenCalledTimes(1); // Somente da primeira sessão, não na restauração
  });

  it('ambiguous_native_refresh_revokes_before_login', async () => {
    const engine = createSessionEngine({
      transport,
      persistence: storage,
      loadIdentity,
      loadMemberships,
    });

    await engine.signIn({ email: 'carlos@example.com', password: 'password123' });

    // Refresh falha com 401
    transport.refresh.mockRejectedValue(new ApiError('Token expired', 401));
    await expect(engine.refresh()).rejects.toThrow();

    expect(engine.getSnapshot().revocationPending).toBe(true);

    // Próximo signIn revoga o token anterior antes de autenticar o novo
    await engine.signIn({ email: 'carlos@example.com', password: 'password123' });
    expect(transport.signOut).toHaveBeenCalledWith('valid-ref-token');
    expect(engine.getSnapshot().revocationPending).toBe(false);
  });

  it('storage_failure_is_reported', async () => {
    const faultyStorage = {
      read: vi.fn().mockRejectedValue(new Error('SecureStore disk failure')),
      save: vi.fn(),
      markLogoutPending: vi.fn(),
      clear: vi.fn(),
      isLogoutPending: vi.fn().mockResolvedValue(false),
    };

    const engine = createSessionEngine({
      transport,
      persistence: faultyStorage,
      loadIdentity,
      loadMemberships,
    });

    await expect(engine.restore()).rejects.toThrow('SecureStore disk failure');
    expect(engine.getSnapshot().error?.message).toContain('SecureStore disk failure');
  });
});
