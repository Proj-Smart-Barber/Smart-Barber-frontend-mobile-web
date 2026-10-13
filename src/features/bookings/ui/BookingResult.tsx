import React from 'react';
import { View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Text, Button, Badge } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { BookingDto } from '../api/bookings.dto';
import { formatPrice } from '@/features/services/model/service.types';

export interface BookingResultProps {
  booking: BookingDto;
  barbershopName?: string;
  mode?: 'PERSONAL' | 'UNIT';
  onReset?: () => void;
}

export function BookingResult({
  booking,
  barbershopName = 'Barbearia',
  mode = 'PERSONAL',
  onReset,
}: BookingResultProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const handleGoToDestination = () => {
    if (mode === 'UNIT') {
      const dateParam = booking.date
        ? (typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.date.toISOString().split('T')[0])
        : undefined;
      router.replace({
        pathname: '/(app)/agenda' as any,
        params: {
          shopId: booking.barbershopId,
          ...(dateParam ? { date: dateParam } : {}),
          ...(booking.barbermanId ? { barbermanId: booking.barbermanId } : {}),
          ...(booking.id ? { bookingId: booking.id } : {}),
        },
      });
    } else {
      router.replace('/(client)/bookings' as any);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[6] }}>
      <LiquidGlassView
        variant="card"
        elevated
        borderRadius={radius.xl}
        borderColor={colors.border.default}
        borderWidth={1}
        contentStyle={{
          alignItems: 'center',
          padding: spacing[5],
          gap: spacing[3],
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.full,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark" size={36} color="#FFFFFF" />
        </View>

        <Text variant="h1" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
          Agendamento Confirmado!
        </Text>

        <Badge label="Horário Garantido" tone="brand" />

        <View
          style={{
            width: '100%',
            backgroundColor: colors.surface.default,
            borderRadius: radius.md,
            padding: spacing[4],
            gap: spacing[2],
            marginTop: spacing[2],
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color={colors.text.muted}>
              Código da Reserva:
            </Text>
            <Text variant="caption" weight="medium" color={colors.text.primary}>
              {booking.id.slice(0, 8)}...
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color={colors.text.muted}>
              Barbearia:
            </Text>
            <Text variant="bodySm" weight="medium" color={colors.text.primary}>
              {barbershopName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color={colors.text.muted}>
              Data e Horário:
            </Text>
            <Text variant="bodySm" weight="bold" color={colors.brand.primary}>
              {typeof booking.date === 'string' ? booking.date.split('T')[0] : ''} às {booking.startTime}
            </Text>
          </View>

          {booking.services && booking.services.length > 0 && (
            <View style={{ marginTop: spacing[2], gap: 2 }}>
              <Text variant="caption" color={colors.text.muted}>
                Serviços:
              </Text>
              {booking.services.map((s) => (
                <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color={colors.text.primary}>
                    • {s.title}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {s.priceInCents != null ? formatPrice(s.priceInCents) : 'A confirmar'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ width: '100%', gap: spacing[2], marginTop: spacing[3] }}>
          <Button
            title={mode === 'UNIT' ? 'Ver na Agenda' : 'Ver Meus Agendamentos'}
            variant="primary"
            rightIcon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
            onPress={handleGoToDestination}
            style={{ minHeight: 48, width: '100%' }}
          />

          {onReset && (
            <Button
              title="Fazer Outro Agendamento"
              variant="outline"
              onPress={onReset}
              style={{ minHeight: 48, width: '100%' }}
            />
          )}
        </View>
      </LiquidGlassView>
    </ScrollView>
  );
}
