import React, { useState, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { Text, Button, EmptyState, ErrorState } from '@/shared/ui';
import { CustomerLookup } from '@/features/bookings/ui/CustomerLookup';
import { BookingFlowView } from '@/features/bookings/ui/BookingFlowView';
import type { BookingCustomer } from '@/features/bookings/model/booking-flow.types';

export default function NewOperationalBookingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();
  const { identity, memberships, selectedShopId, barbershop } = useSession();

  // Verifica vínculo ativo na unidade
  const activeMembership = useMemo(() => {
    if (!selectedShopId || !memberships) return null;
    return memberships.find(
      (m) => m.id === selectedShopId && m.status === 'ACTIVE'
    );
  }, [memberships, selectedShopId]);

  const [customer, setCustomer] = useState<BookingCustomer | null>(null);

  if (!selectedShopId || !activeMembership) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4],
        }}
      >
        <ErrorState
          title="Acesso Não Permitido"
          description="Você precisa possuir um vínculo ativo (BARBER ou OWNER) nesta unidade para agendar clientes operacionalmente."
          onRetry={() => router.back()}
        />
      </View>
    );
  }

  // Se o cliente ainda não foi identificado, exibe a etapa de busca de cliente
  if (!customer) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        }}
      >
        {/* Cabeçalho */}
        <LiquidGlassView
          variant="card"
          elevated={false}
          borderRadius={0}
          borderColor={colors.border.default}
          borderWidth={1}
          contentStyle={{
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
          }}
        >
          <View
            style={{
              maxWidth: 640,
              width: '100%',
              alignSelf: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ gap: 2 }}>
              <Text variant="body" weight="bold" color={colors.text.primary}>
                Novo Agendamento na Unidade
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {barbershop?.name || 'Unidade Atual'}
              </Text>
            </View>

            <Button
              title="Cancelar"
              variant="ghost"
              onPress={() => router.back()}
              style={{ minHeight: 36, paddingHorizontal: spacing[2] }}
            />
          </View>
        </LiquidGlassView>

        <ScrollView
          contentContainerStyle={{
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
            padding: spacing[4],
            gap: spacing[4],
          }}
        >
          <LiquidGlassView
            variant="card"
            elevated
            borderRadius={radius.lg}
            borderColor={colors.border.default}
            borderWidth={1}
            contentStyle={{ padding: spacing[4] }}
          >
            <CustomerLookup
              shopId={selectedShopId}
              selectedCustomer={customer}
              onSelectCustomer={(c) => setCustomer(c)}
              onClearCustomer={() => setCustomer(null)}
            />
          </LiquidGlassView>
        </ScrollView>
      </View>
    );
  }

  // Quando o cliente está definido, entra no fluxo de agendamento compartilhado com mode: 'UNIT'
  return (
    <BookingFlowView
      options={{
        mode: 'UNIT',
        shopId: selectedShopId,
        initialCustomer: customer,
        initialProfessionalId:
          identity?.accountType === 'BARBER' ? identity.id : undefined,
      }}
      onExit={() => setCustomer(null)}
    />
  );
}
