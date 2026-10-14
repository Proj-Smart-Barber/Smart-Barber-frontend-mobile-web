/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import VerifyEmailScreen from '@/app/(auth)/verify-email';
import { authApi } from '../api/auth.api';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSetParams = vi.fn();
let currentParams: Record<string, string | undefined> = {};

vi.mock('react-native', () => ({
  Platform: { OS: 'web', select: (options: any) => options.web ?? options.default },
  View: ({ children, style }: any) => <div style={style}>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Pressable: ({ children, onPress, disabled }: any) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  Feather: () => null,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => currentParams,
}));

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    colors: {
      brand: { primary: '#BD2026', silver: '#7C879F' },
      text: { primary: '#FFF', secondary: '#CCC' },
      feedback: {
        error: '#F00',
        errorBackground: '#300',
        errorBorder: '#500',
        success: '#0F0',
        successBackground: '#030',
        successBorder: '#050',
      },
      surface: { badge: '#222' },
      border: { ghost: '#444' },
    },
  }),
}));

vi.mock('@/features/auth', () => ({
  AuthLayout: ({ children, title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  FormField: ({ label, children }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  TextInput: ({ value, onChangeText, placeholder, disabled }: any) => (
    <input
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChangeText(e.target.value)}
    />
  ),
  Button: ({ title, onPress, disabled, loading }: any) => (
    <button onClick={onPress} disabled={disabled || loading}>
      {title}
    </button>
  ),
}));

describe('VerifyEmailScreen — Renderização, Limpeza de URL, Concorrência e Cooldown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentParams = {};
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. Confirma automaticamente ao montar com token na URL e limpa o token via router.replace', async () => {
    currentParams = {
      token: 'token-valido-abc',
      email: 'cliente@exemplo.com',
    };

    const confirmSpy = vi.spyOn(authApi, 'confirmEmailVerification').mockResolvedValue({
      verified: true,
      alreadyVerified: false,
      userId: 'u1',
      email: 'cliente@exemplo.com',
      emailVerifiedAt: '2026-10-13T12:00:00.000Z',
    });

    render(<VerifyEmailScreen />);

    // router.replace deve ter sido chamado para remover o token da URL e histórico
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalledWith({ token: undefined, email: 'cliente@exemplo.com', sent: undefined, sendFailed: undefined });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    expect(confirmSpy).toHaveBeenCalledWith('token-valido-abc');

    await waitFor(() => {
      expect(
        screen.getByText(/E-mail confirmado com sucesso! Você já pode fazer login/i),
      ).toBeDefined();
    });

    expect(screen.getByText('Ir para o Login')).toBeDefined();
  });

  it('2. Exibe mensagem específica quando alreadyVerified for true', async () => {
    currentParams = {
      token: 'token-ja-confirmado',
    };

    vi.spyOn(authApi, 'confirmEmailVerification').mockResolvedValue({
      verified: true,
      alreadyVerified: true,
      userId: 'u1',
      email: 'cliente@exemplo.com',
      emailVerifiedAt: '2026-10-13T12:00:00.000Z',
    });

    render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(
        screen.getByText(/Este e-mail já estava confirmado! Você já pode entrar na sua conta/i),
      ).toBeDefined();
    });

    expect(screen.getByText('Ir para o Login')).toBeDefined();
  });

  it('3. Exibe erro amigável quando token for inválido/expirado, mantendo a URL limpa', async () => {
    currentParams = {
      token: 'token-invalido-999',
      email: 'usuario@exemplo.com',
    };

    vi.spyOn(authApi, 'confirmEmailVerification').mockRejectedValue(
      new Error('Token de verificação expirado.'),
    );

    render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Token de verificação expirado.')).toBeDefined();
    });

    expect(mockSetParams).toHaveBeenCalledWith({ token: undefined, email: 'usuario@exemplo.com', sent: undefined, sendFailed: undefined });

    expect(screen.getByText('Reenviar Verificação')).toBeDefined();
  });

  it('4. Trava síncrona impede confirmações concorrentes simultâneas', async () => {
    currentParams = {
      token: 'token-concorrente',
    };

    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const confirmSpy = vi
      .spyOn(authApi, 'confirmEmailVerification')
      .mockReturnValue(pendingPromise as any);

    render(<VerifyEmailScreen />);

    const confirmButton = screen.queryByText('Confirmar E-mail');
    if (confirmButton) {
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);
    }

    expect(confirmSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise!({
        verified: true,
        alreadyVerified: false,
        userId: 'u1',
        email: 'c@ex.com',
        emailVerifiedAt: '2026-10-13T12:00:00.000Z',
      });
    });
  });

  it('5. Ativa cooldown visual de 60s no botão de reenvio após enviar verificação', async () => {
    currentParams = {
      email: 'reenvio@exemplo.com',
    };

    const sendSpy = vi.spyOn(authApi, 'sendEmailVerification').mockResolvedValue(undefined);

    render(<VerifyEmailScreen />);

    const resendButton = screen.getByText('Reenviar Verificação');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith('reenvio@exemplo.com');
    });

    await waitFor(() => {
      expect(screen.getByText(/Aguarde 60s para reenviar/i)).toBeDefined();
    });
  });

  describe('Bloqueador 2 — Regressões de Concorrência, Gerações de Tokens e Retry', () => {
    it('blocks repeated manual confirmations before React renders the loading state', async () => {
      let finish: (value: any) => void = () => {};
      const pending = new Promise<any>((resolve) => { finish = resolve; });
      const confirm = vi.spyOn(authApi, 'confirmEmailVerification').mockReturnValue(pending);
      render(<VerifyEmailScreen />);
      fireEvent.change(screen.getByPlaceholderText('Cole o código recebido por e-mail'), { target: { value: 'manual-synthetic-token' } });
      const button = screen.getByText('Confirmar E-mail');
      act(() => { fireEvent.click(button); fireEvent.click(button); });
      expect(confirm).toHaveBeenCalledTimes(1);
      await act(async () => { finish({ verified: true, alreadyVerified: false, userId: 'fixture', email: 'fixture@example.com', emailVerifiedAt: '2026-10-14T12:00:00Z' }); });
    });

    it('does not retain a rejected token for retry after a permanent API error', async () => {
      currentParams = { token: 'expired-synthetic-token' };
      vi.spyOn(authApi, 'confirmEmailVerification').mockRejectedValue(Object.assign(new Error('Token expirado'), { status: 400 }));
      render(<VerifyEmailScreen />);
      await waitFor(() => expect(screen.getByText('Token expirado')).toBeDefined());
      expect(screen.queryByText('Tentar novamente')).toBeNull();
    });
    it('6. A pendente -> B chega -> A resolve: resposta de A não confirma B; B é executado e seu resultado é o único exibido', async () => {
      currentParams = { token: 'synthetic-token-A' };

      let finishA: (val: any) => void = () => {};
      const deferredA = new Promise<any>((resolve) => {
        finishA = resolve;
      });

      let finishB: (val: any) => void = () => {};
      const deferredB = new Promise<any>((resolve) => {
        finishB = resolve;
      });

      const confirmSpy = vi.spyOn(authApi, 'confirmEmailVerification').mockImplementation((tok) => {
        if (tok === 'synthetic-token-A') return deferredA;
        if (tok === 'synthetic-token-B') return deferredB;
        return Promise.resolve({} as any);
      });

      const view = render(<VerifyEmailScreen />);

      // A está em voo
      expect(confirmSpy).toHaveBeenCalledWith('synthetic-token-A');

      // Agora chega token B
      currentParams = { token: 'synthetic-token-B' };
      view.rerender(<VerifyEmailScreen />);

      // Token B é disparado mesmo com A pendente
      expect(confirmSpy).toHaveBeenCalledWith('synthetic-token-B');

      // A resolve com sucesso (resultado obsoleto)
      await act(async () => {
        finishA({
          verified: true,
          alreadyVerified: false,
          userId: 'user-A',
          email: 'a@exemplo.com',
          emailVerifiedAt: '2026-10-14T10:00:00Z',
        });
      });

      // Como B ainda está pendente, o sucesso obsoleto de A NÃO deve aparecer
      expect(screen.queryByText(/E-mail confirmado com sucesso/i)).toBeNull();

      // Agora B resolve com falha/expirado
      await act(async () => {
        finishB(Promise.reject(new Error('Token B expirado ou inválido')));
      });

      // A tela deve refletir o resultado da tentativa atual (B)
      await waitFor(() => {
        expect(screen.getByText('Token B expirado ou inválido')).toBeDefined();
      });
      expect(screen.queryByText(/E-mail confirmado com sucesso/i)).toBeNull();
    });

    it('7. Ordem inversa: B resolve antes de A, e posterior resolução de A não altera o resultado de B', async () => {
      currentParams = { token: 'token-ordem-A' };

      let finishA: (val: any) => void = () => {};
      const deferredA = new Promise<any>((resolve) => {
        finishA = resolve;
      });

      let finishB: (val: any) => void = () => {};
      const deferredB = new Promise<any>((resolve) => {
        finishB = resolve;
      });

      vi.spyOn(authApi, 'confirmEmailVerification').mockImplementation((tok) => {
        if (tok === 'token-ordem-A') return deferredA;
        if (tok === 'token-ordem-B') return deferredB;
        return Promise.resolve({} as any);
      });

      const view = render(<VerifyEmailScreen />);

      currentParams = { token: 'token-ordem-B' };
      view.rerender(<VerifyEmailScreen />);

      // B resolve primeiro com sucesso
      await act(async () => {
        finishB({
          verified: true,
          alreadyVerified: false,
          userId: 'user-B',
          email: 'b@exemplo.com',
          emailVerifiedAt: '2026-10-14T10:00:00Z',
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/E-mail confirmado com sucesso/i)).toBeDefined();
      });

      // A resolve depois com erro
      await act(async () => {
        finishA(Promise.reject(new Error('Erro de A que deve ser descartado')));
      });

      // O erro de A NÃO sobrescreve o sucesso legítimo de B
      expect(screen.queryByText('Erro de A que deve ser descartado')).toBeNull();
      expect(screen.getByText(/E-mail confirmado com sucesso/i)).toBeDefined();
    });

    it('8. A confirmado -> novo token B chega: sucesso anterior é limpo e B é avaliado', async () => {
      currentParams = { token: 'token-sucesso-inicial' };

      vi.spyOn(authApi, 'confirmEmailVerification').mockResolvedValueOnce({
        verified: true,
        alreadyVerified: false,
        userId: 'u1',
        email: 'u1@exemplo.com',
        emailVerifiedAt: '2026-10-14T10:00:00Z',
      });

      const view = render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByText(/E-mail confirmado com sucesso/i)).toBeDefined();
      });

      // Novo token B chega
      let finishB: (val: any) => void = () => {};
      const deferredB = new Promise<any>((resolve) => {
        finishB = resolve;
      });
      vi.spyOn(authApi, 'confirmEmailVerification').mockReturnValueOnce(deferredB);

      currentParams = { token: 'novo-token-posterior' };
      view.rerender(<VerifyEmailScreen />);

      // O sucesso do token anterior é imediatamente limpo
      expect(screen.queryByText(/E-mail confirmado com sucesso/i)).toBeNull();

      // B resolve
      await act(async () => {
        finishB({
          verified: true,
          alreadyVerified: true,
          userId: 'u2',
          email: 'u2@exemplo.com',
          emailVerifiedAt: '2026-10-14T10:00:00Z',
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Este e-mail já estava confirmado!/i)).toBeDefined();
      });
    });

    it('9. Falha transitória exibe botão Tentar Novamente que retenta com o token em memória transitória', async () => {
      currentParams = { token: 'token-transitorio-falha' };

      const confirmSpy = vi
        .spyOn(authApi, 'confirmEmailVerification')
        .mockRejectedValueOnce(new Error('Falha temporária de conexão'))
        .mockResolvedValueOnce({
          verified: true,
          alreadyVerified: false,
          userId: 'u1',
          email: 'u1@exemplo.com',
          emailVerifiedAt: '2026-10-14T10:00:00Z',
        });

      render(<VerifyEmailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Falha temporária de conexão')).toBeDefined();
      });

      // Botão "Tentar novamente" está visível
      const retryButton = screen.getByText('Tentar novamente');
      expect(retryButton).toBeDefined();

      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledTimes(2);
        expect(confirmSpy).toHaveBeenLastCalledWith('token-transitorio-falha');
      });

      await waitFor(() => {
        expect(screen.getByText(/E-mail confirmado com sucesso!/i)).toBeDefined();
      });

      // Após sucesso, o botão de retry desaparece
      expect(screen.queryByText('Tentar novamente')).toBeNull();
    });

    it('10. Remontagem/reload com URL limpa não reexecuta confirmação automática', async () => {
      currentParams = {}; // URL limpa sem token

      const confirmSpy = vi.spyOn(authApi, 'confirmEmailVerification');

      render(<VerifyEmailScreen />);

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.queryByText(/E-mail confirmado/i)).toBeNull();
      expect(screen.getByText('Confirmar E-mail')).toBeDefined();
    });
  });
});
