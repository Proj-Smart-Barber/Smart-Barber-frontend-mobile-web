import type { AuthIdentity, Membership } from '@/entities/user';
import type { SessionGrant, LoginRequestDto } from '../api/auth.dto';
import type { SessionPersistence, StoredSession } from '@/shared/storage';

export type SessionStatus =
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated'
  | 'recoveryRequired';

export interface SessionSnapshot {
  status: SessionStatus;
  identity: AuthIdentity | null;
  memberships: Membership[];
  selectedShopId: string | null;
  revocationPending: boolean;
  accessToken: string | null;
  error?: Error | null;
}

export type SessionSubscriber = (snapshot: SessionSnapshot) => void;

export interface SessionEngineDependencies {
  transport: {
    login: (credentials: LoginRequestDto) => Promise<SessionGrant>;
    refresh: (refreshToken?: string | null) => Promise<SessionGrant>;
    signOut: (refreshToken?: string | null) => Promise<void>;
  };
  persistence: SessionPersistence;
  clock?: () => Date;
  loadIdentity: (accessToken: string) => Promise<AuthIdentity>;
  loadMemberships: (accessToken: string) => Promise<Membership[]>;
}

export class SessionEngine {
  private snapshot: SessionSnapshot = {
    status: 'unauthenticated',
    identity: null,
    memberships: [],
    selectedShopId: null,
    revocationPending: false,
    accessToken: null,
    error: null,
  };

  private subscribers: Set<SessionSubscriber> = new Set();
  private activeRefreshPromise: Promise<SessionGrant> | null = null;
  private currentRefreshToken: string | null = null;
  private generation: number = 0;

  constructor(private deps: SessionEngineDependencies) {}

  getSnapshot(): SessionSnapshot {
    return this.snapshot;
  }

  subscribe(callback: SessionSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.snapshot);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private emit(): void {
    for (const sub of this.subscribers) {
      sub(this.snapshot);
    }
  }

  private setSnapshot(next: Partial<SessionSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...next,
    };
    this.emit();
  }

  async restore(): Promise<void> {
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

      this.currentRefreshToken = stored.refreshToken ?? null;

      // Se temos access token aparentemente válido
      let accessToken = stored.accessToken;
      if (!accessToken && (this.currentRefreshToken || stored.hasSession)) {
        try {
          const grant = await this.refresh();
          accessToken = grant.accessToken;
        } catch {
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
        const identity = await this.deps.loadIdentity(accessToken);
        const memberships = await this.deps.loadMemberships(accessToken);

        if (thisGen !== this.generation) return;

        let selectedShopId = stored.selectedShopId ?? null;
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
      } catch (err: any) {
        if (thisGen !== this.generation) return;

        // Se for erro temporário de servidor (503 ou de rede), não removemos o token
        if (err?.status >= 500 || err?.isNetworkError) {
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
        await this.deps.persistence.clear();
        this.setSnapshot({
          status: 'unauthenticated',
          identity: null,
          memberships: [],
          selectedShopId: null,
          accessToken: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    } catch (err: any) {
      this.setSnapshot({
        status: 'unauthenticated',
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  async signIn(credentials: LoginRequestDto): Promise<void> {
    const thisGen = ++this.generation;
    this.setSnapshot({ error: null });

    // Revoga sessão anterior se havia pendência
    if (this.snapshot.revocationPending && this.currentRefreshToken) {
      try {
        await this.deps.transport.signOut(this.currentRefreshToken);
      } catch {
        // Falha silenciosa na revogação do token anterior
      }
      this.setSnapshot({ revocationPending: false });
    }

    const grant = await this.deps.transport.login(credentials);
    if (thisGen !== this.generation) return;

    this.currentRefreshToken = grant.refreshToken ?? null;

    const storedSession: StoredSession = {
      accessToken: grant.accessToken,
      refreshToken: grant.refreshToken,
      accessExpiresAt: grant.accessExpiresAt,
      sessionExpiresAt: grant.sessionExpiresAt,
      hasSession: true,
    };
    await this.deps.persistence.save(storedSession);

    const identity = await this.deps.loadIdentity(grant.accessToken);
    const memberships = await this.deps.loadMemberships(grant.accessToken);

    if (thisGen !== this.generation) return;

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

  async refresh(): Promise<SessionGrant> {
    if (this.activeRefreshPromise) {
      return this.activeRefreshPromise;
    }

    this.activeRefreshPromise = (async () => {
      try {
        const grant = await this.deps.transport.refresh(this.currentRefreshToken);
        this.currentRefreshToken = grant.refreshToken ?? this.currentRefreshToken;

        await this.deps.persistence.save({
          accessToken: grant.accessToken,
          refreshToken: grant.refreshToken ?? this.currentRefreshToken,
          accessExpiresAt: grant.accessExpiresAt,
          sessionExpiresAt: grant.sessionExpiresAt,
          hasSession: true,
          selectedShopId: this.snapshot.selectedShopId,
        });

        this.setSnapshot({
          accessToken: grant.accessToken,
        });

        return grant;
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) {
          this.setSnapshot({ revocationPending: true });
        }
        throw err;
      } finally {
        this.activeRefreshPromise = null;
      }
    })();

    return this.activeRefreshPromise;
  }

  async signOut(): Promise<void> {
    ++this.generation;
    try {
      await this.deps.persistence.markLogoutPending();
      if (this.currentRefreshToken || this.snapshot.accessToken) {
        await this.deps.transport.signOut(this.currentRefreshToken);
      }
      await this.deps.persistence.clear();
    } catch {
      // Offline signOut continua garantindo logout local
    } finally {
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

  async refreshIdentity(): Promise<void> {
    if (!this.snapshot.accessToken) return;
    try {
      const identity = await this.deps.loadIdentity(this.snapshot.accessToken);
      const memberships = await this.deps.loadMemberships(this.snapshot.accessToken);
      this.setSnapshot({ identity, memberships });
    } catch {
      // Ignora erro temporário no refresh de dados
    }
  }

  selectShop(shopId: string): void {
    const exists = this.snapshot.memberships.some((m) => m.id === shopId);
    if (!exists) {
      throw new Error('Unidade não pertence aos vínculos autorizados do usuário');
    }
    this.setSnapshot({ selectedShopId: shopId });
  }
}

export function createSessionEngine(deps: SessionEngineDependencies): SessionEngine {
  return new SessionEngine(deps);
}
