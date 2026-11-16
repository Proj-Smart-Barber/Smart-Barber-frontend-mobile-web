import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/theme';
import { Text } from '../../../../shared/ui';
import { LiquidGlassView } from '../../../../shared/navigation';
export function ReviewServiceCoverageCard({ totalActiveServices, evaluatedActiveServices, coveragePercentage, }) {
    const { colors, spacing, radius } = useTheme();
    return (<LiquidGlassView variant="card" elevated style={{ borderRadius: radius.lg }} contentStyle={{ padding: spacing[4], gap: spacing[2] }}>
      <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
        <Text variant="caption" weight="bold" color={colors.text.muted}>
          COBERTURA DOS SERVIÇOS
        </Text>
        <Ionicons name="cut-outline" size={18} color={colors.brand.primary}/>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
        <Text variant="display" weight="extraBold" color={colors.text.primary}>
          {coveragePercentage !== null ? `${coveragePercentage}%` : '--'}
        </Text>
        <Text variant="caption" color={colors.text.secondary}>
          ({evaluatedActiveServices} de {totalActiveServices} ativos com avaliações)
        </Text>
      </View>

      <Text variant="caption" color={colors.text.muted}>
        Serviços ativos que já receberam ao menos uma nota de cliente.
      </Text>
    </LiquidGlassView>);
}
