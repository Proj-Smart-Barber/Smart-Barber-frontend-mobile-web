import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-native': 'react-native-web',
      'expo/build/async-require/hmr': path.resolve(
        __dirname,
        './node_modules/expo/build/async-require/hmr.js'
      ),
    },
  },
});
