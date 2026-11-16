import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/theme';
import { Badge, Text } from '../../../../shared/ui';
import { LiquidGlassView } from '../../../../shared/navigation';
import { StarRating } from '../StarRating';
export function ReviewMetricsSummaryCard({ summary, selectedSource, onSelectSource, periodDays, onSelectPeriodDays, }) {
    const { colors, spacing, radius, isDark } = useTheme();
    const { metrics, comparison, flags } = summary;
    const isDemoVisible = selectedSource === 'DEMO' || (flags.isDemoEnvironment && selectedSource === 'ALL');
    const formattedRating = metrics.averageRating !== null ? metrics.averageRating.toFixed(1) : '--';
    const diffPoints = comparison.ratingDiff;
    const hasDiff = diffPoints !== null && diffPoints !== undefined;
    const isDiffPositive = hasDiff && diffPoints > 0;
    const isDiffNegative = hasDiff && diffPoints < 0;
    return (<View style={{ gap: spacing[3] }}>
      {/* Aviso de Dados Demonstrativos quando aplicável */}
      {isDemoVisible ? (<LiquidGlassView variant="card" elevated style={{ borderRadius: radius.lg }} contentStyle={{
                padding: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                backgroundColor: isDark
                    ? 'rgba(234, 179, 8, 0.08)'
                    : 'rgba(234, 179, 8, 0.12)',
                borderColor: isDark
                    ? 'rgba(234, 179, 8, 0.25)'
                    : 'rgba(234, 179, 8, 0.35)',
            }}>
          <Ionicons name="information-circle-outline" size={22} color={colors.feedback.warning}/>
          <View style={{ flex: 1 }}>
            <Text variant="caption" weight="bold" color={colors.feedback.warning}>
              Conjunto demonstrativo da unidade
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              {flags.isDemoEnvironment
                ? 'Esta unidade possui apenas avaliações demonstrativas do catálogo inicial. Conforme clientes reais avaliarem atendimentos, as métricas de satisfação real serão atualizadas.'
                : 'Você está filtrando por avaliações demonstrativas pré-carregadas.'}
            </Text>
          </View>
        </LiquidGlassView>) : null}

      {/* Barra de Filtros: Origem e Período */}
      <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[2],
        }}>
        {/* Filtro de Origem */}
        <View style={styles.segmentContainer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Filtrar por clientes reais" onPress={() => onSelectSource('CUSTOMER')} style={[
            styles.segmentButton,
            selectedSource === 'CUSTOMER' && {
                backgroundColor: colors.brand.primary,
            },
        ]}>
            <Text variant="caption" weight="bold" color={selectedSource === 'CUSTOMER'
            ? colors.text.inverse
            : colors.text.secondary}>
              Clientes
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Filtrar por dados demonstrativos" onPress={() => onSelectSource('DEMO')} style={[
            styles.segmentButton,
            selectedSource === 'DEMO' && {
                backgroundColor: colors.brand.primary,
            },
        ]}>
            <Text variant="caption" weight="bold" color={selectedSource === 'DEMO'
            ? colors.text.inverse
            : colors.text.secondary}>
              Demonstração
            </Text>
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Filtrar por todas as origens" onPress={() => onSelectSource('ALL')} style={[
            styles.segmentButton,
            selectedSource === 'ALL' && {
                backgroundColor: colors.brand.primary,
            },
        ]}>
            <Text variant="caption" weight="bold" color={selectedSource === 'ALL'
            ? colors.text.inverse
            : colors.text.secondary}>
              Todas
            </Text>
          </Pressable>
        </View>

        {/* Filtro de Dias */}
        <View style={styles.segmentContainer}>
          {[30, 60, 90].map((days) => (<Pressable key={days} accessibilityRole="button" accessibilityLabel={`Período de ${days} dias`} onPress={() => onSelectPeriodDays(days)} style={[
                styles.segmentButton,
                periodDays === days && {
                    backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.12)',
                },
            ]}>
              <Text variant="caption" weight={periodDays === days ? 'bold' : 'regular'} color={periodDays === days
                ? colors.text.primary
                : colors.text.muted}>
                {days}d
              </Text>
            </Pressable>))}
        </View>
      </View>

      {/* Card Principal: Média Geral da Unidade */}
      <LiquidGlassView variant="card" elevated style={{ borderRadius: radius.lg }} contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" weight="bold" color={colors.text.muted}>
              MÉDIA GERAL DA BARBEARIA
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              Baseado exclusivamente na nota da barbearia (últimos {periodDays} dias)
            </Text>
          </View>
          {metrics.isSmallSample ? (<Badge label="Amostra reduzida (< 5)" tone="warning" size="sm"/>) : null}
        </View>

        <View style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: spacing[3],
        }}>
          <Text variant="display" weight="extraBold" color={colors.text.primary}>
            {formattedRating}
          </Text>
          {metrics.averageRating !== null ? (<StarRating rating={metrics.averageRating} size={22}/>) : null}
          <Text variant="bodySm" color={colors.text.muted}>
            ({metrics.reviewCount}{' '}
            {metrics.reviewCount === 1 ? 'avaliação' : 'avaliações'})
          </Text>
        </View>

        {/* Comparativo Temporal em Pontos de Estrela */}
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingTop: spacing[2],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border.subtle,
        }}>
          <Ionicons name={isDiffPositive
            ? 'trending-up'
            : isDiffNegative
                ? 'trending-down'
                : 'remove-outline'} size={18} color={isDiffPositive
            ? colors.feedback.success
            : isDiffNegative
                ? colors.feedback.error
                : colors.text.muted}/>
          <Text variant="caption" color={colors.text.secondary}>
            {hasDiff ? (<>
                <Text variant="caption" weight="bold" color={isDiffPositive
                ? colors.feedback.success
                : isDiffNegative
                    ? colors.feedback.error
                    : colors.text.primary}>
                  {isDiffPositive ? `+${diffPoints}` : diffPoints} pts
                </Text>{' '}
                em relação aos {periodDays} dias anteriores ({comparison.previousReviewCount} avaliações)
              </>) : ('Sem dados no período anterior para comparação de tendência')}
          </Text>
        </View>
      </LiquidGlassView>
    </View>);
}
const styles = StyleSheet.create({
    segmentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        borderRadius: 8,
        padding: 3,
        gap: 3,
    },
    segmentButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
});
