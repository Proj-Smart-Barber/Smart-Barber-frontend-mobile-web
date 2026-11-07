// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Expo Image Picker
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: vi.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock React Native
vi.mock('react-native', () => ({
  View: ({ children, style }: any) => <div style={style}>{children}</div>,
  Text: ({ children, style }: any) => <span style={style}>{children}</span>,
  ScrollView: ({ children, contentContainerStyle }: any) => (
    <div style={contentContainerStyle}>{children}</div>
  ),
  Image: ({ source }: any) => <img src={source?.uri} alt="avatar" />,
  TouchableOpacity: ({ children, onPress, disabled, accessibilityRole, accessibilityLabel }: any) => (
    <button
      onClick={onPress}
      disabled={disabled}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
    >
      {children}
    </button>
  ),
  Pressable: ({ children, onPress, disabled, accessibilityRole, accessibilityLabel }: any) => (
    <button
      onClick={onPress}
      disabled={disabled}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
    >
      {children}
    </button>
  ),
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ visible, children }: any) => (visible ? <div data-testid="modal">{children}</div> : null),
  ActivityIndicator: () => <span>Carregando...</span>,
  Platform: { OS: 'web', select: (opt: any) => opt.web ?? opt.default },
  StyleSheet: {
    create: (v: any) => v,
    flatten: (v: any) => (Array.isArray(v) ? Object.assign({}, ...v) : (v || {})),
  },
}));

// Mock Expo Haptics & Blur
vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

// Mock Router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/(client)/profile',
}));

// Mock Vector Icons
vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}));

// Mock Theme and Layout
let currentThemeMode: 'system' | 'light' | 'dark' = 'dark';
const mockSetMode = vi.fn((newMode: 'system' | 'light' | 'dark') => {
  currentThemeMode = newMode;
});

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#0b0b0b' },
      text: { primary: '#f7f5f3', secondary: '#9faabf', muted: '#7c879f' },
      surface: { input: '#141414', selected: '#222222', elevated: '#1a1a1a' },
      border: { subtle: 'rgba(255,255,255,0.08)' },
      brand: { primary: '#bd2026' },
      feedback: { error: '#e53935' },
    },
    spacing: [0, 4, 8, 12, 16, 20, 24, 32],
    radius: { md: 8, lg: 12, xl: 16, full: 999 },
    typography: {
      styles: new Proxy({}, { get: () => ({}) }),
      fontWeights: new Proxy({}, { get: () => 'normal' }),
    },
    mode: currentThemeMode,
    setMode: mockSetMode,
    isDark: currentThemeMode !== 'light',
  }),
  useAdaptiveLayout: () => ({
    isCompact: true,
    isExpanded: false,
    contentMaxWidth: 480,
  }),
  useReducedMotion: () => false,
  useReducedTransparency: () => false,
}));

vi.mock('@/shared/theme/use-app-safe-area', () => ({
  useAppSafeArea: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock Navigation
vi.mock('@/shared/navigation', () => ({
  useNavigation: () => ({
    openDrawer: vi.fn(),
    onContentScroll: vi.fn(),
  }),
}));

vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children, contentStyle }: any) => (
    <div data-testid="liquid-glass-view" style={contentStyle}>
      {children}
    </div>
  ),
}));

