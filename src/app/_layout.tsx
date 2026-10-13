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

import { resolveEntryDestination } from '@/features/auth/model/operational-context';
import { OperationLifecycleBridge } from '@/shared/operations/OperationLifecycleBridge';
import {
  getBookingReturnIntent,
  clearBookingReturnIntent,
} from '@/features/auth/model/booking-return-intent';

function AuthRouteGuard({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status, barbershop, identity, memberships, selectedShopId, token, restoreSession, signOut, error } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const { isDark } = useTheme();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!fontsLoaded || status === 'bootstrapping' || status === 'error') return;
    const inAuth = segments[0] === '(auth)';
    const inApp = segments[0] === '(app)';
    const inAccount = (segments[0] as string) === '(account)';
    const inPublic = (segments[0] as string) === '(public)';
    const inClient = (segments[0] as string) === '(client)';
    const inBarber = (segments[0] as string) === '(barber)';
    const inPlatform = (segments[0] as string) === '(platform)';
    const currentAppRoute = segments[1] as string | undefined;

    if (inPublic) {
      return;
    }

    if (status === 'authenticated') {
      if (inAuth || !segments[0]) {
        const returnIntent = getBookingReturnIntent();
        if (returnIntent) {
          clearBookingReturnIntent();
          router.replace(returnIntent.returnPath as any);
          return;
        }

        const dest = resolveEntryDestination(
          {
            status: 'authenticated',
            identity,
            memberships,
            selectedShopId,
            revocationPending: false,
            accessToken: token,
          },
          identity?.onboardingIntent,
        );
        router.replace(dest as any);
      } else if (inApp) {
        if (!barbershop && currentAppRoute !== 'barbershop-setup') {
          if (identity?.accountType === 'OWNER' || identity?.onboardingIntent === 'SETUP_BARBERSHOP') {
            router.replace('/(app)/barbershop-setup' as any);
          } else if (identity?.accountType === 'BARBER') {
            router.replace('/(account)/invitations' as any);
          } else {
            router.replace('/(client)' as any);
          }
        }
      }
    }

    if (status === 'unauthenticated' && (inApp || inAccount || inClient || inBarber || inPlatform || !segments[0])) {
      router.replace('/(auth)/login');
    }
  }, [fontsLoaded, status, barbershop, identity, memberships, selectedShopId, token, segments, router]);

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
      <OperationLifecycleBridge
        actorId={identity?.id ?? null}
        sessionState={status}
      />
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
