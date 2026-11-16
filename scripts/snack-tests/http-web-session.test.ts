import { afterEach, expect, it, vi } from 'vitest';
import { authApi } from '../../snack/src/features/auth/api/auth.api';
import { createSessionEngine } from '../../snack/src/features/auth/model/session-engine';
import { httpClient } from '../../snack/src/shared/api';
import { ENV } from '../../snack/src/shared/config/env';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('../../snack/demo/transport', () => ({ demoRequest: vi.fn() }));

afterEach(() => {
  httpClient.setSessionHooks(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const credentials = { email: 'user@example.test', password: 'fake-password' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json' },
});

function setup() {
  vi.useFakeTimers();
  const now = Date.now();
  const persistence = { read: vi.fn(), save: vi.fn(), clear: vi.fn(), markLogoutPending: vi.fn(), isLogoutPending: vi.fn() };
  const transport = { login: vi.fn(authApi.login.bind(authApi)), refresh: vi.fn(), signOut: vi.fn() };
  const engine = createSessionEngine({
    temporary: true, transport, persistence,
    loadIdentity: (token) => authApi.getIdentity(token),
    loadMemberships: (token) => authApi.getMemberships(token),
  });
  httpClient.setSessionHooks({
    getAccessToken: () => engine.getSnapshot().accessToken,
    captureAccessRejection: () => engine.captureAccessRejection(),
  });
  const fetch = vi.fn(async (url: string, options: RequestInit) => {
    expect(new URL(url).origin).toBe('https://api-black-theta-13.vercel.app');
    expect(options.credentials).toBe('omit');
    const headers = new Headers(options.headers);
    expect(headers.get('X-SmartBarber-Client')).toBe('web');
    if (url.endsWith('/sessions/auth')) {
      expect(headers.has('Authorization')).toBe(false);
      expect(JSON.parse(String(options.body))).toEqual(credentials);
      return json({
        access_token: 'fake-access-token', refresh_token: 'fake-refresh-token',
        accessExpiresAt: new Date(now + 1000).toISOString(), serverTime: new Date(now).toISOString(),
      }, 201);
    }
    expect(headers.get('Authorization')).toBe('Bearer fake-access-token');
    if (url.endsWith('/me/barbershops')) return json({ barbershops: [] });
    return json({ user: { id: 'test-user', name: 'Test', accountType: 'CLIENT' } });
  });
  vi.stubGlobal('fetch', fetch);
  return { engine, fetch, transport, persistence };
}

it('uses the generated HTTP variant and expires without persistence or refresh', async () => {
  expect(ENV.SNACK_HTTP_WEB).toBe(true);
  const { engine, fetch, transport, persistence } = setup();
  await engine.restore();
  expect(fetch).not.toHaveBeenCalled();
  await engine.signIn(credentials);
  expect(engine.getSnapshot().status).toBe('authenticated');
  expect(await transport.login.mock.results[0].value).not.toHaveProperty('refreshToken');
  expect(await transport.login.mock.results[0].value).not.toHaveProperty('refresh_token');
  expect(fetch).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(1000);
  expect(engine.getSnapshot()).toMatchObject({ status: 'unauthenticated', accessToken: null, identity: null, memberships: [] });
  await expect(engine.refresh()).rejects.toThrow();
  expect(transport.refresh).not.toHaveBeenCalled();
  expect(transport.signOut).not.toHaveBeenCalled();
  for (const method of Object.values(persistence)) expect(method).not.toHaveBeenCalled();
});

it('ignores stale 401s and drops the current session on an authenticated 401', async () => {
  const { engine, fetch, transport } = setup();
  await engine.signIn(credentials);
  let rejectOldRequest!: (response: Response) => void;
  fetch.mockImplementationOnce(() => new Promise(resolve => { rejectOldRequest = resolve; }));
  const oldRequest = expect(httpClient.get('/api/users/me')).rejects.toMatchObject({ status: 401 });
  await engine.signOut();
  expect(engine.getSnapshot().accessToken).toBeNull();
  await engine.signIn(credentials);
  rejectOldRequest(json({ error: 'invalid_token' }, 401));
  await oldRequest;
  expect(engine.getSnapshot().status).toBe('authenticated');
  fetch.mockResolvedValueOnce(json({ error: 'token_expired' }, 401));
  await expect(httpClient.get('/api/users/me')).rejects.toMatchObject({ status: 401 });
  expect(engine.getSnapshot().status).toBe('unauthenticated');
  expect(transport.signOut).not.toHaveBeenCalled();
});
