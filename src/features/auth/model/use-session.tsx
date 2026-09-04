import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Staff } from '@/entities/staff';
import { tokenStorage } from '@/shared/storage';
import { authApi } from '../api/auth.api';
import { LoginRequestDto } from '../api/auth.dto';
import { RegisterFormValues, formatCpf } from './register.schema';
import { AuthStatus, SessionState } from './auth-state';
import { isTokenExpired } from '../lib/jwt-helper';
import { normalizeAuthError, NormalizedAuthError } from '../lib/normalize-auth-error';

interface SessionContextData extends SessionState {
  signIn: (credentials: LoginRequestDto) => Promise<void>;
  signUp: (values: RegisterFormValues) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

const SessionContext = createContext<SessionContextData | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [state, setState] = useState<SessionState>({
    status: 'bootstrapping',
    staff: null,
    token: null,
    error: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Restauração da sessão no bootstrap do aplicativo (Seção 25 do Plano)
   */
  const restoreSession = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'bootstrapping', error: null }));

    try {
      const storedToken = await tokenStorage.get();

      if (!storedToken) {
        setState({
          status: 'unauthenticated',
          staff: null,
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
          token: null,
          error: null,
        });
        return;
      }

      // Validação autoritativa com o backend via /api/staffs/me
      try {
        const staff = await authApi.getMe(storedToken);
        queryClient.setQueryData(['auth', 'me'], staff);

        setState({
          status: 'authenticated',
          staff,
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
            token: null,
            error: normalized,
          });
        } else {
          // Erro temporário de rede ou 500 genérico - NÃO apaga o token
          setState({
            status: 'error',
            staff: null,
            token: storedToken,
            error: normalized,
          });
        }
      }
    } catch {
      setState({
        status: 'unauthenticated',
        staff: null,
        token: null,
        error: null,
      });
    }
  }, [queryClient]);

  /**
   * Fluxo de Login (Seção 24 do Plano)
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

        // 3. GET /api/staffs/me para validar e carregar perfil
        const staff = await authApi.getMe(token);
        queryClient.setQueryData(['auth', 'me'], staff);

        // 4. Marca como autenticado
        setState({
          status: 'authenticated',
          staff,
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
          token: null,
          error: normalized,
        });
        throw normalized;
      }
    },
    [queryClient]
  );

  /**
   * Fluxo de Cadastro com Auto-login (Seção 23 do Plano)
   */
  const signUp = useCallback(
    async (values: RegisterFormValues) => {
      setState((prev) => ({ ...prev, status: 'authenticating', error: null }));

      try {
        // Normaliza CPF para o formato esperado pelo backend
        const formattedCpf = formatCpf(values.cpf);

        // 1. POST /api/staffs/
        await authApi.register({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          cpf: formattedCpf,
        });

        // 2. Auto-login automático com as mesmas credenciais
        const authResponse = await authApi.login({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });

        const token = authResponse.access_token;
        await tokenStorage.set(token);

        // 3. GET /api/staffs/me
        const staff = await authApi.getMe(token);
        queryClient.setQueryData(['auth', 'me'], staff);

        setState({
          status: 'authenticated',
          staff,
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
          token: null,
          error: normalized,
        });
        throw normalized;
      }
    },
    [queryClient]
  );

  /**
   * Logout local (Seção 48 do Plano)
   */
  const signOut = useCallback(async () => {
    try {
      await tokenStorage.remove();
      queryClient.clear();
    } finally {
      setState({
        status: 'unauthenticated',
        staff: null,
        token: null,
        error: null,
      });
    }
  }, [queryClient]);

  // Inicializa sessão ao carregar
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
