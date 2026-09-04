import { TokenStorage } from './token-storage';

/**
 * Adaptador em memória para testes ou ambientes sem storage persistente
 */
export class MemoryTokenStorage implements TokenStorage {
  private memoryToken: string | null = null;

  async get(): Promise<string | null> {
    return this.memoryToken;
  }

  async set(token: string): Promise<void> {
    this.memoryToken = token;
  }

  async remove(): Promise<void> {
    this.memoryToken = null;
  }
}
