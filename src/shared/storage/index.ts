import { Platform } from 'react-native';
import { TokenStorage } from './token-storage';
import { MemoryTokenStorage } from './token-storage.memory';
import { WebTokenStorage } from './token-storage.web';

export * from './token-storage';
export * from './token-storage.memory';
export * from './token-storage.web';

function createTokenStorage(): TokenStorage {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return new MemoryTokenStorage();
  }

  if (Platform.OS === 'web') {
    return new WebTokenStorage();
  }

  try {
    const { NativeTokenStorage } = require('./token-storage.native');
    return new NativeTokenStorage();
  } catch {
    return new WebTokenStorage();
  }
}

export const tokenStorage: TokenStorage = createTokenStorage();
