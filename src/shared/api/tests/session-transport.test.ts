import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Platform } from 'react-native';
import { httpClient } from '../http-client';
import { authApi } from '@/features/auth/api/auth.api';
import { mapMeResponseToIdentity } from '@/features/auth/api/auth.mapper';
import { ApiError } from '../api-errors';

describe('Session Transport & Contract Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('web_refresh_has_no_secret_body', async () => {
    Platform.OS = 'web';
    let interceptedBody: any = null;

    vi.spyOn(httpClient, 'post').mockImplementation(async (_path, body) => {
      interceptedBody = body;
      return {
        access_token: 'new-acc-tok',
        serverTime: '2026-10-11T12:00:00.000Z',
      } as any;
    });

    await authApi.refresh('secret-refresh-should-be-omitted-on-web');
    expect(interceptedBody).toEqual({});
  });

  it('native_refresh_sends_secret', async () => {
    Platform.OS = 'android';
    let interceptedBody: any = null;

    vi.spyOn(httpClient, 'post').mockImplementation(async (_path, body) => {
      interceptedBody = body;
      return {
        access_token: 'new-acc-tok',
        refresh_token: 'new-ref-tok',
        serverTime: '2026-10-11T12:00:00.000Z',
      } as any;
    });

    await authApi.refresh('refresh-fixture');
    expect(interceptedBody).toEqual({ refresh_token: 'refresh-fixture' });
  });

  it('profile_requires_account_type', () => {
    const invalidProfile: any = {
      user: {
        id: 'user-123',
        name: 'User Without AccountType',
        email: 'test@example.com',
      },
    };

    expect(() => mapMeResponseToIdentity(invalidProfile)).toThrow(
      /accountType é obrigatório/,
    );
  });

  it('sign_out_accepts_204', async () => {
    Platform.OS = 'ios';
    vi.spyOn(httpClient, 'post').mockResolvedValue(null as any);

    await expect(authApi.signOut('refresh-tok')).resolves.toBeUndefined();
  });

  it('server_error_is_not_invalid_credentials', () => {
    const error503 = new ApiError('Service Unavailable', 503, { error: 'DB down' }, false);
    expect(error503.status).toBe(503);
    expect(error503.isNetworkError).toBe(false);
  });
});
