import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../../shared/theme';
import { Text } from '../../../../shared/ui';
import { LiquidGlassView } from '../../../../shared/navigation';
export function ReviewStarDistributionCard({ distribution, totalReviews, percentage1to2Stars, }) {
    const { colors, spacing, radius, isDark } = useTheme();
    const stars = [5, 4, 3, 2, 1];
    return (<LiquidGlassView variant="card" elevated style={{ borderRadius: radius.lg }} contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
      <View style={{ gap: 2 }}>
        <Text variant="caption" weight="bold" color={colors.text.muted}>
          DISTRIBUIÇÃO DE NOTAS
        </Text>
        <Text variant="caption" color={colors.text.secondary}>
          Frequência de 1 a 5 estrelas atribuídas à barbearia
        </Text>
      </View>

      <View style={{ gap: spacing[2] }}>
        {stars.map((star) => {
            var _a;
            const count = (_a = distribution[star]) !== null && _a !== void 0 ? _a : 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (<View key={star} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[2],
                }}>
              <Text variant="caption" weight="bold" color={colors.text.secondary} style={{ width: 45 }}>
                {star} {star === 1 ? 'estrela' : 'estrelas'}
              </Text>

              {/* Barra de Progresso */}
              <View style={[
                    styles.progressBarBackground,
                    {
                        backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.06)',
                        borderRadius: radius.full,
                    },
                ]}>
                <View style={[
                    styles.progressBarFill,
                    {
                        width: `${percentage}%`,
                        backgroundColor: star >= 4
                            ? colors.feedback.success
                            : star === 3
                                ? colors.feedback.warning
                                : colors.feedback.error,
                        borderRadius: radius.full,
                    },
                ]}/>
              </View>

              <Text variant="caption" color={colors.text.muted} style={{ width: 40, textAlign: 'right' }}>
                {count} ({percentage}%)
              </Text>
            </View>);
        })}
      </View>

      {/* Destaque para notas críticas (1 e 2 estrelas) */}
      <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: spacing[2],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border.subtle,
        }}>
        <Text variant="caption" color={colors.text.secondary}>
          Notas críticas (1 e 2 estrelas):
        </Text>
        <Text variant="caption" weight="bold" color={percentage1to2Stars > 10
            ? colors.feedback.error
            : colors.text.primary}>
          {percentage1to2Stars}% do total
        </Text>
      </View>
    </LiquidGlassView>);
}
const styles = StyleSheet.create({
    progressBarBackground: {
        flex: 1,
        height: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
    },
});
