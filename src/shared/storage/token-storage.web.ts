import { TokenStorage } from './token-storage';

const SESSION_TOKEN_KEY = 'smart_barber_access_token';

/**
 * Adaptador Web utilizando sessionStorage conforme Seção 15 do Plano
 */
export class WebTokenStorage implements TokenStorage {
  async get(): Promise<string | null> {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    try {
      return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async set(token: string): Promise<void> {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } catch (err) {
      console.warn('Erro ao salvar token no sessionStorage:', err);
    }
  }

  async remove(): Promise<void> {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    try {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch (err) {
      console.warn('Erro ao remover token do sessionStorage:', err);
    }
  }
}
