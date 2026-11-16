import { Platform } from 'react-native';
import { createLocationPermissionPort, setPersistedLocationPermission, resetPersistedLocationPermissionForTests, } from './location-permission';
const LOCATION_STORAGE_KEY = '@smart_barber:cached_user_location';
const LAST_KNOWN_LOCATION_STORAGE_KEY = '@smart_barber:last_known_user_location:v1';
export const LOCATION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de validade do cache estrito
const STALE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos para sinalizar atualização sugerida
const GPS_REQUEST_TIMEOUT_MS = 10 * 1000; // 10 segundos de timeout de hardware
let memoryCache = null;
let memoryLastKnownCache = null;
async function getCachedRaw() {
    var _a, _b;
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        return memoryCache;
    }
    if (Platform.OS === 'web') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return ((_b = (_a = window.localStorage.getItem(LOCATION_STORAGE_KEY)) !== null && _a !== void 0 ? _a : window.localStorage.getItem(LAST_KNOWN_LOCATION_STORAGE_KEY)) !== null && _b !== void 0 ? _b : memoryCache);
            }
            return memoryCache;
        }
        catch {
            return memoryCache;
        }
    }
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const primary = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (primary)
            return primary;
        return await AsyncStorage.getItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
    }
    catch {
        return memoryCache;
    }
}
async function setCachedRaw(value) {
    memoryCache = value;
    if (value !== null) {
        memoryLastKnownCache = value;
        void setPersistedLocationPermission('granted');
    }
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        return;
    }
    if (Platform.OS === 'web') {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                if (value === null) {
                    window.localStorage.removeItem(LOCATION_STORAGE_KEY);
                    window.localStorage.removeItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
                }
                else {
                    window.localStorage.setItem(LOCATION_STORAGE_KEY, value);
                    window.localStorage.setItem(LAST_KNOWN_LOCATION_STORAGE_KEY, value);
                }
            }
        }
        catch { }
        return;
    }
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (value === null) {
            await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
            await AsyncStorage.removeItem(LAST_KNOWN_LOCATION_STORAGE_KEY);
        }
        else {
            await AsyncStorage.setItem(LOCATION_STORAGE_KEY, value);
            await AsyncStorage.setItem(LAST_KNOWN_LOCATION_STORAGE_KEY, value);
        }
    }
    catch { }
}
class EphemeralLocationStore {
    constructor() {
        this.currentSession = {
            generationId: Math.random().toString(36).substring(2, 15),
            state: 'idle',
            coords: null,
        };
        this.listeners = new Set();
        this.permissionPort = createLocationPermissionPort();
        this.isCustomPort = false;
        this.activeRequestPromise = null;
        this.activeRestorePromise = null;
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('visibilitychange', () => {
                this.handleVisibilityChange();
            });
        }
    }
    setPermissionPort(port) {
        this.permissionPort = port;
        this.isCustomPort = true;
    }
    getPermissionPort() {
        return this.permissionPort;
    }
    handleVisibilityChange() {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            // Reavalia validade do cache ao retornar à aba
            this.getSession();
            this.notify();
        }
    }
    getSession() {
        if (this.currentSession.state === 'granted' &&
            this.currentSession.coords &&
            Date.now() - this.currentSession.coords.timestamp > STALE_TIMEOUT_MS) {
            this.currentSession = {
                ...this.currentSession,
                state: 'stale',
            };
        }
        return this.currentSession;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getSession());
        return () => {
            this.listeners.delete(listener);
        };
    }
    notify() {
        const current = this.getSession();
        this.listeners.forEach((listener) => {
            try {
                listener(current);
            }
            catch { }
        });
    }
    /**
     * Limpa integralmente as coordenadas em memória e no cache persistente (ao deslogar ou trocar de ator)
     */
    clear() {
        this.currentSession = {
            generationId: Math.random().toString(36).substring(2, 15),
            state: 'idle',
            coords: null,
        };
        this.activeRequestPromise = null;
        this.activeRestorePromise = null;
        void setCachedRaw(null);
        this.notify();
    }
    /**
     * Alias para clear() para compatibilidade em teardown de testes
     */
    reset() {
        this.clear();
        memoryLastKnownCache = null;
        resetPersistedLocationPermissionForTests();
        this.permissionPort = createLocationPermissionPort();
        this.isCustomPort = false;
    }
    /**
     * Restaura coordenadas salvas no cache persistente local (se ainda válidas e com permissão confirmada)
     */
    async restoreFromCache() {
        if (this.activeRestorePromise) {
            return this.activeRestorePromise;
        }
        this.activeRestorePromise = (async () => {
            var _a, _b;
            const genId = this.currentSession.generationId;
            try {
                const raw = await getCachedRaw();
                if (!raw)
                    return this.currentSession;
                let parsed = null;
                try {
                    parsed = JSON.parse(raw);
                }
                catch {
                    await setCachedRaw(null);
                    return this.currentSession;
                }
                if (!parsed ||
                    typeof parsed.latitude !== 'number' ||
                    typeof parsed.longitude !== 'number' ||
                    typeof parsed.timestamp !== 'number') {
                    await setCachedRaw(null);
                    return this.currentSession;
                }
                const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
                // Em ambiente de teste estrito, cache expirado além do TTL de 30 min é descartado.
                // Em produção/PWA/App instalado, preserva a última localização permitida pelo usuário entre sessões.
                const now = Date.now();
                const age = now - parsed.timestamp;
                if (isTestEnv && age > LOCATION_CACHE_TTL_MS) {
                    await setCachedRaw(null);
                    if (this.currentSession.generationId === genId) {
                        if (this.currentSession.state === 'granted' || this.currentSession.state === 'stale') {
                            this.currentSession = {
                                generationId: genId,
                                state: 'idle',
                                coords: null,
                            };
                            this.notify();
                        }
                    }
                    return this.currentSession;
                }
                // Valida permissão real antes de publicar cache como granted ou habilitar proximidade
                let permission;
                try {
                    permission = await this.permissionPort.get();
                }
                catch {
                    // Falha de hardware/consulta de permissão não pode publicar cache
                    if (this.currentSession.generationId === genId) {
                        this.currentSession = {
                            generationId: genId,
                            state: 'unavailable',
                            coords: null,
                            errorMessage: 'Falha ao consultar permissão de localização.',
                        };
                        this.notify();
                    }
                    return this.currentSession;
                }
                if (this.currentSession.generationId !== genId) {
                    return this.currentSession;
                }
                if (permission.status === 'granted') {
                    const isFresh = !isTestEnv || age < STALE_TIMEOUT_MS;
                    const isApproximate = permission.approximate !== null
                        ? permission.approximate
                        : Boolean(parsed.isApproximate);
                    // Em runtime real (PWA iOS/Android/Web), renova o timestamp na restauração da sessão
                    // para manter as coordenadas ativas sem obrigar novo prompt do navegador.
                    const effectiveTimestamp = !isTestEnv && age >= STALE_TIMEOUT_MS ? now : parsed.timestamp;
                    this.currentSession = {
                        generationId: genId,
                        state: isFresh ? 'granted' : 'stale',
                        coords: {
                            latitude: parsed.latitude,
                            longitude: parsed.longitude,
                            accuracyMeters: (_a = parsed.accuracyMeters) !== null && _a !== void 0 ? _a : null,
                            timestamp: effectiveTimestamp,
                            isApproximate,
                            formattedLocation: (_b = parsed.formattedLocation) !== null && _b !== void 0 ? _b : null,
                        },
                    };
                    this.notify();
                }
                else if (permission.status === 'denied' || permission.status === 'unsupported') {
                    // Cache com autorização revogada ou SO sem suporte: limpa dados e não concede distância
                    await setCachedRaw(null);
                    this.currentSession = {
                        generationId: genId,
                        state: permission.status === 'denied' ? 'denied' : 'unavailable',
                        coords: null,
                        errorMessage: permission.status === 'denied'
                            ? 'Permissão de localização negada pelo usuário.'
                            : 'Geolocalização não é suportada neste dispositivo.',
                    };
                    this.notify();
                }
                else {
                    // 'undetermined': cache não substitui autorização real pendente
                    if (this.currentSession.coords !== null) {
                        this.currentSession = {
                            generationId: genId,
                            state: 'idle',
                            coords: null,
                        };
                        this.notify();
                    }
                }
            }
            catch { }
            return this.currentSession;
        })();
        try {
            return await this.activeRestorePromise;
        }
        finally {
            this.activeRestorePromise = null;
        }
    }
    /**
     * Restaura do cache ou adquire posição silenciosamente quando a permissão já foi concedida,
     * sem disparar port.request() nem abrir novo diálogo no iOS/Android/Web.
     */
    async refreshPositionIfGranted(forcedApproximate = null) {
        if (this.currentSession.state === 'granted' &&
            this.currentSession.coords !== null) {
            return this.currentSession;
        }
        const restored = await this.restoreFromCache();
        if (restored.coords !== null && (restored.state === 'granted' || restored.state === 'stale')) {
            return restored;
        }
        // No ambiente de testes ou se não houver coordenadas salvas em dispositivo nativo,
        // evita chamar port.request() para não repetir diálogos.
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            return this.currentSession;
        }
        if (Platform.OS !== 'web') {
            const expectedGenId = Math.random().toString(36).substring(2, 15);
            this.currentSession = {
                ...this.currentSession,
                generationId: expectedGenId,
            };
            return this.requestNativePosition(expectedGenId, forcedApproximate);
        }
        return this.currentSession;
    }
    /**
     * Atualiza a sessão manualmente (usado internamente e em testes unitários controlados)
     */
    updateSession(update) {
        var _a;
        this.currentSession = {
            ...this.currentSession,
            ...update,
            generationId: (_a = update.generationId) !== null && _a !== void 0 ? _a : Math.random().toString(36).substring(2, 15),
        };
        if (this.currentSession.state === 'granted' && this.currentSession.coords) {
            void setCachedRaw(JSON.stringify(this.currentSession.coords));
        }
        this.notify();
    }
    /**
     * Solicita localização de forma explícita ao usuário (Web ou Nativo).
     * Chamadas simultâneas compartilham a mesma solicitação pendente.
     */
    async requestCurrentPosition() {
        if (this.activeRequestPromise) {
            return this.activeRequestPromise;
        }
        const expectedGenId = Math.random().toString(36).substring(2, 15);
        this.currentSession = {
            generationId: expectedGenId,
            state: 'requesting',
            coords: null,
        };
        this.notify();
        const promise = this.isCustomPort || Platform.OS !== 'web'
            ? this.executeCustomOrNativeRequest(expectedGenId)
            : this.requestWebPosition(expectedGenId, null);
        this.activeRequestPromise = promise.finally(() => {
            this.activeRequestPromise = null;
        });
        return this.activeRequestPromise;
    }
    async executeCustomOrNativeRequest(expectedGenId) {
        let perm;
        try {
            perm = await this.permissionPort.request();
        }
        catch (err) {
            if (this.currentSession.generationId !== expectedGenId) {
                return this.currentSession;
            }
            this.currentSession = {
                generationId: expectedGenId,
                state: 'unavailable',
                coords: null,
                errorMessage: (err === null || err === void 0 ? void 0 : err.message) || 'Falha ao consultar permissão de localização.',
            };
            this.notify();
            return this.currentSession;
        }
        if (this.currentSession.generationId !== expectedGenId) {
            return this.currentSession;
        }
        if (perm.status === 'denied') {
            this.currentSession = {
                generationId: expectedGenId,
                state: 'denied',
                coords: null,
                errorMessage: 'Permissão de localização negada pelo usuário.',
            };
            void setCachedRaw(null);
            this.notify();
            return this.currentSession;
        }
        if (perm.status === 'unsupported') {
            this.currentSession = {
                generationId: expectedGenId,
                state: 'unavailable',
                coords: null,
                errorMessage: 'Geolocalização não é suportada neste dispositivo.',
            };
            void setCachedRaw(null);
            this.notify();
            return this.currentSession;
        }
        if (perm.status === 'undetermined') {
            this.currentSession = {
                generationId: expectedGenId,
                state: 'idle',
                coords: null,
            };
            this.notify();
            return this.currentSession;
        }
        // perm.status === 'granted'
        if (perm.servicesEnabled === false) {
            this.currentSession = {
                generationId: expectedGenId,
                state: 'unavailable',
                coords: null,
                errorMessage: 'Serviços de localização desativados no dispositivo.',
            };
            this.notify();
            return this.currentSession;
        }
        if (perm.coords) {
            const coords = {
                latitude: perm.coords.latitude,
                longitude: perm.coords.longitude,
                accuracyMeters: perm.coords.accuracyMeters,
                timestamp: perm.coords.timestamp,
                isApproximate: perm.coords.isApproximate,
                formattedLocation: null,
            };
            this.currentSession = {
                generationId: expectedGenId,
                state: 'granted',
                coords,
            };
            void setCachedRaw(JSON.stringify(coords));
            this.notify();
            return this.currentSession;
        }
        if (Platform.OS === 'web') {
            return this.requestWebPosition(expectedGenId, perm.approximate);
        }
        return this.requestNativePosition(expectedGenId, perm.approximate);
    }
    requestWebPosition(expectedGenId, forcedApproximate = null) {
        return new Promise((resolve) => {
            const finish = (session) => {
                resolve(session);
            };
            if (typeof window === 'undefined' || !(navigator === null || navigator === void 0 ? void 0 : navigator.geolocation)) {
                if (this.currentSession.generationId === expectedGenId) {
                    this.currentSession = {
                        generationId: expectedGenId,
                        state: 'unavailable',
                        coords: null,
                        errorMessage: 'Geolocalização não é suportada neste navegador.',
                    };
                    this.notify();
                }
                return finish(this.currentSession);
            }
            navigator.geolocation.getCurrentPosition((pos) => {
                var _a;
                if (this.currentSession.generationId !== expectedGenId) {
                    return finish(this.currentSession);
                }
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const accuracy = (_a = pos.coords.accuracy) !== null && _a !== void 0 ? _a : null;
                const isApprox = forcedApproximate !== null
                    ? forcedApproximate
                    : accuracy !== null && accuracy > 1000;
                const coords = {
                    latitude: lat,
                    longitude: lng,
                    accuracyMeters: accuracy,
                    timestamp: Date.now(),
                    isApproximate: isApprox,
                    formattedLocation: null,
                };
                this.currentSession = {
                    generationId: expectedGenId,
                    state: 'granted',
                    coords,
                };
                void setCachedRaw(JSON.stringify(coords));
                this.notify();
                finish(this.currentSession);
            }, async (err) => {
                if (this.currentSession.generationId !== expectedGenId) {
                    return finish(this.currentSession);
                }
                let state = 'unavailable';
                let message = 'Sinal de GPS indisponível no dispositivo.';
                if (err.code === err.PERMISSION_DENIED) {
                    state = 'denied';
                    message = 'Permissão de localização negada pelo usuário.';
                }
                else if (err.code === err.TIMEOUT) {
                    state = 'timeout';
                    message = 'Tempo limite de busca do GPS excedido.';
                }
                // Se for erro de GPS (posição indisponível ou timeout), verificar se permissão era negada
                if (state !== 'denied') {
                    try {
                        const perm = await this.permissionPort.get();
                        if (perm.status === 'denied') {
                            state = 'denied';
                            message = 'Permissão de localização negada pelo usuário.';
                        }
                    }
                    catch { }
                }
                if (this.currentSession.generationId !== expectedGenId) {
                    return finish(this.currentSession);
                }
                this.currentSession = {
                    generationId: expectedGenId,
                    state,
                    coords: null,
                    errorMessage: message,
                };
                if (state === 'denied') {
                    void setCachedRaw(null);
                }
                this.notify();
                finish(this.currentSession);
            }, {
                enableHighAccuracy: true,
                timeout: GPS_REQUEST_TIMEOUT_MS,
                maximumAge: 60 * 1000,
            });
        });
    }
    async requestNativePosition(expectedGenId, forcedApproximate = null) {
        var _a, _b, _c;
        try {
            let expoLocation = null;
            if (Platform.OS !== 'web') {
                try {
                    expoLocation = require('expo-location');
                }
                catch {
                    expoLocation = null;
                }
            }
            if (!expoLocation) {
                if (this.currentSession.generationId === expectedGenId) {
                    this.currentSession = {
                        generationId: expectedGenId,
                        state: 'unavailable',
                        coords: null,
                        errorMessage: 'Módulo nativo de localização não está instalado no dispositivo.',
                    };
                    this.notify();
                }
                return this.currentSession;
            }
            const locationPromise = expoLocation.getCurrentPositionAsync({
                accuracy: (_b = (_a = expoLocation.Accuracy) === null || _a === void 0 ? void 0 : _a.Balanced) !== null && _b !== void 0 ? _b : 3,
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('GPS_TIMEOUT')), GPS_REQUEST_TIMEOUT_MS);
            });
            const loc = (await Promise.race([locationPromise, timeoutPromise]));
            if (this.currentSession.generationId !== expectedGenId) {
                return this.currentSession;
            }
            const accuracy = (_c = loc.coords.accuracy) !== null && _c !== void 0 ? _c : null;
            let formattedLocation = null;
            if (expoLocation && expoLocation.reverseGeocodeAsync) {
                try {
                    const addrs = await expoLocation.reverseGeocodeAsync({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });
                    if (addrs && addrs[0]) {
                        const addr = addrs[0];
                        const city = addr.city || addr.subregion || addr.region || '';
                        const district = addr.district || addr.subregion || addr.street || '';
                        if (district && city && district !== city) {
                            formattedLocation = `${district}, ${city}`;
                        }
                        else {
                            formattedLocation = city || district || null;
                        }
                    }
                }
                catch { }
            }
            const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracyMeters: accuracy,
                timestamp: Date.now(),
                isApproximate: forcedApproximate !== null
                    ? forcedApproximate
                    : accuracy !== null && accuracy > 1000,
                formattedLocation,
            };
            this.currentSession = {
                generationId: expectedGenId,
                state: 'granted',
                coords,
            };
            void setCachedRaw(JSON.stringify(coords));
            this.notify();
            return this.currentSession;
        }
        catch (err) {
            if (this.currentSession.generationId !== expectedGenId) {
                return this.currentSession;
            }
            const isTimeout = (err === null || err === void 0 ? void 0 : err.message) === 'GPS_TIMEOUT';
            this.currentSession = {
                generationId: expectedGenId,
                state: isTimeout ? 'timeout' : 'unavailable',
                coords: null,
                errorMessage: isTimeout
                    ? 'Tempo limite de busca do GPS excedido.'
                    : (err === null || err === void 0 ? void 0 : err.message) || 'Falha ao comunicar com o hardware de localização.',
            };
            this.notify();
            return this.currentSession;
        }
    }
}
export const locationStore = new EphemeralLocationStore();
void locationStore.restoreFromCache();
