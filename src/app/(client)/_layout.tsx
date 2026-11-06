import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { useSession } from '@/features/auth';
import {
  ClientExperienceProvider,
  useClientExperienceContext,
  buildBarbershopCatalogHref,
} from '@/features/discovery';
import { useToast } from '@/shared/ui';
import { ClientNavigationShell } from '@/shared/navigation/ClientNavigationShell';

export function ClientLayoutContent() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { bookingStart, requestBooking, closeBooking } = useClientExperienceContext();
  const toast = useToast();
  const isNavigatingRef = useRef(false);

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
      interactionBlocked={Boolean(bookingStart)}
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
