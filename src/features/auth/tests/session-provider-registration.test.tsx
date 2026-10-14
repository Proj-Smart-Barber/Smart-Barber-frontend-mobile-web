/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '../model/use-session';
import { authApi } from '../api/auth.api';
import { resolveEntryDestination, getOperationalContext } from '../model/operational-context';
import { ApiError } from '@/shared/api';
import type { SessionSnapshot } from '../model/session-engine';

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

describe('SessionProvider — Orquestração de Cadastro e Verificação com Transporte Controlado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );

  it('1. Um cadastro CLIENT -> um envio -> nenhuma sessão automática criada', async () => {
    const registerSpy = vi.spyOn(authApi, 'register').mockResolvedValue({
      user: {
        id: 'u-client-1',
        name: 'Cliente Teste',
        email: 'cliente.teste@exemplo.com',
      },
    } as any);

    const sendEmailSpy = vi.spyOn(authApi, 'sendEmailVerification').mockResolvedValue(undefined);

    const { result } = renderHook(() => useSession(), { wrapper });

    let signUpResult: { emailSent: boolean } = { emailSent: false };
    await act(async () => {
      signUpResult = await result.current.signUp(
        {
          name: 'Cliente Teste',
          email: 'cliente.teste@exemplo.com',
          cpf: '11144477735',
          password: 'senhafortesegura123',
          passwordConfirmation: 'senhafortesegura123',
        },
        'CLIENT',
      );
    });

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cliente Teste',
        email: 'cliente.teste@exemplo.com',
        onboardingIntent: 'CLIENT',
      }),
    );

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledWith('cliente.teste@exemplo.com');

    expect(signUpResult.emailSent).toBe(true);

    // O status permanece 'unauthenticated' — nenhuma sessão automática é concedida sem verificação e login
    expect(result.current.status).not.toBe('authenticated');
    expect(result.current.identity).toBeFalsy();
  });

  it('2. Cadastro OWNER -> intenção canônica -> onboarding de barbearia correto, sem concessão automática de papel', async () => {
    const registerSpy = vi.spyOn(authApi, 'register').mockResolvedValue({
      user: {
        id: 'u-owner-1',
        name: 'Proprietário Novo',
        email: 'proprietario@exemplo.com',
      },
    } as any);

    vi.spyOn(authApi, 'sendEmailVerification').mockResolvedValue(undefined);

    const { result } = renderHook(() => useSession(), { wrapper });

    await act(async () => {
      await result.current.signUp(
        {
          name: 'Proprietário Novo',
          email: 'proprietario@exemplo.com',
          cpf: '11144477735',
          password: 'senhafortesegura123',
          passwordConfirmation: 'senhafortesegura123',
        },
        'OWNER',
      );
    });

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingIntent: 'OWNER',
      }),
    );

    // Simula a resposta de login do servidor para esse novo usuário:
    // O servidor retorna accountType: 'CLIENT', onboardingIntent: 'OWNER', memberships: []
    const authenticatedSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-owner-1',
        name: 'Proprietário Novo',
        email: 'proprietario@exemplo.com',
        accountType: 'CLIENT',
        onboardingIntent: 'OWNER',
        emailVerifiedAt: '2026-10-13T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token-jwt-fake',
    };

    // Roteamento para onboarding de criação de barbearia
    const destination = resolveEntryDestination(authenticatedSnapshot);
    expect(destination).toBe('/(app)/barbershop-setup');

    // Nenhuma autoridade operacional outorgada antes da criação da barbearia
    const operationalContext = getOperationalContext(authenticatedSnapshot);
    expect(operationalContext).toBeNull();
  });

  it('3. Falha de envio após 201 -> conta permanece criada, novo envio possível sem criar segunda conta', async () => {
    const registerSpy = vi.spyOn(authApi, 'register').mockResolvedValue({
      user: {
        id: 'u-client-2',
        name: 'Cliente Dois',
        email: 'cliente2@exemplo.com',
      },
    } as any);

    // Envio inicial falha
    const sendEmailSpy = vi
      .spyOn(authApi, 'sendEmailVerification')
      .mockRejectedValueOnce(new Error('SMTP timeout'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useSession(), { wrapper });

    let signUpResult: { emailSent: boolean } = { emailSent: true };
    await act(async () => {
      signUpResult = await result.current.signUp(
        {
          name: 'Cliente Dois',
          email: 'cliente2@exemplo.com',
          cpf: '11144477735',
          password: 'senhafortesegura123',
          passwordConfirmation: 'senhafortesegura123',
        },
        'CLIENT',
      );
    });

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    // signUp indica que a conta foi criada mas o envio falhou
    expect(signUpResult.emailSent).toBe(false);

    // Reenvio direto através da API de verificação (sem chamar register novamente)
    await act(async () => {
      await authApi.sendEmailVerification('cliente2@exemplo.com');
    });

    // register CONTINUA tendo sido chamado apenas UMA vez
    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy).toHaveBeenCalledTimes(2);
  });

  it('4. Falha de rede / timeout na criação -> lança NETWORK_ERROR e não cria sessão', async () => {
    vi.spyOn(authApi, 'register').mockRejectedValue(
      new ApiError('Network request failed', 0, null, true),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signUp(
          {
            name: 'Cliente Timeout',
            email: 'timeout@exemplo.com',
            cpf: '11144477735',
            password: 'senhafortesegura123',
            passwordConfirmation: 'senhafortesegura123',
          },
          'CLIENT',
        );
      }),
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });

    expect(result.current.status).not.toBe('authenticated');
  });

  it('5. Conflito 409 de conta existente -> normaliza para ACCOUNT_CONFLICT', async () => {
    vi.spyOn(authApi, 'register').mockRejectedValue(
      new ApiError('Conflict', 409, { error: 'O CPF ou o E-mail já está em uso.' }),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signUp(
          {
            name: 'Cliente Duplicado',
            email: 'duplicado@exemplo.com',
            cpf: '11144477735',
            password: 'senhafortesegura123',
            passwordConfirmation: 'senhafortesegura123',
          },
          'CLIENT',
        );
      }),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_CONFLICT',
    });
  });

  it('6. Erro de validação 400 -> normaliza para VALIDATION_ERROR com mensagem amigável', async () => {
    vi.spyOn(authApi, 'register').mockRejectedValue(
      new ApiError('Bad Request', 400, { message: 'CPF inválido.' }),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signUp(
          {
            name: 'Cliente Invalido',
            email: 'invalido@exemplo.com',
            cpf: '00000000000',
            password: 'senhafortesegura123',
            passwordConfirmation: 'senhafortesegura123',
          },
          'CLIENT',
        );
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'CPF inválido.',
    });
  });
});
