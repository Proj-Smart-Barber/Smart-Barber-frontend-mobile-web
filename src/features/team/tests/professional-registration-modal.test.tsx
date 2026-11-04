// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfessionalRegistrationModal } from '../ui/ProfessionalRegistrationModal';
import { teamApi } from '../api/team.api';
import * as operationApi from '@/shared/operations/operation-attempt.api';
import { ApiError } from '@/shared/api';

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    identity: { id: 'owner-user-1', name: 'Owner' },
    selectedShopId: 'shop-1',
  }),
}));

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { primary: '#fff', secondary: '#ccc', muted: '#888' },
      surface: { elevated: '#222' },
      border: { subtle: '#333' },
      background: { card: '#111' },
    },
    spacing: [0, 4, 8, 12, 16, 20, 24],
    radius: { md: 8, xl: 16 },
  }),
}));

vi.mock('react-native', () => ({
  View: ({ children, style }: any) => <div style={style}>{children}</div>,
  Text: ({ children, style }: any) => <span style={style}>{children}</span>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Pressable: ({ children, onPress, disabled }: any) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
  Modal: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
  Platform: { OS: 'web', select: (opt: any) => opt.web ?? opt.default },
  StyleSheet: {
    create: (v: any) => v,
  },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ title, onPress, disabled, loading }: any) => (
    <button onClick={onPress} disabled={disabled || loading}>
      {title}
    </button>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  Alert: ({ title, message, variant }: any) => (
    <div role="alert" data-variant={variant}>
      <strong>{title}</strong>: {message}
    </div>
  ),
  FormField: ({ label, children }: any) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
  TextInput: ({ value, onChangeText, placeholder, editable }: any) => (
    <input
      data-testid={placeholder}
      placeholder={placeholder}
      value={value}
      disabled={editable === false}
      onChange={(e) => onChangeText(e.target.value)}
    />
  ),
}));

