/**
 * Contrato (Port) para armazenamento seguro de tokens de autenticação
 */
export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  remove(): Promise<void>;
}
