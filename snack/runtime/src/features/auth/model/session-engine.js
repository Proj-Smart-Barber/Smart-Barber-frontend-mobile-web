export class SessionEngine {
    saveSession(value, generation = this.generation) {
        const next = this.persistenceWrites.catch(() => { }).then(async () => {
            if (generation === this.generation)
                await this.deps.persistence.save(value);
        });
        this.persistenceWrites = next;
        return next;
    }
    markSessionLogout(generation = this.generation) {
        const next = this.persistenceWrites.catch(() => { }).then(async () => {
            if (generation === this.generation)
                await this.deps.persistence.markLogoutPending();
        });
        this.persistenceWrites = next;
        return next;
    }
    clearSession(generation = this.generation) {
        const next = this.persistenceWrites.catch(() => { }).then(async () => {
            if (generation === this.generation)
                await this.deps.persistence.clear();
        });
        this.persistenceWrites = next;
        return next;
    }
    constructor(deps) {
        this.deps = deps;
        this.snapshot = {
            status: 'unauthenticated',
            identity: null,
            memberships: [],
            selectedShopId: null,
            revocationPending: false,
            accessToken: null,
            error: null,
        };
        this.subscribers = new Set();
        this.activeRefreshPromise = null;
        this.currentRefreshToken = null;
        this.generation = 0;
        this.refreshGeneration = -1;
        this.persistenceWrites = Promise.resolve();
    }
    getSnapshot() {
        return this.snapshot;
    }
    subscribe(callback) {
        this.subscribers.add(callback);
        callback(this.snapshot);
        return () => {
            this.subscribers.delete(callback);
        };
    }
    emit() {
        for (const sub of this.subscribers) {
            sub(this.snapshot);
        }
    }
    setSnapshot(next) {
        this.snapshot = {
            ...this.snapshot,
            ...next,
        };
        this.emit();
    }
    async restore() {
        var _a, _b;
        const thisGen = ++this.generation;
        this.setSnapshot({ status: 'restoring', error: null });
        try {
            const isPending = await this.deps.persistence.isLogoutPending();
            if (isPending) {
                this.setSnapshot({
                    status: 'unauthenticated',
                    identity: null,
                    memberships: [],
                    selectedShopId: null,
                    accessToken: null,
                });
                return;
            }
            const stored = await this.deps.persistence.read();
            if (!stored || (!stored.hasSession && !stored.accessToken && !stored.refreshToken)) {
                this.setSnapshot({
                    status: 'unauthenticated',
                    identity: null,
                    memberships: [],
                    selectedShopId: null,
                    accessToken: null,
                });
                return;
            }
            this.currentRefreshToken = (_a = stored.refreshToken) !== null && _a !== void 0 ? _a : null;
            // Se temos access token aparentemente válido
            let accessToken = stored.accessToken;
            if (!accessToken && (this.currentRefreshToken || stored.hasSession)) {
                try {
                    const grant = await this.refresh();
                    accessToken = grant.accessToken;
                }
                catch {
                    this.setSnapshot({
                        status: 'unauthenticated',
                        identity: null,
                        memberships: [],
                        selectedShopId: null,
                        accessToken: null,
                    });
                    return;
                }
            }
            if (!accessToken) {
                this.setSnapshot({
                    status: 'unauthenticated',
                    identity: null,
                    memberships: [],
                    selectedShopId: null,
                    accessToken: null,
                });
                return;
            }
            // Validação autoritativa do perfil
            try {
                const [identity, memberships] = await Promise.all([this.deps.loadIdentity(accessToken), this.deps.loadMemberships(accessToken)]);
                if (thisGen !== this.generation)
                    return;
                let selectedShopId = (_b = stored.selectedShopId) !== null && _b !== void 0 ? _b : null;
                if (!selectedShopId && memberships.length > 0) {
                    const ownerShop = memberships.find((m) => m.role === 'OWNER');
                    selectedShopId = ownerShop ? ownerShop.id : memberships[0].id;
                }
                this.setSnapshot({
                    status: 'authenticated',
                    identity,
                    memberships,
                    selectedShopId,
                    accessToken,
                    error: null,
                });
            }
            catch (err) {
                if (thisGen !== this.generation)
                    return;
                if (thisGen !== this.generation)
                    return;
                // Se for erro temporário de servidor (503 ou de rede), não removemos o token
                if ((err === null || err === void 0 ? void 0 : err.status) >= 500 || (err === null || err === void 0 ? void 0 : err.isNetworkError)) {
                    this.setSnapshot({
                        status: 'recoveryRequired',
                        identity: null,
                        memberships: [],
                        accessToken,
                        error: err instanceof Error ? err : new Error(String(err)),
                    });
                    return;
                }
                // Se for erro de autorização/token inválido (401/403)
                await this.clearSession(thisGen);
                this.setSnapshot({
                    status: 'unauthenticated',
                    identity: null,
                    memberships: [],
                    selectedShopId: null,
                    accessToken: null,
                    error: err instanceof Error ? err : new Error(String(err)),
                });
            }
        }
        catch (err) {
            if (thisGen !== this.generation)
                return;
            this.setSnapshot({
                status: 'unauthenticated',
                error: err instanceof Error ? err : new Error(String(err)),
            });
            throw err;
        }
    }
    async signIn(credentials) {
        var _a;
        const thisGen = ++this.generation;
        this.setSnapshot({ error: null });
        // Revoga sessão anterior se havia pendência
        if (this.snapshot.revocationPending && this.currentRefreshToken) {
            try {
                await this.deps.transport.signOut(this.currentRefreshToken);
            }
            catch {
                // Falha silenciosa na revogação do token anterior
            }
            this.setSnapshot({ revocationPending: false });
        }
        const grant = await this.deps.transport.login(credentials);
        if (thisGen !== this.generation)
            return;
        this.currentRefreshToken = (_a = grant.refreshToken) !== null && _a !== void 0 ? _a : null;
        const storedSession = {
            accessToken: grant.accessToken,
            refreshToken: grant.refreshToken,
            accessExpiresAt: grant.accessExpiresAt,
            sessionExpiresAt: grant.sessionExpiresAt,
            hasSession: true,
        };
        await this.saveSession(storedSession);
        const [identity, memberships] = await Promise.all([this.deps.loadIdentity(grant.accessToken), this.deps.loadMemberships(grant.accessToken)]);
        if (thisGen !== this.generation)
            return;
        let selectedShopId = null;
        if (memberships.length > 0) {
            const ownerShop = memberships.find((m) => m.role === 'OWNER');
            selectedShopId = ownerShop ? ownerShop.id : memberships[0].id;
        }
        this.setSnapshot({
            status: 'authenticated',
            identity,
            memberships,
            selectedShopId,
            accessToken: grant.accessToken,
            error: null,
        });
    }
    async refresh() {
        const thisGen = this.generation;
        if (this.activeRefreshPromise && this.refreshGeneration === thisGen)
            return this.activeRefreshPromise;
        this.refreshGeneration = thisGen;
        this.activeRefreshPromise = (async () => {
            var _a;
            await Promise.resolve();
            try {
                const grant = await this.deps.transport.refresh(this.currentRefreshToken);
                if (thisGen !== this.generation)
                    throw new Error('SESSION_CHANGED');
                this.currentRefreshToken = (_a = grant.refreshToken) !== null && _a !== void 0 ? _a : this.currentRefreshToken;
                await this.saveSession({ accessToken: grant.accessToken, refreshToken: this.currentRefreshToken,
                    accessExpiresAt: grant.accessExpiresAt, sessionExpiresAt: grant.sessionExpiresAt,
                    hasSession: true, selectedShopId: this.snapshot.selectedShopId }, thisGen);
                if (thisGen !== this.generation)
                    throw new Error('SESSION_CHANGED');
                this.setSnapshot({ accessToken: grant.accessToken });
                return grant;
            }
            catch (err) {
                if (thisGen === this.generation && ((err === null || err === void 0 ? void 0 : err.status) === 401 || (err === null || err === void 0 ? void 0 : err.status) === 403))
                    this.setSnapshot({ revocationPending: true });
                throw err;
            }
            finally {
                if (thisGen === this.generation)
                    this.activeRefreshPromise = null;
            }
        })();
        return this.activeRefreshPromise;
    }
    async signOut() {
        const thisGen = ++this.generation;
        const refreshToken = this.currentRefreshToken;
        const hadSession = Boolean(refreshToken || this.snapshot.accessToken);
        this.currentRefreshToken = null;
        this.setSnapshot({ status: 'unauthenticated', identity: null, memberships: [], selectedShopId: null, accessToken: null, error: null });
        try {
            await this.markSessionLogout(thisGen);
            if (hadSession) {
                await this.deps.transport.signOut(refreshToken);
            }
            await this.clearSession(thisGen);
        }
        catch {
            // Offline signOut continua garantindo logout local
        }
        finally {
            if (thisGen !== this.generation)
                return;
            this.currentRefreshToken = null;
            this.setSnapshot({
                status: 'unauthenticated',
                identity: null,
                memberships: [],
                selectedShopId: null,
                accessToken: null,
                error: null,
            });
        }
    }
    async refreshIdentity() {
        if (!this.snapshot.accessToken)
            return;
        const thisGen = this.generation;
        try {
            const [identity, rawMemberships] = await Promise.all([
                this.deps.loadIdentity(this.snapshot.accessToken),
                this.deps.loadMemberships(this.snapshot.accessToken),
            ]);
            if (thisGen !== this.generation || this.snapshot.status !== 'authenticated') {
                return;
            }
            // Filtra apenas memberships válidos com roles autorizados ('OWNER' ou 'BARBERMAN') e ativos
            const validMemberships = rawMemberships.filter((m) => {
                const isAuthorizedRole = m.role === 'OWNER' || m.role === 'BARBERMAN';
                const isActive = !m.state || m.state === 'ACTIVE';
                return isAuthorizedRole && isActive;
            });
            let nextSelectedShopId = this.snapshot.selectedShopId;
            if (nextSelectedShopId) {
                const stillExists = validMemberships.some((m) => m.id === nextSelectedShopId);
                if (!stillExists) {
                    nextSelectedShopId = validMemberships.length > 0 ? validMemberships[0].id : null;
                }
            }
            else if (validMemberships.length > 0) {
                const ownerShop = validMemberships.find((m) => m.role === 'OWNER');
                nextSelectedShopId = ownerShop ? ownerShop.id : validMemberships[0].id;
            }
            this.setSnapshot({
                identity,
                memberships: validMemberships,
                selectedShopId: nextSelectedShopId,
            });
        }
        catch (err) {
            if (thisGen !== this.generation || this.snapshot.status !== 'authenticated') {
                return;
            }
            throw err;
        }
    }
    selectShop(shopId) {
        const exists = this.snapshot.memberships.some((m) => m.id === shopId && (!m.state || m.state === 'ACTIVE'));
        if (!exists) {
            throw new Error('Unidade não pertence aos vínculos autorizados do usuário');
        }
        this.setSnapshot({ selectedShopId: shopId });
    }
}
export function createSessionEngine(deps) {
    return new SessionEngine(deps);
}