describe('ProfessionalRegistrationModal - Resiliência e Reconciliação', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderModal = (shopId = 'shop-1') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProfessionalRegistrationModal
          visible={true}
          shopId={shopId}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );
  };

  it('1. Timeout mantém formulário e chave da tentativa', async () => {
    let capturedKey1: string | null = null;
    vi.spyOn(teamApi, 'createBarberRegistration').mockImplementation(
      async (_shopId, _payload, key) => {
        capturedKey1 = key;
        throw new ApiError('A requisição excedeu o tempo limite (timeout).', 0, null, true);
      },
    );

    renderModal();

    // Preenche dados
    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Barbeiro' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '11144477735' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'carlos@example.com' },
    });

    // Avança para revisão
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText('Revisar Cadastro')).toBeDefined();

    // Envia
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/timeout/i)).toBeDefined();
    });

    expect(capturedKey1).not.toBeNull();
    // Permanece na tela de revisão com os dados preservados
    expect(screen.getByText('Carlos Barbeiro')).toBeDefined();
    expect(screen.getByText('carlos@example.com')).toBeDefined();
    expect(screen.getByText('Reenviar com Segurança')).toBeDefined();
  });

  it('2. Retry seguro reutiliza a mesma chave idempotente', async () => {
    const keysCaptured: string[] = [];

    vi.spyOn(operationApi, 'findOwnAttempt').mockResolvedValue({
      state: 'UNKNOWN',
    });

    vi.spyOn(teamApi, 'createBarberRegistration').mockImplementation(
      async (_shopId, _payload, key) => {
        keysCaptured.push(key);
        if (keysCaptured.length === 1) {
          throw new ApiError('Timeout', 0, null, true);
        }
        return {
          registrationId: 'reg-1',
          invitationId: 'inv-1',
          email: 'carlos@example.com',
          status: 'PENDING',
          deliveryStatus: 'ACCEPTED',
          requiresExistingAccountLogin: false,
        };
      },
    );

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Barbeiro' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '11144477735' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'carlos@example.com' },
    });

    fireEvent.click(screen.getByText('Continuar'));
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Reenviar com Segurança')).toBeDefined();
    });

    // Reenvia com segurança
    fireEvent.click(screen.getByText('Reenviar com Segurança'));

    await waitFor(() => {
      expect(screen.getByText('Convite Enviado com Sucesso')).toBeDefined();
    });

    expect(keysCaptured).toHaveLength(2);
    // Chave UUIDv7 é estritamente a mesma nas duas tentativas!
    expect(keysCaptured[0]).toBe(keysCaptured[1]);
  });

  it('3. Reconciliação APPLIED mostra resultado sem novo cadastro', async () => {
    let createCalls = 0;
    vi.spyOn(teamApi, 'createBarberRegistration').mockImplementation(
      async () => {
        createCalls += 1;
        throw new ApiError('Timeout', 0, null, true);
      },
    );

    vi.spyOn(operationApi, 'findOwnAttempt').mockResolvedValue({
      state: 'APPLIED',
      resource: {
        id: 'reg-reconciled',
        data: {
          registrationId: 'reg-reconciled',
          invitationId: 'inv-reconciled',
          email: 'carlos@example.com',
          status: 'PENDING',
          deliveryStatus: 'ACCEPTED',
          requiresExistingAccountLogin: false,
        },
      },
    });

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Barbeiro' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '11144477735' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'carlos@example.com' },
    });

    fireEvent.click(screen.getByText('Continuar'));
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Verificar Situação no Servidor')).toBeDefined();
    });

    // Usuário clica em consultar situação
    fireEvent.click(screen.getByText('Verificar Situação no Servidor'));

    await waitFor(() => {
      expect(screen.getByText('Convite Enviado com Sucesso')).toBeDefined();
    });

    // Nenhuma nova chamada de criação foi disparada
    expect(createCalls).toBe(1);
  });

  it('4. PENDING bloqueia duplicação e avisa que transação está em andamento', async () => {
    vi.spyOn(teamApi, 'createBarberRegistration').mockRejectedValue(
      new ApiError('Timeout', 0, null, true),
    );

    vi.spyOn(operationApi, 'findOwnAttempt').mockResolvedValue({
      state: 'PENDING',
    });

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Barbeiro' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '11144477735' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'carlos@example.com' },
    });

    fireEvent.click(screen.getByText('Continuar'));
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Verificar Situação no Servidor')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Verificar Situação no Servidor'));

    await waitFor(() => {
      expect(screen.getByText(/processada no servidor/i)).toBeDefined();
    });
  });

  it('5. Alteração de payload encerra tentativa anterior e gera nova chave', async () => {
    const keysCaptured: string[] = [];
    const closeSpy = vi.spyOn(operationApi, 'closeOwnAttempt').mockResolvedValue({
      state: 'NOT_APPLIED',
    });

    vi.spyOn(teamApi, 'createBarberRegistration').mockImplementation(
      async (_shopId, _payload, key) => {
        keysCaptured.push(key);
        if (keysCaptured.length === 1) {
          throw new ApiError('Timeout', 0, null, true);
        }
        return {
          registrationId: 'reg-2',
          invitationId: 'inv-2',
          email: 'novo@example.com',
          status: 'PENDING',
          deliveryStatus: 'ACCEPTED',
          requiresExistingAccountLogin: false,
        };
      },
    );

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Original' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '11144477735' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'original@example.com' },
    });

    fireEvent.click(screen.getByText('Continuar'));
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/timeout/i)).toBeDefined();
    });

    // Usuário clica em Voltar e Editar e altera o e-mail
    fireEvent.click(screen.getByText('Voltar e Editar'));
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'novo@example.com' },
    });

    fireEvent.click(screen.getByText('Continuar'));
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Convite Enviado com Sucesso')).toBeDefined();
    });

    // Tentativa anterior foi explicitamente fechada
    expect(closeSpy).toHaveBeenCalledWith(keysCaptured[0]);
    // Uma nova chave diferente foi gerada para o payload alterado
    expect(keysCaptured).toHaveLength(2);
    expect(keysCaptured[0]).not.toBe(keysCaptured[1]);
  });

  it('6. Troca de unidade reseta estado do modal', async () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProfessionalRegistrationModal
          visible={true}
          shopId="shop-1"
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Silva' },
    });
    expect((screen.getByPlaceholderText('Ex: Carlos Silva') as HTMLInputElement).value).toBe('Carlos Silva');

    // Troca de unidade
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProfessionalRegistrationModal
          visible={true}
          shopId="shop-2"
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // Formulário foi limpo
    expect((screen.getByPlaceholderText('Ex: Carlos Silva') as HTMLInputElement).value).toBe('');
  });

  it('7. Mensagens distinguem convite enviado vs cadastro com envio pendente', async () => {
    vi.spyOn(teamApi, 'createBarberRegistration').mockResolvedValue({
      registrationId: 'reg-pending',
      invitationId: 'inv-pending',
      email: 'pendente@example.com',
      status: 'PENDING',
      deliveryStatus: 'PENDING', // Intenção gravada no outbox, aguardando envio
      requiresExistingAccountLogin: false,
    });

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Carlos Pendente' },
    });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), {
      target: { value: '11144477735' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'pendente@example.com' },
    });

    fireEvent.click(screen.getByText('Continuar'));
    fireEvent.click(screen.getByText('Confirmar e Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Cadastro Realizado com Sucesso')).toBeDefined();
      expect(screen.getByText(/fila e será entregue em instantes/i)).toBeDefined();
    });
  });
});
