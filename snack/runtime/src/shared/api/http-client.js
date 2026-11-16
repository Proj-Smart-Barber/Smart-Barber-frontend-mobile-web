import { demoRequest } from '../../../demo/transport';
import { utf8Bytes } from '../lib/utf8-size';
import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { tokenStorage } from '../storage';
import { ApiError } from './api-errors';
function sanitizeTelemetryPath(path) {
    const withoutQuery = path.split('?')[0] || '/';
    const clean = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    return clean.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
}
export class HttpClient {
    constructor(baseUrl = ENV.API_URL, defaultTimeoutMs = 15000) {
        this.sessionHooks = null;
        this.telemetryListeners = new Set();
        this.recentTelemetry = [];
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.defaultTimeoutMs = defaultTimeoutMs;
    }
    setSessionHooks(hooks) {
        this.sessionHooks = hooks;
    }
    subscribeTelemetry(listener) {
        this.telemetryListeners.add(listener);
        return () => {
            this.telemetryListeners.delete(listener);
        };
    }
    getRecentTelemetry() {
        return this.recentTelemetry;
    }
    clearTelemetry() {
        this.recentTelemetry = [];
    }
    emitTelemetry(event) {
        this.recentTelemetry.push(event);
        if (this.recentTelemetry.length > HttpClient.MAX_TELEMETRY_BUFFER) {
            this.recentTelemetry.shift();
        }
        for (const listener of this.telemetryListeners) {
            try {
                listener(event);
            }
            catch {
                // Telemetria nunca interrompe o fluxo de requisição
            }
        }
    }
    buildUrl(path, params) {
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
    async request(path, options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const { method = 'GET', headers: customHeaders = {}, body, params, token, timeoutMs = this.defaultTimeoutMs, publicRequest = false, signal: callerSignal, ...rest } = options;
        if (!ENV.SNACK_HTTP_WEB)
            return demoRequest(path, options);
        const url = this.buildUrl(path, params);
        const startedAtMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const sanitizedPath = sanitizeTelemetryPath(path);
        // Resolução de token de autorização (omitido em requisições públicas explícitas)
        let authToken = publicRequest ? null : token;
        if (!publicRequest && authToken === undefined) {
            const hookToken = (_b = (_a = this.sessionHooks) === null || _a === void 0 ? void 0 : _a.getAccessToken) === null || _b === void 0 ? void 0 : _b.call(_a);
            authToken = ENV.SNACK_HTTP_WEB ? hookToken !== null && hookToken !== void 0 ? hookToken : null : hookToken !== undefined ? hookToken : await tokenStorage.get();
        }
        const rejectAccess = (_d = (_c = this.sessionHooks) === null || _c === void 0 ? void 0 : _c.captureAccessRejection) === null || _d === void 0 ? void 0 : _d.call(_c);
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
        }
        else if (publicRequest && headers.has('Authorization')) {
            headers.delete('Authorization');
        }
        const controller = new AbortController();
        const abortFromCaller = () => controller.abort();
        if (callerSignal === null || callerSignal === void 0 ? void 0 : callerSignal.aborted)
            controller.abort();
        else
            callerSignal === null || callerSignal === void 0 ? void 0 : callerSignal.addEventListener('abort', abortFromCaller, { once: true });
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        let serializedBody = undefined;
        if (body) {
            serializedBody = body instanceof FormData ? body : JSON.stringify(body);
        }
        const fetchOptions = {
            method,
            headers,
            body: serializedBody,
            signal: controller.signal,
            ...rest,
            ...(publicRequest || ENV.SNACK_HTTP_WEB ? { credentials: 'omit' } : {}),
            ...(ENV.SNACK_HTTP_WEB ? { redirect: 'error', cache: 'no-store' } : {}),
        };
        try {
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            const serverTiming = (_g = (_f = (_e = response.headers) === null || _e === void 0 ? void 0 : _e.get) === null || _f === void 0 ? void 0 : _f.call(_e, 'server-timing')) !== null && _g !== void 0 ? _g : null;
            const sqlCountRaw = (_j = (_h = response.headers) === null || _h === void 0 ? void 0 : _h.get) === null || _j === void 0 ? void 0 : _j.call(_h, 'x-sql-count');
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
                return null;
            }
            const contentType = response.headers.get('content-type') || '';
            let responseData = null;
            let payloadBytes = 0;
            if (contentType.includes('application/json')) {
                try {
                    responseData = await response.json();
                    payloadBytes = responseData == null ? 0 : utf8Bytes(JSON.stringify(responseData));
                }
                catch {
                    responseData = null;
                }
            }
            else {
                try {
                    responseData = await response.text();
                    payloadBytes = typeof responseData === 'string' ? utf8Bytes(responseData) : 0;
                }
                catch {
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
                    if (ENV.SNACK_HTTP_WEB)
                        rejectAccess === null || rejectAccess === void 0 ? void 0 : rejectAccess(authToken);
                    else
                        void ((_l = (_k = this.sessionHooks) === null || _k === void 0 ? void 0 : _k.onAccessExpired) === null || _l === void 0 ? void 0 : _l.call(_k).catch(() => { }));
                }
                const errorMessage = ((_m = responseData === null || responseData === void 0 ? void 0 : responseData.error) === null || _m === void 0 ? void 0 : _m.message) ||
                    (typeof (responseData === null || responseData === void 0 ? void 0 : responseData.error) === 'string' ? responseData.error : null) ||
                    (responseData === null || responseData === void 0 ? void 0 : responseData.message) ||
                    `Erro HTTP ${response.status}: ${response.statusText}`;
                throw new ApiError(errorMessage, response.status, responseData, false);
            }
            return responseData;
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof ApiError) {
                throw err;
            }
            const isAbort = err.name === 'AbortError';
            if (callerSignal === null || callerSignal === void 0 ? void 0 : callerSignal.aborted)
                throw new ApiError('Requisição cancelada.', 0, { code: 'REQUEST_CANCELLED' }, false);
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
            const isNetwork = isAbort ||
                ((_o = err.message) === null || _o === void 0 ? void 0 : _o.includes('Network request failed')) ||
                ((_p = err.message) === null || _p === void 0 ? void 0 : _p.includes('Failed to fetch'));
            const message = isAbort
                ? 'A requisição excedeu o tempo limite (timeout). Verifique sua conexão.'
                : isNetwork
                    ? 'Falha de conexão com o servidor. Verifique se o dispositivo está conectado à internet.'
                    : err.message || 'Erro inesperado na comunicação HTTP.';
            throw new ApiError(message, 0, null, true);
        }
        finally {
            callerSignal === null || callerSignal === void 0 ? void 0 : callerSignal.removeEventListener('abort', abortFromCaller);
        }
    }
    get(path, options) {
        return this.request(path, { ...options, method: 'GET' });
    }
    post(path, body, options) {
        return this.request(path, { ...options, method: 'POST', body });
    }
    put(path, body, options) {
        return this.request(path, { ...options, method: 'PUT', body });
    }
    patch(path, body, options) {
        return this.request(path, { ...options, method: 'PATCH', body });
    }
    delete(path, bodyOrOptions, options) {
        if (bodyOrOptions &&
            typeof bodyOrOptions === 'object' &&
            options === undefined &&
            ('headers' in bodyOrOptions ||
                'params' in bodyOrOptions ||
                'token' in bodyOrOptions ||
                'timeoutMs' in bodyOrOptions ||
                'body' in bodyOrOptions)) {
            return this.request(path, { ...bodyOrOptions, method: 'DELETE' });
        }
        return this.request(path, {
            ...options,
            method: 'DELETE',
            body: bodyOrOptions,
        });
    }
}
HttpClient.MAX_TELEMETRY_BUFFER = 100;
export const httpClient = new HttpClient();
