import * as SecureStore from 'expo-secure-store';
import { TokenStorage } from './token-storage';

const SECURE_TOKEN_KEY = 'smart_barber_access_token';

/**
 * Adaptador Nativo (Android / iOS) utilizando Expo SecureStore
 */
export class NativeTokenStorage implements TokenStorage {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async set(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
    } catch (err) {
      console.warn('Erro ao gravar token no SecureStore:', err);
    }
  }

  async remove(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    } catch (err) {
      console.warn('Erro ao remover token do SecureStore:', err);
    }
  }
}
