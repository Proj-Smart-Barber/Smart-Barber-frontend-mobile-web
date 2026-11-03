// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { EditProfileModal } from '../ui/EditProfileModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

const mockRefreshIdentity = vi.fn(async () => undefined);

const mockIdentity = {
  id: 'user-1',
  name: 'Lucas Antigo',
  email: 'lucas@smartbarber.com',
  phoneNumber: '11988887777',
  accountType: 'CLIENT' as const,
};

vi.mock('../model/use-session', () => ({
  useSession: () => ({
    identity: mockIdentity,
    refreshIdentity: mockRefreshIdentity,
  }),
}));

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { primary: '#fff', secondary: '#ccc', muted: '#888' },
      surface: { input: '#111', selected: '#222' },
      border: { subtle: '#333' },
      brand: { primary: '#f00' },
    },
    spacing: [0, 4, 8, 12, 16, 20, 24],
    radius: { md: 8, xl: 16, full: 999 },
    isDark: true,
  }),
  useReducedMotion: () => false,
  useReducedTransparency: () => false,
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
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
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ visible, children }: any) => (visible ? <div data-testid="modal">{children}</div> : null),
  Platform: { OS: 'web', select: (opt: any) => opt.web ?? opt.default },
  StyleSheet: {
    create: (v: any) => v,
    flatten: (v: any) => (Array.isArray(v) ? Object.assign({}, ...v) : (v || {})),
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
  Text: ({ children, style }: any) => <span style={style}>{children}</span>,
  Badge: ({ label }: any) => <span data-testid="badge">{label}</span>,
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  FormField: ({ label, error, helperText, children }: any) => (
    <div>
      <label>{label}</label>
      {children}
      {error && <span role="alert">{error}</span>}
      {helperText && <span>{helperText}</span>}
    </div>
  ),
  TextInput: ({ value, onChangeText, placeholder, editable = true }: any) => (
    <input
      data-testid={`input-${placeholder}`}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
      disabled={!editable}
    />
  ),
}));

describe('EditProfileModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderModal = (props: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EditProfileModal {...props} />
      </QueryClientProvider>,
    );
  };

  it('renders initial user values when open', () => {
    renderModal({ visible: true, onClose: () => {} });

    expect(screen.getByTestId('modal')).toBeDefined();
    const nameInput = screen.getByTestId('input-Ex: Lucas Andrade') as HTMLInputElement;
    expect(nameInput.value).toBe('Lucas Antigo');

    const phoneInput = screen.getByTestId('input-(11) 99999-9999') as HTMLInputElement;
    expect(phoneInput.value).toBe('(11) 98888-7777');

    expect(screen.getByText('lucas@smartbarber.com')).toBeDefined();
    expect(screen.getByText('Somente leitura')).toBeDefined();
  });

  it('validates name required and min length', async () => {
    const updateSpy = vi.spyOn(authApi, 'updateProfile').mockResolvedValue({ user: {} } as any);
    renderModal({ visible: true, onClose: () => {} });

    const nameInput = screen.getByTestId('input-Ex: Lucas Andrade');
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'A' } });
    });

    const saveButton = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter pelo menos 2 caracteres.')).toBeDefined();
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('formats phone progressively and validates incomplete phone', async () => {
    const updateSpy = vi.spyOn(authApi, 'updateProfile').mockResolvedValue({ user: {} } as any);
    renderModal({ visible: true, onClose: () => {} });

    const phoneInput = screen.getByTestId('input-(11) 99999-9999');
    act(() => {
      fireEvent.change(phoneInput, { target: { value: '1199' } });
    });

    const saveButton = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Telefone deve conter DDD e 8 ou 9 dígitos.')).toBeDefined();
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('submits updated profile and triggers identity refresh and close on success', async () => {
    const updateSpy = vi.spyOn(authApi, 'updateProfile').mockResolvedValue({ user: {} } as any);
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderModal({ visible: true, onClose: handleClose, onSuccess: handleSuccess });

    const nameInput = screen.getByTestId('input-Ex: Lucas Andrade');
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Lucas Atualizado' } });
    });

    const phoneInput = screen.getByTestId('input-(11) 99999-9999');
    act(() => {
      fireEvent.change(phoneInput, { target: { value: '11999998888' } });
    });

    const saveButton = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        name: 'Lucas Atualizado',
        phoneNumber: '11999998888',
      });
      expect(mockRefreshIdentity).toHaveBeenCalled();
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays error alert when api update fails', async () => {
    vi.spyOn(authApi, 'updateProfile').mockRejectedValue(new Error('Serviço indisponível no momento'));

    renderModal({ visible: true, onClose: () => {} });

    const saveButton = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Serviço indisponível no momento')).toBeDefined();
    });
  });
});
