import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { tokenStorage } from '../storage';
import { ApiError } from './api-errors';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  timeoutMs?: number;
}

export interface SessionHooks {
  getAccessToken?: () => string | null;
  onAccessExpired?: () => Promise<void>;
}

export class HttpClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;
  private sessionHooks: SessionHooks | null = null;

  constructor(baseUrl: string = ENV.API_URL, defaultTimeoutMs: number = 15000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  setSessionHooks(hooks: SessionHooks | null): void {
    this.sessionHooks = hooks;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    let base = this.baseUrl;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (!base || base.startsWith('/'))) {
      base = window.location.origin;
    }

    const url = new URL(`${base}${cleanPath}`);

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
      signal: callerSignal,
      ...rest
    } = options;

    const url = this.buildUrl(path, params);

    // Resolução de token de autorização
    let authToken = token;
    if (authToken === undefined) {
      const hookToken = this.sessionHooks?.getAccessToken?.();
      authToken = hookToken !== undefined ? hookToken : await tokenStorage.get();
    }

    const headers = new Headers(customHeaders);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (!headers.has('X-SmartBarber-Client')) {
      headers.set('X-SmartBarber-Client', Platform.OS === 'web' ? 'web' : 'native');
    }

    if (body && !headers.has('Content-Type') && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let serializedBody: BodyInit | null | undefined = undefined;
    if (body) {
      serializedBody = body instanceof FormData ? body : JSON.stringify(body);
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: serializedBody,
      signal: controller.signal,
      ...rest,
    };

    try {
      const response = await fetch(url, fetchOptions);

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
        if (response.status === 401 && authToken && !path.includes('/sessions/')) {
          void this.sessionHooks?.onAccessExpired?.().catch(() => {});
        }

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
      const isNetwork =
        isAbort ||
        err.message?.includes('Network request failed') ||
        err.message?.includes('Failed to fetch');

      const message = isAbort
        ? 'A requisição excedeu o tempo limite (timeout). Verifique sua conexão.'
        : isNetwork
        ? 'Falha de conexão com o servidor. Verifique se o dispositivo está conectado à internet.'
        : err.message || 'Erro inesperado na comunicação HTTP.';

      throw new ApiError(message, 0, null, true);
    } finally {
      callerSignal?.removeEventListener('abort', abortFromCaller);
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

  delete<T>(
    path: string,
    bodyOrOptions?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    if (
      bodyOrOptions &&
      typeof bodyOrOptions === 'object' &&
      options === undefined &&
      ('headers' in bodyOrOptions ||
        'params' in bodyOrOptions ||
        'token' in bodyOrOptions ||
        'timeoutMs' in bodyOrOptions ||
        'body' in bodyOrOptions)
    ) {
      return this.request<T>(path, { ...bodyOrOptions, method: 'DELETE' });
    }

    return this.request<T>(path, {
      ...options,
      method: 'DELETE',
      body: bodyOrOptions,
    });
  }
}

export const httpClient = new HttpClient();
