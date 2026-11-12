import {utf8Bytes} from '../lib/utf8-size';
import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { tokenStorage } from '../storage';
import { ApiError } from './api-errors';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  timeoutMs?: number;
  publicRequest?: boolean;
}

export interface HttpTelemetryEvent {
  method: string;
  sanitizedPath: string;
  status: number;
  durationMs: number;
  payloadBytes: number;
  serverTiming: string | null;
  sqlCount: number | null;
  publicRequest: boolean;
  aborted: boolean;
  timestamp: number;
}

export type HttpTelemetryListener = (event: HttpTelemetryEvent) => void;

export interface SessionHooks {
  getAccessToken?: () => string | null;
  onAccessExpired?: () => Promise<void>;
}

function sanitizeTelemetryPath(path: string): string {
  const withoutQuery = path.split('?')[0] || '/';
  const clean = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return clean.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id',
  );
}

export class HttpClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;
  private sessionHooks: SessionHooks | null = null;
  private telemetryListeners: Set<HttpTelemetryListener> = new Set();
  private recentTelemetry: HttpTelemetryEvent[] = [];
  private static readonly MAX_TELEMETRY_BUFFER = 100;

  constructor(baseUrl: string = ENV.API_URL, defaultTimeoutMs: number = 15000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  setSessionHooks(hooks: SessionHooks | null): void {
    this.sessionHooks = hooks;
  }

  subscribeTelemetry(listener: HttpTelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  getRecentTelemetry(): readonly HttpTelemetryEvent[] {
    return this.recentTelemetry;
  }

  clearTelemetry(): void {
    this.recentTelemetry = [];
  }

  private emitTelemetry(event: HttpTelemetryEvent): void {
    this.recentTelemetry.push(event);
    if (this.recentTelemetry.length > HttpClient.MAX_TELEMETRY_BUFFER) {
      this.recentTelemetry.shift();
    }
    for (const listener of this.telemetryListeners) {
      try {
        listener(event);
      } catch {
        // Telemetria nunca interrompe o fluxo de requisição
      }
    }
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
      publicRequest = false,
      signal: callerSignal,
      ...rest
    } = options;

    const url = this.buildUrl(path, params);
    const startedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const sanitizedPath = sanitizeTelemetryPath(path);

    // Resolução de token de autorização (omitido em requisições públicas explícitas)
    let authToken = publicRequest ? null : token;
    if (!publicRequest && authToken === undefined) {
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

    if (authToken && !publicRequest) {
      headers.set('Authorization', `Bearer ${authToken}`);
    } else if (publicRequest && headers.has('Authorization')) {
      headers.delete('Authorization');
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
      ...(publicRequest ? { credentials: 'omit' as RequestCredentials } : {}),
    };

    try {
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      const serverTiming = response.headers?.get?.('server-timing') ?? null;
      const sqlCountRaw = response.headers?.get?.('x-sql-count');
      const sqlCount = sqlCountRaw !== null && sqlCountRaw !== undefined ? Number(sqlCountRaw) : null;

      // Tratamento de respostas vazias (ex: 204 No Content)
      if (response.status === 204) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.emitTelemetry({
          method,
          sanitizedPath,
          status: 204,
          durationMs: Math.max(0, Number((now - startedAtMs).toFixed(2))),
          payloadBytes: 0,
          serverTiming,
          sqlCount: Number.isFinite(sqlCount) ? sqlCount : null,
          publicRequest,
          aborted: false,
          timestamp: Date.now(),
        });
        return null as unknown as T;
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData: any = null;
      let payloadBytes = 0;

      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json();
          payloadBytes = responseData == null ? 0 : utf8Bytes(JSON.stringify(responseData));
        } catch {
          responseData = null;
        }
      } else {
        try {
          responseData = await response.text();
          payloadBytes = typeof responseData === 'string' ? utf8Bytes(responseData) : 0;
        } catch {
          responseData = null;
        }
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.emitTelemetry({
        method,
        sanitizedPath,
        status: response.status,
        durationMs: Math.max(0, Number((now - startedAtMs).toFixed(2))),
        payloadBytes,
        serverTiming,
        sqlCount: Number.isFinite(sqlCount) ? sqlCount : null,
        publicRequest,
        aborted: false,
        timestamp: Date.now(),
      });

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
      if (callerSignal?.aborted) throw new ApiError('Requisição cancelada.',0,{code:'REQUEST_CANCELLED'},false);
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.emitTelemetry({
        method,
        sanitizedPath,
        status: 0,
        durationMs: Math.max(0, Number((now - startedAtMs).toFixed(2))),
        payloadBytes: 0,
        serverTiming: null,
        sqlCount: null,
        publicRequest,
        aborted: isAbort,
        timestamp: Date.now(),
      });
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