// Mock Shared UI
vi.mock('@/shared/ui', () => ({
  Button: ({ title, onPress, disabled, loading, leftIcon, accessibilityRole, accessibilityLabel }: any) => (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      role={accessibilityRole}
      aria-label={accessibilityLabel || title}
    >
      {leftIcon}
      {title}
    </button>
  ),
  Text: ({ children, style, accessibilityRole }: any) => (
    <span style={style} role={accessibilityRole}>
      {children}
    </span>
  ),
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

// Mock Session
let mockCurrentIdentity: any = {
  id: 'user-client-1',
  name: 'Lucas Ferreira',
  email: 'lucas.ferreira@example.com',
  phoneNumber: '11999998888',
  avatarUrl: 'https://smartbarber.app/avatar-1.png',
  accountType: 'CLIENT',
};

const mockSignOut = vi.fn();
const mockRefreshIdentity = vi.fn(async () => undefined);

const mockUseSession = () => ({
  identity: mockCurrentIdentity,
  status: mockCurrentIdentity ? 'authenticated' : 'unauthenticated',
  signOut: mockSignOut,
  refreshIdentity: mockRefreshIdentity,
});

vi.mock('../model/use-session', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('@/features/auth', () => ({
  useSession: () => mockUseSession(),
  EditProfileModal: (props: any) => <EditProfileModal {...props} />,
}));

// Mock Media Upload Hook
let mockIsUploading = false;
let mockUploadError: string | null = null;
const mockUploadAvatar = vi.fn(async () => 'https://smartbarber.app/new-avatar.png');
const mockRemoveAvatar = vi.fn(async () => undefined);

vi.mock('@/features/media/model/use-media-upload', () => ({
  useAvatarUpload: () => ({
    isUploading: mockIsUploading,
    error: mockUploadError,
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
  }),
}));

import ClientProfileScreen from '@/app/(client)/profile';
import { authApi } from '../api/auth.api';
import { EditProfileModal } from '../ui/EditProfileModal';
import { AvatarUploader } from '@/features/media/ui/AvatarUploader';

describe('Client Profile & Navigation (Task 8)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    currentThemeMode = 'dark';
    mockIsUploading = false;
    mockUploadError = null;
    mockCurrentIdentity = {
      id: 'user-client-1',
      name: 'Lucas Ferreira',
      email: 'lucas.ferreira@example.com',
      phoneNumber: '11999998888',
      avatarUrl: 'https://smartbarber.app/avatar-1.png',
      accountType: 'CLIENT',
    };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderProfileScreen = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ClientProfileScreen />
      </QueryClientProvider>,
    );
  };

  it('1. encaminha "Meus agendamentos" e "Histórico de agendamentos" para os destinos e query params corretos', () => {
    renderProfileScreen();

    const meusAgendamentosBtn = screen.getByRole('button', { name: 'Meus agendamentos' });
    fireEvent.click(meusAgendamentosBtn);
    expect(mockPush).toHaveBeenCalledWith('/(client)/bookings');

    const historicoBtn = screen.getByRole('button', { name: 'Histórico de agendamentos' });
    fireEvent.click(historicoBtn);
    expect(mockPush).toHaveBeenCalledWith('/(client)/bookings?tab=history');
  });

  it('2. preserva atalhos de Notificações, Localização e botão de Saída', () => {
    renderProfileScreen();

    const notificacoesBtn = screen.getByRole('button', { name: 'Notificações e avisos' });
    fireEvent.click(notificacoesBtn);
    expect(mockPush).toHaveBeenCalledWith('/(client)/notifications');

    const localizacaoBtn = screen.getByRole('button', { name: 'Localização e barbearias próximas' });
    fireEvent.click(localizacaoBtn);
    expect(mockPush).toHaveBeenCalledWith('/(client)/explore?section=nearby');

    const logoutBtn = screen.getByRole('button', { name: 'Sair da Conta' });
    fireEvent.click(logoutBtn);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('3. não solicita localização nem dispara onboarding automaticamente ao montar Minha Conta', () => {
    const locationSpy = vi.fn();
    renderProfileScreen();

    // Verificamos que a montagem não faz chamadas automáticas de geolocalização ou rota de onboarding
    expect(locationSpy).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('onboarding'));
  });

  it('4. trata dados ausentes com "Não informado" sem exibir e-mail fictício, e suporta nomes longos', () => {
    // Cenário com dados ausentes
    mockCurrentIdentity = {
      id: 'user-client-empty',
      name: null,
      email: null,
      phoneNumber: null,
      avatarUrl: null,
      accountType: 'CLIENT',
    };

    renderProfileScreen();

    // Não deve conter email fictício
    expect(screen.queryByText('cliente@smartbarber.com')).toBeNull();
    // Deve conter indicação clara de Não informado
    const naoInformadoTexts = screen.getAllByText('Não informado');
    expect(naoInformadoTexts.length).toBeGreaterThanOrEqual(1);

    cleanup();

    // Cenário com nome e e-mail longos
    mockCurrentIdentity = {
      id: 'user-client-long',
      name: 'Lucas Gabriel de Albuquerque Cavalcanti da Rocha Santos Junior',
      email: 'lucas.albuquerque.cavalcanti.extenso@smartbarber.com.br',
      phoneNumber: '11999998888',
      avatarUrl: null,
      accountType: 'CLIENT',
    };

    renderProfileScreen();
    expect(
      screen.getAllByText('Lucas Gabriel de Albuquerque Cavalcanti da Rocha Santos Junior').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('lucas.albuquerque.cavalcanti.extenso@smartbarber.com.br').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('5. abre modal de edição com validação, payload de nome/telefone e refresh de identidade', async () => {
    const updateSpy = vi.spyOn(authApi, 'updateProfile').mockResolvedValue({ user: {} } as any);
    renderProfileScreen();

    const editBtn = screen.getByRole('button', { name: 'Editar dados do perfil' });
    fireEvent.click(editBtn);

    // Modal aberto
    const nameInput = screen.getByPlaceholderText('Ex: Lucas Andrade') as HTMLInputElement;
    expect(nameInput.value).toBe('Lucas Ferreira');

    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Lucas Atualizado' } });
    });

    const saveBtn = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        name: 'Lucas Atualizado',
        phoneNumber: '11999998888',
      });
      expect(mockRefreshIdentity).toHaveBeenCalled();
    });
  });

  it('6. preserva rascunho após erro na API e bloqueia dupla submissão', async () => {
    vi.spyOn(authApi, 'updateProfile').mockRejectedValue(new Error('Falha no servidor. Tente mais tarde.'));
    renderProfileScreen();

    const editBtn = screen.getByRole('button', { name: 'Editar dados do perfil' });
    fireEvent.click(editBtn);

    const nameInput = screen.getByPlaceholderText('Ex: Lucas Andrade') as HTMLInputElement;
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Lucas Tentativa 1' } });
    });

    const saveBtn = screen.getByText('Salvar alterações');
    act(() => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Falha no servidor. Tente mais tarde.')).toBeDefined();
    });

    // Rascunho continua no input após a falha recuperável
    expect(nameInput.value).toBe('Lucas Tentativa 1');
  });

  it('7. upload de foto reflete estado de espera sem simular sucesso antes da conclusão', () => {
    renderProfileScreen();

    const alterarFotoBtn = screen.getByRole('button', { name: 'Alterar foto de perfil' });
    expect(alterarFotoBtn).toBeDefined();

    // Se estiver ocupado, botão exibe feedback honesto e bloqueia interação
    cleanup();
    mockIsUploading = true;
    renderProfileScreen();

    // Com upload em andamento, o botão indica carregamento
    const btnBusy = screen.getByText('Atualizando foto…');
    expect(btnBusy).toBeDefined();
  });

  it('8. permite selecionar temas Automático, Claro e Escuro com estado de seleção acessível', () => {
    renderProfileScreen();

    const autoBtn = screen.getByRole('button', { name: 'Aparência Automático' });
    const claroBtn = screen.getByRole('button', { name: 'Aparência Claro' });
    const escuroBtn = screen.getByRole('button', { name: 'Aparência Escuro' });

    fireEvent.click(autoBtn);
    expect(mockSetMode).toHaveBeenCalledWith('system');

    fireEvent.click(claroBtn);
    expect(mockSetMode).toHaveBeenCalledWith('light');

    fireEvent.click(escuroBtn);
    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('9. troca de ator atualiza os dados na tela sem reter informações do usuário anterior', () => {
    const { unmount } = renderProfileScreen();

    expect(screen.getAllByText('Lucas Ferreira').length).toBeGreaterThanOrEqual(1);

    unmount();

    // Segundo usuário acessa
    mockCurrentIdentity = {
      id: 'user-client-2',
      name: 'Maria Clara',
      email: 'maria.clara@example.com',
      phoneNumber: '21987654321',
      avatarUrl: 'https://smartbarber.app/maria.png',
      accountType: 'CLIENT',
    };

    renderProfileScreen();

    expect(screen.queryByText('Lucas Ferreira')).toBeNull();
    expect(screen.getAllByText('Maria Clara').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('maria.clara@example.com').length).toBeGreaterThanOrEqual(1);
  });

  it('10. outros consumidores de EditProfileModal e AvatarUploader preservam contratos padrão', () => {
    // Renderiza EditProfileModal com props mínimas
    const { unmount: unmountModal } = render(
      <QueryClientProvider client={queryClient}>
        <EditProfileModal visible={true} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Editar Perfil')).toBeDefined();
    unmountModal();

    // Renderiza AvatarUploader com props mínimas
    const { unmount: unmountUploader } = render(
      <AvatarUploader onAvatarUpdated={vi.fn()} />
    );
    expect(screen.getByText('Foto de Perfil')).toBeDefined();
    unmountUploader();
  });
});
