import { purgePersistedPublicCache, isAllowlistedPublicQueryKey } from '../../../shared/cache/public-query-persister';
import { registerWebServiceWorker, broadcastSessionLogoutAndClearSwCaches } from '../../../shared/pwa/service-worker-registration';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionStorage, barbershopStorage } from '../../../shared/storage';
import { httpClient } from '../../../shared/api';
import { authApi } from '../api/auth.api';
import { formatCpf } from './register.schema';
import { normalizeAuthError } from '../lib/normalize-auth-error';
import { barbershopApi } from '../../barbershop/api/barbershop.api';
import { createSessionEngine } from './session-engine';
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
    var _a, _b, _c;
    const queryClient = useQueryClient();
    const engine = useMemo(() => {
        return createSessionEngine({
            transport: {
                login: (creds) => authApi.login(creds),
                refresh: (ref) => authApi.refresh(ref),
                signOut: (ref) => authApi.signOut(ref),
            },
            persistence: sessionStorage,
            loadIdentity: (token) => authApi.getIdentity(token),
            loadMemberships: (token) => authApi.getMemberships(token),
        });
    }, []);
    // A primeira renderização precede o efeito que lê a sessão persistida.
    const [snapshot, setSnapshot] = useState(() => ({
        ...engine.getSnapshot(),
        status: 'restoring',
    }));
    const [normalizedError, setNormalizedError] = useState(null);
    useEffect(() => {
        // Configura interceptor do HttpClient
        httpClient.setSessionHooks({
            getAccessToken: () => engine.getSnapshot().accessToken,
            onAccessExpired: async () => {
                try {
                    await engine.refresh();
                }
                catch {
                    // Expirado/falha de refresh
                }
            },
        });
        let previousScope = '';
        let previousActor = null;
        const unsubscribe = engine.subscribe((snap) => {
            var _a, _b, _c, _d, _e;
            const scope = JSON.stringify([(_b = (_a = snap.identity) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null, snap.selectedShopId,
                snap.memberships.map(member => [member.id, member.role, member.state, member.status, member.timezone]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))), Boolean(snap.revocationPending)]);
            if (previousScope && scope !== previousScope) {
                if (!previousActor && ((_c = snap.identity) === null || _c === void 0 ? void 0 : _c.id)) {
                    const privateOnly = { predicate: (query) => !isAllowlistedPublicQueryKey(query.queryKey) };
                    void queryClient.cancelQueries(privateOnly);
                    queryClient.removeQueries(privateOnly);
                }
                else {
                    void queryClient.cancelQueries();
                    queryClient.clear();
                    void purgePersistedPublicCache();
                }
                httpClient.clearTelemetry();
            }
            previousScope = scope;
            previousActor = (_e = (_d = snap.identity) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : null;
            setSnapshot(snap);
            if (snap.error) {
                setNormalizedError(normalizeAuthError(snap.error));
            }
            else {
                setNormalizedError(null);
            }
        });
        const stopSync = registerWebServiceWorker(() => {
            void queryClient.cancelQueries();
            queryClient.clear();
            void purgePersistedPublicCache();
            void engine.signOut();
        });
        engine.restore().catch(() => { });
        return () => {
            unsubscribe();
            stopSync();
            httpClient.setSessionHooks(null);
        };
    }, [engine, queryClient]);
    const clearError = useCallback(() => {
        setNormalizedError(null);
    }, []);
    const signIn = useCallback(async (credentials) => {
        try {
            await engine.signIn(credentials);
        }
        catch (err) {
            const norm = normalizeAuthError(err);
            setNormalizedError(norm);
            throw norm;
        }
    }, [engine]);
    const signUp = useCallback(async (values, intent) => {
        const cleanEmail = values.email.trim().toLowerCase();
        const formattedCpf = formatCpf(values.cpf);
        try {
            await authApi.register({
                name: values.name.trim(),
                email: cleanEmail,
                password: values.password,
                cpf: formattedCpf,
                onboardingIntent: intent,
            });
        }
        catch (err) {
            const norm = normalizeAuthError(err, 'registration');
            setNormalizedError(norm);
            throw norm;
        }
        // Conta criada com sucesso (201). Envia verificação de e-mail de forma desacoplada:
        let emailSent = false;
        try {
            await authApi.sendEmailVerification(cleanEmail);
            emailSent = true;
        }
        catch {
            emailSent = false;
        }
        return { emailSent };
    }, []);
    const signOut = useCallback(async () => {
        void queryClient.cancelQueries();
        queryClient.clear();
        await purgePersistedPublicCache();
        await broadcastSessionLogoutAndClearSwCaches();
        try {
            await engine.signOut();
            queryClient.clear();
        }
        finally {
            setNormalizedError(null);
        }
    }, [engine, queryClient]);
    const restoreSession = useCallback(async () => {
        try {
            await engine.restore();
        }
        catch (err) {
            setNormalizedError(normalizeAuthError(err));
        }
    }, [engine]);
    const selectShop = useCallback((shopId) => {
        engine.selectShop(shopId);
    }, [engine]);
    const refreshIdentity = useCallback(async () => {
        try {
            await engine.refreshIdentity();
        }
        catch (err) {
            const norm = normalizeAuthError(err);
            setNormalizedError(norm);
            throw norm;
        }
    }, [engine]);
    const linkBarbershop = useCallback(async (shopId) => {
        const token = snapshot.accessToken;
        if (!snapshot.identity || !token) {
            throw new Error('Usuário precisa estar autenticado para vincular barbearia.');
        }
        const cleanId = shopId.trim();
        const shop = await barbershopApi.getBarbershop(cleanId, token);
        await barbershopStorage.set(snapshot.identity.id, shop.id);
        await engine.refreshIdentity();
        return {
            id: shop.id,
            name: shop.name,
            timezone: shop.timezone,
        };
    }, [snapshot.identity, snapshot.accessToken, engine]);
    const registerBarbershop = useCallback(async (data) => {
        const token = snapshot.accessToken;
        if (!snapshot.identity || !token) {
            throw new Error('Usuário precisa estar autenticado para cadastrar barbearia.');
        }
        const res = await barbershopApi.createBarbershop(data, token);
        const shop = await barbershopApi.getBarbershop(res.barbershopId, token);
        await barbershopStorage.set(snapshot.identity.id, shop.id);
        await engine.refreshIdentity();
        return {
            id: shop.id,
            name: shop.name,
            timezone: shop.timezone,
        };
    }, [snapshot.identity, snapshot.accessToken, engine]);
    const activeMembership = snapshot.memberships.find((membership) => membership.id === snapshot.selectedShopId);
    const { data: shopDetails } = useQuery({
        queryKey: ['barbershop', snapshot.selectedShopId, 'session', (_a = snapshot.identity) === null || _a === void 0 ? void 0 : _a.id],
        queryFn: () => barbershopApi.getBarbershop(snapshot.selectedShopId, snapshot.accessToken),
        enabled: snapshot.status === 'authenticated' && Boolean(activeMembership),
        staleTime: 60000,
    });
    const activeShop = useMemo(() => {
        var _a, _b;
        if (!snapshot.selectedShopId || snapshot.memberships.length === 0)
            return null;
        const found = snapshot.memberships.find((m) => m.id === snapshot.selectedShopId);
        if (!found)
            return null;
        return {
            id: found.id,
            name: (_a = shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.name) !== null && _a !== void 0 ? _a : found.name,
            timezone: (_b = shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.timezone) !== null && _b !== void 0 ? _b : found.timezone,
            avatarUrl: shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.avatarUrl,
            googleMapsUrl: shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.googleMapsUrl,
            coverUrl: shopDetails === null || shopDetails === void 0 ? void 0 : shopDetails.coverUrl,
        };
    }, [snapshot.selectedShopId, snapshot.memberships, shopDetails]);
    const staffPresentation = useMemo(() => {
        var _a;
        if (!snapshot.identity)
            return null;
        const unitRole = (_a = snapshot.memberships.find((m) => m.id === snapshot.selectedShopId)) === null || _a === void 0 ? void 0 : _a.role;
        return {
            id: snapshot.identity.id,
            name: snapshot.identity.name,
            email: snapshot.identity.email,
            avatarUrl: snapshot.identity.avatarUrl || null,
            role: unitRole || (snapshot.identity.accountType === 'OWNER' ? 'OWNER' : 'BARBER'),
        };
    }, [snapshot.identity, snapshot.selectedShopId, snapshot.memberships]);
    const isOwner = useMemo(() => {
        var _a;
        if (!snapshot.selectedShopId) {
            return ((_a = snapshot.identity) === null || _a === void 0 ? void 0 : _a.accountType) === 'OWNER';
        }
        const currentMembership = snapshot.memberships.find((m) => m.id === snapshot.selectedShopId);
        return (currentMembership === null || currentMembership === void 0 ? void 0 : currentMembership.role) === 'OWNER';
    }, [snapshot.selectedShopId, snapshot.memberships, snapshot.identity]);
    const statusMapped = useMemo(() => {
        if (snapshot.status === 'restoring')
            return 'bootstrapping';
        if (snapshot.status === 'recoveryRequired')
            return 'error';
        return snapshot.status;
    }, [snapshot.status]);
    return (<SessionContext.Provider value={{
            status: statusMapped,
            staff: staffPresentation,
            identity: snapshot.identity,
            accountType: (_c = (_b = snapshot.identity) === null || _b === void 0 ? void 0 : _b.accountType) !== null && _c !== void 0 ? _c : null,
            memberships: snapshot.memberships,
            selectedShopId: snapshot.selectedShopId,
            barbershop: activeShop,
            isOwner,
            token: snapshot.accessToken,
            error: normalizedError,
            signIn,
            signUp,
            signOut,
            restoreSession,
            clearError,
            selectShop,
            refreshIdentity,
            linkBarbershop,
            registerBarbershop,
        }}>
      {children}
    </SessionContext.Provider>);
}
export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession deve ser utilizado dentro de um SessionProvider');
    }
    return context;
}
