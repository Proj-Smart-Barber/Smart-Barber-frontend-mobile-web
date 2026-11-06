import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useSession } from '@/features/auth';
import {
  ClientExperienceProvider,
  useClientExperienceContext,
  buildBarbershopCatalogHref,
  useClientLocationOnboarding,
  LocationOnboardingModal,
} from '@/features/discovery';
import { useToast } from '@/shared/ui';
import { ClientNavigationShell } from '@/shared/navigation/ClientNavigationShell';
import { useNavigation } from '@/shared/navigation/navigation-context';

function ClientLocationOnboardingCoordinator({
  actorId,
  onBlockedChange,
}: {
  actorId: string | null;
  onBlockedChange: (blocked: boolean) => void;
}) {
  const pathname = usePathname();
  const { isCompact } = useAdaptiveLayout();
  const { isDrawerOpen } = useNavigation();
  const { bookingStart, publishLocationOnboarding } = useClientExperienceContext();

  const isExplore = pathname === '/(client)/explore' || pathname === '/explore';
  const enabled = isCompact && isExplore && !isDrawerOpen && !bookingStart;

  const {
    stage,
    requestPhase,
    canAskAgain,
    isPositionSlow,
    continueRequest,
    retryPosition,
    recoverPermission,
    dismissIntro,
  } = useClientLocationOnboarding({
    actorId,
    enabled,
  });

  useEffect(() => {
    publishLocationOnboarding({
      stage,
      canAskAgain,
      recoverPermission,
      retryPosition,
    });
    return () => {
      publishLocationOnboarding(null);
    };
  }, [stage, canAskAgain, recoverPermission, retryPosition, publishLocationOnboarding]);

  const isModalOpen = stage === 'intro' || stage === 'requesting';

  useEffect(() => {
    onBlockedChange(isModalOpen);
    return () => {
      onBlockedChange(false);
    };
  }, [isModalOpen, onBlockedChange]);

  if (!isExplore && isModalOpen) {
    return null;
  }

  return (
    <LocationOnboardingModal
      visible={isModalOpen}
      stage={stage}
      requestPhase={requestPhase}
      isPositionSlow={isPositionSlow}
      onContinue={continueRequest}
      onClose={dismissIntro}
    />
  );
}

export function ClientLayoutContent() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { identity } = useSession();
  const { bookingStart, requestBooking, closeBooking } = useClientExperienceContext();
  const toast = useToast();
  const isNavigatingRef = useRef(false);
  const [isOnboardingBlocked, setIsOnboardingBlocked] = useState(false);

  useEffect(() => {
    if (!bookingStart || isNavigatingRef.current) return;

    isNavigatingRef.current = true;

    try {
      if (bookingStart.kind === 'contextual' && bookingStart.context?.shopId) {
        const { shopId, service } = bookingStart.context;
        const baseHref = buildBarbershopCatalogHref(shopId);
        const targetHref = service?.id
          ? `${baseHref}?serviceId=${encodeURIComponent(service.id)}`
          : baseHref;

        router.push(targetHref as any);
      } else {
        // Sem contexto (kind === 'general' ou sem mídia ativa no feed)
        const isExplore = pathname === '/(client)/explore' || pathname === '/explore';
        if (!isExplore) {
          router.push('/(client)/explore' as any);
        }

        toast.showToast({
          type: 'info',
          title: 'Iniciar agendamento',
          message: 'Escolha uma barbearia e use Serviço ou Catálogo para iniciar a reserva.',
        });
      }
    } finally {
      // Consumir e encerrar o pedido depois do encaminhamento para permitir nova interação legítima
      closeBooking();
      isNavigatingRef.current = false;
    }
  }, [bookingStart, pathname, router, toast, closeBooking]);

  return (
    <ClientNavigationShell
      onRequestBooking={requestBooking}
      interactionBlocked={Boolean(bookingStart) || isOnboardingBlocked}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background.primary,
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
      </Stack>

      <ClientLocationOnboardingCoordinator
        actorId={identity?.id ?? null}
        onBlockedChange={setIsOnboardingBlocked}
      />
    </ClientNavigationShell>
  );
}

export default function ClientLayoutGroup() {
  const { identity } = useSession();

  return (
    <ClientExperienceProvider actorId={identity?.id ?? null}>
      <ClientLayoutContent />
    </ClientExperienceProvider>
  );
}
