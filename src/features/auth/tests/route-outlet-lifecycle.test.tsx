// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ segments: ['(client)'] as string[], mounts: 0, unmounts: 0 }));
vi.mock('expo-router', () => ({
  useSegments: () => fixture.segments,
  useRouter: () => ({ replace: vi.fn() }),
  Slot: () => { React.useEffect(() => { fixture.mounts++; return () => { fixture.unmounts++; }; }, []); return <div>Route content</div>; },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }: any) => children }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-splash-screen', () => ({ preventAutoHideAsync: async () => {}, hideAsync: async () => {} }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: { font: {} } }));
vi.mock('@expo-google-fonts/epilogue', () => ({ useFonts: () => [true], Epilogue_700Bold: 1, Epilogue_800ExtraBold: 1 }));
vi.mock('@expo-google-fonts/inter', () => ({ Inter_400Regular: 1, Inter_500Medium: 1, Inter_600SemiBold: 1, Inter_700Bold: 1 }));
vi.mock('@/features/auth', () => ({ SessionProvider: ({ children }: any) => children, useSession: () => ({ status: 'authenticated', identity: { id: 'fixture-client', accountType: 'CLIENT' }, memberships: [], selectedShopId: null }), SessionRecoveryScreen: () => null }));
vi.mock('@/shared/theme', () => ({ ThemeProvider: ({ children }: any) => children, useTheme: () => ({ isDark: true, colors: { surface: { input: '#111' }, text: { primary: '#fff' } } }) }));
vi.mock('@/shared/ui', () => ({ BootstrapScreen: () => null, ToastProvider: ({ children }: any) => children }));
vi.mock('@/features/bookings', () => ({ serverClock: { clear() {} } }));
vi.mock('@/features/discovery', () => ({ locationStore: { clear() {} } }));
vi.mock('@/shared/operations/OperationLifecycleBridge', () => ({ OperationLifecycleBridge: () => null }));
import RootLayout from '@/app/_layout';
afterEach(cleanup);
it('keeps the route outlet mounted when entering and leaving the public catalog', () => {
  fixture.segments = ['(client)']; fixture.mounts = 0; fixture.unmounts = 0;
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
