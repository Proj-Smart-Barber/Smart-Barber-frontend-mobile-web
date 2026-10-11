import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ OS: 'web' }));
vi.mock('react-native', () => ({ Platform: platform }));

beforeEach(() => { platform.OS = 'web'; });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('Production web session origin', () => {
  it('uses the app origin even when an absolute API URL is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.example.com');
    const { ENV } = await import('../env');
    expect(ENV.API_URL).toBe('');
  });

  it('keeps an explicit development backend available locally', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3333');
    const { ENV } = await import('../env');
    expect(ENV.API_URL).toBe('http://localhost:3333');
  });

  it('keeps native production on its absolute API URL', async () => {
    platform.OS = 'android';
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.example.com');
    const { ENV } = await import('../env');
    expect(ENV.API_URL).toBe('https://api.example.com');
  });
});
