import { afterEach, expect, it, vi } from 'vitest';
import configureApp from '../../../../app.config';
import staticConfig from '../../../../app.json';
import type { ConfigContext } from 'expo/config';

function resolve() {
  return configureApp({ config: staticConfig.expo as ConfigContext['config'],
    projectRoot: process.cwd(), staticConfigPath: null, packageJsonPath: null });
}

afterEach(() => vi.unstubAllEnvs());

it('preserves the existing identifiers, permissions and plugins without backend credentials', () => {
  vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', '');
  vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', '');
  vi.stubEnv('EAS_BUILD_PLATFORM', 'web');
  vi.stubEnv('GOOGLE_MAPS_API_KEY', 'backend-must-never-enter-client-config');
  const result = resolve();
  expect(result.android).toEqual(staticConfig.expo.android);
  expect(result.ios).toEqual(staticConfig.expo.ios);
  expect(result.plugins.slice(0, -1)).toEqual(staticConfig.expo.plugins);
  expect(JSON.stringify(result)).not.toContain('backend-must-never-enter-client-config');
});

it('passes the separate native keys to the installed maps plugin', () => {
  vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', ' android-fixture ');
  vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', ' ios-fixture ');
  const result = resolve();
  expect(result.plugins.at(-1)).toEqual(['react-native-maps', {
    androidGoogleMapsApiKey: 'android-fixture', iosGoogleMapsApiKey: 'ios-fixture',
  }]);
});

it.each(['android', 'ios'])('refuses a %s build without its platform key', (platform) => {
  vi.stubEnv('EAS_BUILD_PLATFORM', platform);
  vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', '');
  vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', '');
  expect(resolve).toThrow(`GOOGLE_MAPS_${platform.toUpperCase()}_API_KEY`);
});

it.each(['android', 'ios'])('accepts a %s build with only its platform key', (platform) => {
  vi.stubEnv('EAS_BUILD_PLATFORM', platform);
  vi.stubEnv('GOOGLE_MAPS_ANDROID_API_KEY', platform === 'android' ? 'android-fixture' : '');
  vi.stubEnv('GOOGLE_MAPS_IOS_API_KEY', platform === 'ios' ? 'ios-fixture' : '');
  expect(resolve).not.toThrow();
});
