import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const iosGoogleMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();
  const platform = process.env.EAS_BUILD_PLATFORM;

  if (platform === 'android' && !androidGoogleMapsApiKey) {
    throw new Error('Configure GOOGLE_MAPS_ANDROID_API_KEY no ambiente do build Android.');
  }
  if (platform === 'ios' && !iosGoogleMapsApiKey) {
    throw new Error('Configure GOOGLE_MAPS_IOS_API_KEY no ambiente do build iOS.');
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { androidGoogleMapsApiKey, iosGoogleMapsApiKey }],
    ],
  };
};
