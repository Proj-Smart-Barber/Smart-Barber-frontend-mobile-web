import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('shares the hosted catalog from the HTTP preview rather than its iframe', async () => {
  vi.stubEnv('EXPO_PUBLIC_WEB_URL', '');
  vi.stubGlobal('window', { location: { origin: 'https://snack-runtime.eascdn.net' } });
  const { ENV, getPublicCatalogUrl } = await import('../../snack/src/shared/config/env');
  expect(getPublicCatalogUrl('test-shop')).toBe(
    ENV.SNACK_HTTP_WEB
      ? 'https://app.smartbarber.wellingtonsp.uk/barbershops/test-shop/services'
      : 'https://snack-runtime.eascdn.net/barbershops/test-shop/services',
  );
});
