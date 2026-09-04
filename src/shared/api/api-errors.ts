/**
 * Erros normalizados de transporte HTTP
 */

export class ApiError<T = any> extends Error {
  public readonly status: number;
  public readonly data: T;
  public readonly isNetworkError: boolean;

  constructor(message: string, status: number, data?: T, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data as T;
    this.isNetworkError = isNetworkError;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
