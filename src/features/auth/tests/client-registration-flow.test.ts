/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRegisterViewModel } from '../model/use-register-view-model';
import { useLoginViewModel } from '../model/use-login-view-model';
import { useSession } from '../model/use-session';
import { resolveEntryDestination } from '../model/operational-context';
import type { SessionSnapshot } from '../model/session-engine';
import { ApiError } from '@/shared/api';
import { normalizeAuthError } from '../lib/normalize-auth-error';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({}),
}));

vi.mock('../model/use-session', () => ({
  useSession: vi.fn(),
}));

describe('Fluxo do Cliente — Cadastro, Confirmação e Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRegisterViewModel', () => {
    it('deve cadastrar conta CLIENT e redirecionar para verify-email com sent=1 quando envio for bem-sucedido', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({ emailSent: true });
      (useSession as any).mockReturnValue({
        signUp: mockSignUp,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useRegisterViewModel('CLIENT'));

      act(() => {
        result.current.setValue('name', 'Ana Santos');
        result.current.setValue('cpf', '111.444.777-35');
        result.current.setValue('email', 'ana.santos@exemplo.com');
        result.current.setValue('password', 'senhafortesegura123');
        result.current.setValue('passwordConfirmation', 'senhafortesegura123');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ana Santos',
          email: 'ana.santos@exemplo.com',
          cpf: '111.444.777-35',
        }),
        'CLIENT',
      );
      expect(mockPush).toHaveBeenCalledWith(
        '/(auth)/verify-email?email=ana.santos%40exemplo.com&sent=1',
      );
      expect(result.current.submitError).toBeNull();
    });

    it('deve redirecionar para verify-email com sendFailed=1 quando a conta for criada mas o envio de e-mail falhar', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({ emailSent: false });
      (useSession as any).mockReturnValue({
        signUp: mockSignUp,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useRegisterViewModel('CLIENT'));

      act(() => {
        result.current.setValue('name', 'Ana Santos');
        result.current.setValue('cpf', '111.444.777-35');
        result.current.setValue('email', 'ana.santos@exemplo.com');
        result.current.setValue('password', 'senhafortesegura123');
        result.current.setValue('passwordConfirmation', 'senhafortesegura123');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockSignUp).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(
        '/(auth)/verify-email?email=ana.santos%40exemplo.com&sendFailed=1',
      );
    });

    it('deve exibir submitError em caso de conflito 409 (CPF ou e-mail duplicado) sem navegar', async () => {
      const conflictError = normalizeAuthError(
        new ApiError('Conflict', 409, { error: 'O CPF ou o E-mail já está em uso.' }),
      );
      const mockSignUp = vi.fn().mockRejectedValue(conflictError);
      (useSession as any).mockReturnValue({
        signUp: mockSignUp,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useRegisterViewModel('CLIENT'));

      act(() => {
        result.current.setValue('name', 'Ana Santos');
        result.current.setValue('cpf', '111.444.777-35');
        result.current.setValue('email', 'ana.santos@exemplo.com');
        result.current.setValue('password', 'senhafortesegura123');
        result.current.setValue('passwordConfirmation', 'senhafortesegura123');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockSignUp).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.submitError).toContain('Já existe uma conta utilizando este CPF ou e-mail');
    });

    it('deve identificar falha de rede/timeout na criação como resultado incerto (isAmbiguousCreation)', async () => {
      const networkError = normalizeAuthError(
        new ApiError('Network request failed', 0, null, true),
      );
      const mockSignUp = vi.fn().mockRejectedValue(networkError);
      (useSession as any).mockReturnValue({
        signUp: mockSignUp,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useRegisterViewModel('CLIENT'));

      act(() => {
        result.current.setValue('name', 'Ana Santos');
        result.current.setValue('cpf', '111.444.777-35');
        result.current.setValue('email', 'ana.santos@exemplo.com');
        result.current.setValue('password', 'senhafortesegura123');
        result.current.setValue('passwordConfirmation', 'senhafortesegura123');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.isAmbiguousCreation).toBe(true);
      expect(result.current.ambiguousEmail).toBe('ana.santos@exemplo.com');
      expect(result.current.submitError).toContain('Instabilidade na conexão durante a criação da conta');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('deve bloquear disparos concorrentes de criação via trava síncrona isSubmittingRef', async () => {
      let resolveSignUp: (val: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });

      const mockSignUp = vi.fn().mockReturnValue(pendingPromise);
      (useSession as any).mockReturnValue({
        signUp: mockSignUp,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useRegisterViewModel('CLIENT'));

      act(() => {
        result.current.setValue('name', 'Ana Santos');
        result.current.setValue('cpf', '111.444.777-35');
        result.current.setValue('email', 'ana.santos@exemplo.com');
        result.current.setValue('password', 'senhafortesegura123');
        result.current.setValue('passwordConfirmation', 'senhafortesegura123');
      });

      // Dispara 2 submits quase simultâneos
      const p1 = result.current.onSubmit();
      const p2 = result.current.onSubmit();

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        resolveSignUp!({ emailSent: true });
        await Promise.all([p1, p2]);
      });
    });
  });

  describe('useLoginViewModel', () => {
    it('deve identificar 403 email_not_verified e ativar flag isEmailNotVerified', async () => {
      const emailNotVerifiedErr = normalizeAuthError(
        new ApiError('Forbidden', 403, {
          error: 'email_not_verified',
          message: 'E-mail não verificado.',
        }),
      );
      const mockSignIn = vi.fn().mockRejectedValue(emailNotVerifiedErr);
      (useSession as any).mockReturnValue({
        signIn: mockSignIn,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useLoginViewModel());

      act(() => {
        result.current.control._formValues.email = 'pendente@exemplo.com';
        result.current.control._formValues.password = 'minhasenha12345';
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.isEmailNotVerified).toBe(true);
      expect(result.current.submitError).toContain('Seu e-mail ainda não foi confirmado');
      expect(result.current.getEnteredEmail()).toBe('pendente@exemplo.com');
    });

    it('NÃO deve ativar flag isEmailNotVerified em erro 401 de credenciais incorretas', async () => {
      const invalidCredsErr = normalizeAuthError(
        new ApiError('Unauthorized', 401, { error: 'E-mail ou senha incorreto.' }),
      );
      const mockSignIn = vi.fn().mockRejectedValue(invalidCredsErr);
      (useSession as any).mockReturnValue({
        signIn: mockSignIn,
        status: 'unauthenticated',
        clearError: vi.fn(),
      });

      const { result } = renderHook(() => useLoginViewModel());

      act(() => {
        result.current.control._formValues.email = 'cliente@exemplo.com';
        result.current.control._formValues.password = 'senha-errada123';
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.isEmailNotVerified).toBe(false);
      expect(result.current.submitError).toBe('E-mail ou senha incorretos.');
    });
  });

  describe('Roteamento do cliente confirmado', () => {
    it('deve rotear cliente verificado sem unidade para /(client)', () => {
      const clientSnapshot: SessionSnapshot = {
        status: 'authenticated',
        identity: {
          id: 'client-user-id',
          name: 'Cliente Verificado',
          email: 'cliente@exemplo.com',
          accountType: 'CLIENT',
          emailVerifiedAt: '2026-10-13T10:00:00.000Z',
        },
        memberships: [],
        selectedShopId: null,
        revocationPending: false,
        accessToken: 'valid-jwt',
      };

      const dest = resolveEntryDestination(clientSnapshot);
      expect(dest).toBe('/(client)');
    });
  });
});
