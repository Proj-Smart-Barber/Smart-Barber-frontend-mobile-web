import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Epilogue_700Bold, Epilogue_800ExtraBold } from '@expo-google-fonts/epilogue';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { SessionProvider, useSession } from '@/features/auth';
import { BootstrapScreen } from '@/shared/ui';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthRouteGuard({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useSession(); const segments = useSegments(); const router = useRouter(); const { isDark } = useTheme();
  useEffect(() => {
    if (!fontsLoaded || status === 'bootstrapping') return;
    const inAuth = segments[0] === '(auth)'; const inApp = segments[0] === '(app)';
    if (status === 'authenticated' && (inAuth || !segments[0])) router.replace('/(app)');
    if ((status === 'unauthenticated' || status === 'error') && (inApp || !segments[0])) router.replace('/(auth)/login');
  }, [fontsLoaded, status, segments, router]);
  if (!fontsLoaded || status === 'bootstrapping') return <BootstrapScreen message={fontsLoaded ? 'Verificando sua sessão…' : 'Carregando tipografia…'} />;
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><Slot /></>;
}

function AppReady() {
  const [fontsLoaded] = useFonts({ Epilogue_700Bold, Epilogue_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
  return <SessionProvider><AuthRouteGuard fontsLoaded={fontsLoaded} /></SessionProvider>;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }));
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><ThemeProvider><AppReady /></ThemeProvider></QueryClientProvider></SafeAreaProvider>;
}
