import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';

interface ReviewResponseRateCardProps {
  cohortCompletedBookings: number;
  reviewedBookings: number;
  ratePercentage: number | null;
  cohortDefinition: string;
}

export function ReviewResponseRateCard({
  cohortCompletedBookings,
  reviewedBookings,
  ratePercentage,
  cohortDefinition,
}: ReviewResponseRateCardProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <LiquidGlassView
      variant="card"
      elevated
      style={{ borderRadius: radius.lg }}
      contentStyle={{ padding: spacing[4], gap: spacing[2] }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="caption" weight="bold" color={colors.text.muted}>
          TAXA DE RESPOSTA
        </Text>
        <Ionicons name="chatbubbles-outline" size={18} color={colors.brand.primary} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
        <Text variant="display" weight="extraBold" color={colors.text.primary}>
          {ratePercentage !== null ? `${ratePercentage}%` : '--'}
        </Text>
        <Text variant="caption" color={colors.text.secondary}>
          ({reviewedBookings} de {cohortCompletedBookings} concluídos)
        </Text>
      </View>

      <Text variant="caption" color={colors.text.muted}>
        Base de cálculo: {cohortDefinition.toLowerCase()}.
      </Text>
    </LiquidGlassView>
  );
}
