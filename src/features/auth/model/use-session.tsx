import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sessionStorage, barbershopStorage } from '@/shared/storage';
import { httpClient } from '@/shared/api';
import { authApi } from '../api/auth.api';
import { LoginRequestDto } from '../api/auth.dto';
import { RegisterFormValues, formatCpf } from './register.schema';
import { SessionState } from './auth-state';
import { normalizeAuthError } from '../lib/normalize-auth-error';
import { barbershopApi, CreateBarbershopRequestDto } from '@/features/barbershop';
import type { Barbershop } from '@/entities/barbershop';
import type { Staff } from '@/entities/staff';
import type { AuthIdentity, Membership, AccountType } from '@/entities/user';
import { createSessionEngine, SessionEngine, SessionSnapshot } from './session-engine';

interface SessionContextData extends SessionState {
  signIn: (credentials: LoginRequestDto) => Promise<void>;
  signUp: (values: RegisterFormValues) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  selectShop: (shopId: string) => void;
  refreshIdentity: () => Promise<void>;
  linkBarbershop: (shopId: string) => Promise<Barbershop>;
  registerBarbershop: (data: CreateBarbershopRequestDto) => Promise<Barbershop>;
}

const SessionContext = createContext<SessionContextData | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
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

  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => engine.getSnapshot());
  const [normalizedError, setNormalizedError] = useState<any>(null);

  useEffect(() => {
    // Configura interceptor do HttpClient
    httpClient.setSessionHooks({
      getAccessToken: () => engine.getSnapshot().accessToken,
      onAccessExpired: async () => {
        try {
          await engine.refresh();
        } catch {
          // Expirado/falha de refresh
        }
      },
    });

    const unsubscribe = engine.subscribe((snap) => {
      setSnapshot(snap);
      if (snap.error) {
        setNormalizedError(normalizeAuthError(snap.error));
      } else {
        setNormalizedError(null);
      }
    });

    engine.restore().catch(() => {});

    return () => {
      unsubscribe();
      httpClient.setSessionHooks(null);
    };
  }, [engine]);

  const clearError = useCallback(() => {
    setNormalizedError(null);
  }, []);

  const signIn = useCallback(
    async (credentials: LoginRequestDto) => {
      try {
        await engine.signIn(credentials);
      } catch (err) {
        const norm = normalizeAuthError(err);
        setNormalizedError(norm);
        throw norm;
      }
    },
    [engine]
  );

  const signUp = useCallback(
    async (values: RegisterFormValues) => {
      try {
        const formattedCpf = formatCpf(values.cpf);
        await authApi.register({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          cpf: formattedCpf,
        });
        // Não faz auto-login porque email não foi verificado
      } catch (err) {
        const norm = normalizeAuthError(err);
        setNormalizedError(norm);
        throw norm;
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await engine.signOut();
      queryClient.clear();
    } finally {
      setNormalizedError(null);
    }
  }, [engine, queryClient]);

  const restoreSession = useCallback(async () => {
    try {
      await engine.restore();
    } catch (err) {
      setNormalizedError(normalizeAuthError(err));
    }
  }, [engine]);

  const selectShop = useCallback(
    (shopId: string) => {
      engine.selectShop(shopId);
    },
    [engine]
  );

  const refreshIdentity = useCallback(async () => {
    try {
      await engine.refreshIdentity();
    } catch (err) {
      const norm = normalizeAuthError(err);
      setNormalizedError(norm);
      throw norm;
    }
  }, [engine]);

  const linkBarbershop = useCallback(
    async (shopId: string): Promise<Barbershop> => {
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
    },
    [snapshot.identity, snapshot.accessToken, engine]
  );

  const registerBarbershop = useCallback(
    async (data: CreateBarbershopRequestDto): Promise<Barbershop> => {
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
    },
    [snapshot.identity, snapshot.accessToken, engine]
  );

  const activeShop = useMemo<Barbershop | null>(() => {
    if (!snapshot.selectedShopId || snapshot.memberships.length === 0) return null;
    const found = snapshot.memberships.find((m) => m.id === snapshot.selectedShopId);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      timezone: found.timezone,
    };
  }, [snapshot.selectedShopId, snapshot.memberships]);

  const staffPresentation = useMemo<Staff | null>(() => {
    if (!snapshot.identity) return null;
    const unitRole = snapshot.memberships.find((m) => m.id === snapshot.selectedShopId)?.role;
    return {
      id: snapshot.identity.id,
      name: snapshot.identity.name,
      email: snapshot.identity.email,
      avatarUrl: snapshot.identity.avatarUrl || null,
      role: (unitRole as any) || (snapshot.identity.accountType === 'OWNER' ? 'OWNER' : 'BARBER'),
    };
  }, [snapshot.identity, snapshot.selectedShopId, snapshot.memberships]);

  const isOwner = useMemo<boolean>(() => {
    if (!snapshot.selectedShopId) {
      return snapshot.identity?.accountType === 'OWNER';
    }
    const currentMembership = snapshot.memberships.find((m) => m.id === snapshot.selectedShopId);
    return currentMembership?.role === 'OWNER';
  }, [snapshot.selectedShopId, snapshot.memberships, snapshot.identity]);

  const statusMapped = useMemo(() => {
    if (snapshot.status === 'restoring') return 'bootstrapping';
    if (snapshot.status === 'recoveryRequired') return 'error';
    return snapshot.status;
  }, [snapshot.status]);

  return (
    <SessionContext.Provider
      value={{
        status: statusMapped,
        staff: staffPresentation,
        identity: snapshot.identity,
        accountType: snapshot.identity?.accountType ?? null,
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
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextData {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession deve ser utilizado dentro de um SessionProvider');
  }
  return context;
}