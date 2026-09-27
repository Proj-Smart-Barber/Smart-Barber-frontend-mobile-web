import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStorage, barbershopStorage } from '@/shared/storage';
import { authApi } from '../api/auth.api';
import { LoginRequestDto } from '../api/auth.dto';
import { RegisterFormValues, formatCpf } from './register.schema';
import { SessionState } from './auth-state';
import { isTokenExpired } from '../lib/jwt-helper';
import { normalizeAuthError } from '../lib/normalize-auth-error';
import { barbershopApi, CreateBarbershopRequestDto } from '@/features/barbershop';
import type { Barbershop } from '@/entities/barbershop';

interface SessionContextData extends SessionState {
  signIn: (credentials: LoginRequestDto) => Promise<void>;
  signUp: (values: RegisterFormValues) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  linkBarbershop: (shopId: string) => Promise<Barbershop>;
  registerBarbershop: (data: CreateBarbershopRequestDto) => Promise<Barbershop>;
}

const SessionContext = createContext<SessionContextData | null>(null);

async function resolveBarbershopContext(
  staffId: string,
  token: string | null,
): Promise<{ barbershop: Barbershop | null; isOwner: boolean }> {
  if (!token) return { barbershop: null, isOwner: false };
  const storedId = await barbershopStorage.get(staffId);
  if (!storedId) return { barbershop: null, isOwner: false };

  try {
    const shop = await barbershopApi.getBarbershop(storedId, token);
    const isOwner = shop.ownerId === staffId;
    return {
      barbershop: {
        id: shop.id,
        name: shop.name,
        timezone: shop.timezone,
      },
      isOwner,
    };
  } catch {
    await barbershopStorage.remove(staffId);
    return { barbershop: null, isOwner: false };
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [state, setState] = useState<SessionState>({
    status: 'bootstrapping',
    staff: null,
    barbershop: null,
    isOwner: false,
    token: null,
    error: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Restauração da sessão no bootstrap do aplicativo
   */
  const restoreSession = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'bootstrapping', error: null }));

    try {
      const storedToken = await tokenStorage.get();

      if (!storedToken) {
        setState({
          status: 'unauthenticated',
          staff: null,
          barbershop: null,
          isOwner: false,
          token: null,
          error: null,
        });
        return;
      }

      // Verificação de expiração preliminar via payload
      if (isTokenExpired(storedToken)) {
        await tokenStorage.remove();
        setState({
          status: 'unauthenticated',
          staff: null,
          barbershop: null,
          isOwner: false,
          token: null,
          error: null,
        });
        return;
      }

      // Validação autoritativa com o backend via /api/staffs/me
      try {
        const profile = await authApi.getMe(storedToken);
        queryClient.setQueryData(['auth', 'me'], profile);

        const shopContext = await resolveBarbershopContext(profile.staff.id, storedToken);

        setState({
          status: 'authenticated',
          staff: {
            ...profile.staff,
            role: shopContext.isOwner ? 'OWNER' : profile.staff.role,
          },
          barbershop: shopContext.barbershop,
          isOwner: shopContext.isOwner,
          token: storedToken,
          error: null,
        });
      } catch (err) {
        const normalized = normalizeAuthError(err);

        if (normalized.shouldClearSession) {
          await tokenStorage.remove();
          queryClient.removeQueries({ queryKey: ['auth', 'me'] });
          setState({
            status: 'unauthenticated',
            staff: null,
            barbershop: null,
            isOwner: false,
            token: null,
            error: normalized,
          });
        } else {
          // Erro temporário de rede ou 500 genérico - NÃO apaga o token
          setState({
            status: 'error',
            staff: null,
            barbershop: null,
            isOwner: false,
            token: storedToken,
            error: normalized,
          });
        }
      }
    } catch {
      setState({
        status: 'unauthenticated',
        staff: null,
        barbershop: null,
        isOwner: false,
        token: null,
        error: null,
      });
    }
  }, [queryClient]);

  /**
   * Fluxo de Login
   */
  const signIn = useCallback(
    async (credentials: LoginRequestDto) => {
      setState((prev) => ({ ...prev, status: 'authenticating', error: null }));

      try {
        // 1. POST /api/staffs/sessions/auth
        const authResponse = await authApi.login(credentials);
        const token = authResponse.access_token;

        // 2. Salva token no storage seguro
        await tokenStorage.set(token);

        // 3. GET /api/staffs/me para carregar perfil
        const profile = await authApi.getMe(token);
        queryClient.setQueryData(['auth', 'me'], profile);

        // 4. Resolve contexto de barbearia
        const shopContext = await resolveBarbershopContext(profile.staff.id, token);

        setState({
          status: 'authenticated',
          staff: {
            ...profile.staff,
            role: shopContext.isOwner ? 'OWNER' : profile.staff.role,
          },
          barbershop: shopContext.barbershop,
          isOwner: shopContext.isOwner,
          token,
          error: null,
        });
      } catch (err) {
        const normalized = normalizeAuthError(err);
        await tokenStorage.remove();
        queryClient.removeQueries({ queryKey: ['auth', 'me'] });

        setState({
          status: 'unauthenticated',
          staff: null,
          barbershop: null,
          isOwner: false,
          token: null,
          error: normalized,
        });
        throw normalized;
      }
    },
    [queryClient]
  );

  /**
   * Fluxo de Cadastro com Auto-login
   */
  const signUp = useCallback(
    async (values: RegisterFormValues) => {
      setState((prev) => ({ ...prev, status: 'authenticating', error: null }));

      try {
        const formattedCpf = formatCpf(values.cpf);

        // 1. POST /api/staffs/
        await authApi.register({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          cpf: formattedCpf,
        });

        // 2. Auto-login com as credenciais
        const authResponse = await authApi.login({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });

        const token = authResponse.access_token;
        await tokenStorage.set(token);

        // 3. GET /api/staffs/me
        const profile = await authApi.getMe(token);
        queryClient.setQueryData(['auth', 'me'], profile);

        setState({
          status: 'authenticated',
          staff: profile.staff,
          barbershop: null,
          isOwner: false,
          token,
          error: null,
        });
      } catch (err) {
        const normalized = normalizeAuthError(err);
        await tokenStorage.remove();
        queryClient.removeQueries({ queryKey: ['auth', 'me'] });

        setState({
          status: 'unauthenticated',
          staff: null,
          barbershop: null,
          isOwner: false,
          token: null,
          error: normalized,
        });
        throw normalized;
      }
    },
    [queryClient]
  );

  /**
   * Vínculo de barbearia já existente por ID
   */
  const linkBarbershop = useCallback(
    async (shopId: string): Promise<Barbershop> => {
      if (!state.staff || !state.token) {
        throw new Error('Usuário precisa estar autenticado para vincular barbearia.');
      }

      const cleanId = shopId.trim();
      const shop = await barbershopApi.getBarbershop(cleanId, state.token);
      const isOwner = shop.ownerId === state.staff.id;

      await barbershopStorage.set(state.staff.id, shop.id);

      const entity: Barbershop = {
        id: shop.id,
        name: shop.name,
        timezone: shop.timezone,
      };

      setState((prev) => ({
        ...prev,
        barbershop: entity,
        isOwner,
        staff: prev.staff ? { ...prev.staff, role: isOwner ? 'OWNER' : 'BARBER' } : null,
      }));

      return entity;
    },
    [state.staff, state.token]
  );

  /**
   * Cadastro de nova barbearia no backend (POST /api/barbershops)
   */
  const registerBarbershop = useCallback(
    async (data: CreateBarbershopRequestDto): Promise<Barbershop> => {
      if (!state.staff || !state.token) {
        throw new Error('Usuário precisa estar autenticado para cadastrar barbearia.');
      }

      const res = await barbershopApi.createBarbershop(data, state.token);
      const shop = await barbershopApi.getBarbershop(res.barbershopId, state.token);

      await barbershopStorage.set(state.staff.id, shop.id);

      const entity: Barbershop = {
        id: shop.id,
        name: shop.name,
        timezone: shop.timezone,
      };

      setState((prev) => ({
        ...prev,
        barbershop: entity,
        isOwner: true,
        staff: prev.staff ? { ...prev.staff, role: 'OWNER' } : null,
      }));

      return entity;
    },
    [state.staff, state.token]
  );

  /**
   * Logout local
   */
  const signOut = useCallback(async () => {
    try {
      await tokenStorage.remove();
      queryClient.clear();
    } finally {
      setState({
        status: 'unauthenticated',
        staff: null,
        barbershop: null,
        isOwner: false,
        token: null,
        error: null,
      });
    }
  }, [queryClient]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <SessionContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        restoreSession,
        clearError,
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