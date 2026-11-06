// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditProfileModal } from '../ui/EditProfileModal';
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
      feedback: { error: '#e00' },
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

describe('EditProfileModal Submitting State', () => {
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

  it('exibe texto honesto "Salvando alterações…" e desabilita envio durante a mutação', async () => {
    let resolveMutation: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveMutation = resolve;
    });

    vi.spyOn(authApi, 'updateProfile').mockImplementation(() => pendingPromise as any);

    render(
      <QueryClientProvider client={queryClient}>
        <EditProfileModal visible={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    const saveBtn = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveBtn);
    });

    // O botão deve mudar de rótulo para "Salvando alterações…" e estar desabilitado
    await waitFor(() => {
      const savingBtn = screen.getByText('Salvando alterações…');
      expect(savingBtn).toBeDefined();
      expect(savingBtn.hasAttribute('disabled')).toBe(true);
    });

    resolveMutation!({ id: 'user-1', name: 'Lucas Antigo' });
  });
});
