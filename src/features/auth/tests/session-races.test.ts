import { describe, it, expect, vi } from 'vitest';
import { createSessionEngine } from '../model/session-engine';
import type { SessionGrant } from '../api/auth.dto';
import type { StoredSession } from '@/shared/storage';
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const grant = (actor: string): SessionGrant => ({
  accessToken: actor,
  refreshToken: actor + '-refresh',
  accessExpiresAt: '2030-01-01T00:00:00Z',
  sessionExpiresAt: '2030-02-01T00:00:00Z',
  serverTime: '2026-11-11T00:00:00Z',
});
function fixture() {
  let saved: StoredSession | null = null;
  const transport = {
    login: vi.fn(async (input: { email: string }) => grant(input.email)),
    refresh: vi.fn(async () => grant('A')),
    signOut: vi.fn(async () => {}),
  };
  const persistence = {
    read: async () => saved,
    save: async (value: StoredSession) => {
      saved = value;
    },
    clear: async () => {
      saved = null;
    },
    markLogoutPending: async () => {
      saved = null;
    },
    isLogoutPending: async () => false,
  };
  const engine = createSessionEngine({
    transport,
    persistence,
    loadIdentity: async (token) => ({
      id: token,
      name: token,
      email: token + '@example.invalid',
      accountType: 'CLIENT',
      emailVerifiedAt: null,
    }),
    loadMemberships: async () => [],
  });
  return { engine, transport, saved: () => saved };
}
describe('session changes and in-flight operations', () => {
  it('rejects an old refresh after another actor signs in', async () => {
    const f = fixture();
    await f.engine.signIn({ email: 'A', password: 'test' });
    const old = deferred<SessionGrant>();
    f.transport.refresh.mockReturnValueOnce(old.promise);
    const refreshing = f.engine.refresh();
    const rejected = expect(refreshing).rejects.toThrow('SESSION_CHANGED');
    await Promise.resolve();
    await f.engine.signOut();
    await f.engine.signIn({ email: 'B', password: 'test' });
    old.resolve(grant('A-stale'));
    await rejected;
    expect(f.engine.getSnapshot().identity?.id).toBe('B');
    expect(f.engine.getSnapshot().accessToken).toBe('B');
    expect(f.saved()?.accessToken).toBe('B');
  });
  it('keeps a new session when old remote logout finishes late', async () => {
    const f = fixture();
    await f.engine.signIn({ email: 'A', password: 'test' });
    const remote = deferred<void>();
    f.transport.signOut.mockReturnValueOnce(remote.promise);
    const logout = f.engine.signOut();
    expect(f.engine.getSnapshot().status).toBe('unauthenticated');
    await Promise.resolve();
    await f.engine.signIn({ email: 'B', password: 'test' });
    remote.resolve();
    await logout;
    expect(f.engine.getSnapshot().identity?.id).toBe('B');
    expect(f.saved()?.accessToken).toBe('B');
  });
});
