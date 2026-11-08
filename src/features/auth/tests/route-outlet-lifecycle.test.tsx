// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  segments: ['(client)'] as string[],
  mounts: 0,
  unmounts: 0,
  platform: 'web',
  fontsLoaded: true,
  sessionStatus: 'authenticated',
  isCompact: false,
  replacedRoutes: [] as string[],
}));
vi.mock('expo-router', () => ({
  useSegments: () => fixture.segments,
  useRouter: () => ({
    replace: vi.fn((route: string) => {
      fixture.replacedRoutes.push(route);
    }),
  }),
  Slot: () => {
    React.useEffect(() => {
      fixture.mounts++;
      return () => {
        fixture.unmounts++;
      };
    }, []);
    return <div data-testid="route-slot">Route content</div>;
  },
}));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return fixture.platform;
    },
  },
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
}));
vi.mock('expo-font', () => ({ FontDisplay: { SWAP: 'swap' } }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: async () => {},
  hideAsync: async () => {},
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: { font: {} } }));
vi.mock('@expo-google-fonts/epilogue', () => ({
  useFonts: () => [fixture.fontsLoaded, null],
  Epilogue_700Bold: 1,
  Epilogue_800ExtraBold: 1,
}));
vi.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 1,
  Inter_500Medium: 1,
  Inter_600SemiBold: 1,
  Inter_700Bold: 1,
}));
vi.mock('@/features/auth', () => ({
  SessionProvider: ({ children }: any) => children,
  useSession: () => ({
    status: fixture.sessionStatus,
    identity: { id: 'fixture-client', accountType: 'CLIENT' },
    memberships: [],
    selectedShopId: null,
    restoreSession: vi.fn(),
    signOut: vi.fn(),
    error: fixture.sessionStatus === 'error' ? new Error('Falha de sessão') : null,
  }),
  SessionRecoveryScreen: () => <div data-testid="session-recovery-screen">Recuperação de Sessão</div>,
}));
vi.mock('@/shared/theme', () => ({
  ThemeProvider: ({ children }: any) => children,
  useTheme: () => ({
    isDark: true,
    colors: { surface: { input: '#111' }, text: { primary: '#fff' } },
  }),
  useAdaptiveLayout: () => ({
    isCompact: fixture.isCompact,
    isExpanded: !fixture.isCompact,
  }),
}));
vi.mock('@/shared/ui', () => ({
  BootstrapScreen: ({ message }: { message: string }) => (
    <div data-testid="bootstrap-screen">{message}</div>
  ),
  ToastProvider: ({ children }: any) => children,
}));
vi.mock('@/features/bookings', () => ({ serverClock: { clear() {} } }));
vi.mock('@/features/discovery', () => ({
  locationStore: { clear() {}, restoreFromCache: async () => ({}) },
}));
vi.mock('@/shared/operations/OperationLifecycleBridge', () => ({
  OperationLifecycleBridge: () => null,
}));
import RootLayout from '@/app/_layout';
afterEach(() => {
  cleanup();
  fixture.segments = ['(client)'];
  fixture.mounts = 0;
  fixture.unmounts = 0;
  fixture.platform = 'web';
  fixture.fontsLoaded = true;
  fixture.sessionStatus = 'authenticated';
  fixture.isCompact = false;
  fixture.replacedRoutes = [];
});

it('keeps the route outlet mounted when entering and leaving the public catalog', () => {
  fixture.segments = ['(client)'];
  fixture.mounts = 0;
  fixture.unmounts = 0;
  const view = render(<RootLayout />);
  expect(fixture.mounts).toBe(1);
  fixture.segments = ['(public)', 'barbershops', '[shopId]', 'services'];
  view.rerender(<RootLayout />);
  expect(fixture.mounts).toBe(1);
  expect(fixture.unmounts).toBe(0);
  fixture.segments = ['(client)'];
  view.rerender(<RootLayout />);
  expect(fixture.mounts).toBe(1);
  expect(fixture.unmounts).toBe(0);
});

it('renders BootstrapScreen when fonts are not yet loaded on native platforms', () => {
  fixture.platform = 'ios';
  fixture.fontsLoaded = false;
  const view = render(<RootLayout />);
  expect(view.getByTestId('bootstrap-screen')).toBeTruthy();
  expect(view.queryByTestId('route-slot')).toBeNull();
});

it('renders BootstrapScreen when session is bootstrapping', () => {
  fixture.sessionStatus = 'bootstrapping';
  const view = render(<RootLayout />);
  expect(view.getByTestId('bootstrap-screen')).toBeTruthy();
  expect(view.queryByTestId('route-slot')).toBeNull();
});

it('renders SessionRecoveryScreen when session encounters an unrecoverable error', () => {
  fixture.sessionStatus = 'error';
  const view = render(<RootLayout />);
  expect(view.getByTestId('session-recovery-screen')).toBeTruthy();
  expect(view.queryByTestId('route-slot')).toBeNull();
});

it('resizing between compact and desktop while on (client) does not force redirect or remount outlet', () => {
  fixture.segments = ['(client)'];
  fixture.isCompact = false;
  const view = render(<RootLayout />);
  expect(fixture.mounts).toBe(1);
  expect(fixture.replacedRoutes).toHaveLength(0);

  // Redimensiona para viewport compacto
  fixture.isCompact = true;
  view.rerender(<RootLayout />);
  expect(fixture.mounts).toBe(1);
  expect(fixture.unmounts).toBe(0);
  expect(fixture.replacedRoutes).toHaveLength(0);

  // Redimensiona de volta para desktop
  fixture.isCompact = false;
  view.rerender(<RootLayout />);
  expect(fixture.mounts).toBe(1);
  expect(fixture.unmounts).toBe(0);
  expect(fixture.replacedRoutes).toHaveLength(0);
});

it('routes compact client to /(client)/explore on root entry fallback', () => {
  fixture.segments = [];
  fixture.isCompact = true;
  render(<RootLayout />);
  expect(fixture.replacedRoutes).toContain('/(client)/explore');
});

it('routes desktop client to /(client)/explore on root entry fallback', () => {
  fixture.segments = [];
  fixture.isCompact = false;
  render(<RootLayout />);
  expect(fixture.replacedRoutes).toContain('/(client)/explore');
});
