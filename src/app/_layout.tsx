import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Epilogue_700Bold, Epilogue_800ExtraBold } from '@expo-google-fonts/epilogue';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { SessionProvider, useSession, SessionRecoveryScreen } from '@/features/auth';
import { BootstrapScreen, ToastProvider } from '@/shared/ui';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthRouteGuard({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status, barbershop, restoreSession, signOut, error } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const { isDark } = useTheme();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!fontsLoaded || status === 'bootstrapping' || status === 'error') return;
    const inAuth = segments[0] === '(auth)';
    const inApp = segments[0] === '(app)';
    const inPublic = (segments[0] as string) === '(public)';
    const currentAppRoute = segments[1] as string | undefined;

    if (inPublic) {
      return;
    }

    if (status === 'authenticated') {
      if (inAuth || !segments[0]) {
        if (!barbershop) {
          router.replace('/(app)/barbershop-setup' as any);
        } else {
          router.replace('/(app)');
        }
      } else if (inApp) {
        if (!barbershop && currentAppRoute !== 'barbershop-setup') {
          router.replace('/(app)/barbershop-setup' as any);
        }
      }
    }

    if (status === 'unauthenticated' && (inApp || !segments[0])) {
      router.replace('/(auth)/login');
    }
  }, [fontsLoaded, status, barbershop, segments, router]);

  if (!fontsLoaded || status === 'bootstrapping') {
    return (
      <BootstrapScreen
        message={fontsLoaded ? 'Verificando sua sessão…' : 'Carregando tipografia e recursos…'}
      />
    );
  }

  if (status === 'error') {
    return (
      <SessionRecoveryScreen
        isRetrying={isRetrying}
        errorMessage={error?.message}
        onRetry={async () => {
          setIsRetrying(true);
          try {
            await restoreSession();
          } finally {
            setIsRetrying(false);
          }
        }}
        onSwitchAccount={async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}
      />
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

function AppReady() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Epilogue_700Bold,
    Epilogue_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <SessionProvider>
      <AuthRouteGuard fontsLoaded={fontsLoaded} />
    </SessionProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AppReady />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
