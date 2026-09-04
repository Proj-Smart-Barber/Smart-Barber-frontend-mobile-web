import { ENV } from '../config/env';
import { tokenStorage } from '../storage';
import { ApiError } from './api-errors';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  timeoutMs?: number;
}

export class HttpClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;

  constructor(baseUrl: string = ENV.API_URL, defaultTimeoutMs: number = 15000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers: customHeaders = {},
      body,
      params,
      token,
      timeoutMs = this.defaultTimeoutMs,
      ...rest
    } = options;

    const url = this.buildUrl(path, params);

    // Resolução de token de autorização
    let authToken = token;
    if (authToken === undefined) {
      authToken = await tokenStorage.get();
    }

    const headers = new Headers(customHeaders);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (body && !headers.has('Content-Type') && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let serializedBody: BodyInit | null | undefined = undefined;
    if (body) {
      serializedBody = body instanceof FormData ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: serializedBody,
        signal: controller.signal,
        ...rest,
      });

      clearTimeout(timeoutId);

      // Tratamento de respostas vazias (ex: 204 No Content)
      if (response.status === 204) {
        return null as unknown as T;
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData: any = null;

      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      } else {
        try {
          responseData = await response.text();
        } catch {
          responseData = null;
        }
      }

      if (!response.ok) {
        const errorMessage =
          responseData?.error?.message ||
          (typeof responseData?.error === 'string' ? responseData.error : null) ||
          responseData?.message ||
          `Erro HTTP ${response.status}: ${response.statusText}`;

        throw new ApiError(errorMessage, response.status, responseData, false);
      }

      return responseData as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      const isAbort = err.name === 'AbortError';
      const isNetwork = isAbort || err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch');

      const message = isAbort
        ? 'A requisição excedeu o tempo limite (timeout). Verifique sua conexão.'
        : isNetwork
        ? 'Falha de conexão com o servidor. Verifique se o dispositivo está conectado à internet.'
        : err.message || 'Erro inesperado na comunicação HTTP.';

      throw new ApiError(message, 0, null, true);
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  patch<T>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
