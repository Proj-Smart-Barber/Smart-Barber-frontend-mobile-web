import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { Badge, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import {
  useOwnerReviewSummary,
  type ReviewSourceDto,
} from '@/features/reviews';
import { ReviewMetricsSummaryCard } from '@/features/reviews/ui/owner/ReviewMetricsSummaryCard';
import { ReviewStarDistributionCard } from '@/features/reviews/ui/owner/ReviewStarDistributionCard';
import { ReviewResponseRateCard } from '@/features/reviews/ui/owner/ReviewResponseRateCard';
import { ReviewServiceCoverageCard } from '@/features/reviews/ui/owner/ReviewServiceCoverageCard';
import { OwnerServicesTab } from '@/features/reviews/ui/owner/OwnerServicesTab';
import { OwnerProfessionalsTab } from '@/features/reviews/ui/owner/OwnerProfessionalsTab';
import { OwnerFeedbacksTab } from '@/features/reviews/ui/owner/OwnerFeedbacksTab';

type OwnerReviewsTab = 'services' | 'professionals' | 'feedbacks';

export default function OwnerReviewsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { barbershop, isOwner, memberships, selectedShopId } = useSession();

  const isOwnerActive = useMemo(() => {
    return (
      isOwner ||
      memberships.some(
        (m) =>
          m.id === selectedShopId &&
          m.state === 'ACTIVE' &&
          m.role === 'OWNER',
      )
    );
  }, [isOwner, memberships, selectedShopId]);

  const [periodDays, setPeriodDays] = useState<number>(30);
  const [selectedSource, setSelectedSource] = useState<ReviewSourceDto>('CUSTOMER');
  const [activeTab, setActiveTab] = useState<OwnerReviewsTab>('services');
  const [filterTargetId, setFilterTargetId] = useState<string | undefined>(undefined);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [periodDays]);

  const shopId = barbershop?.id;

  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch,
    isRefetching,
  } = useOwnerReviewSummary(
    shopId,
    {
      source: selectedSource,
      startDate,
      endDate,
    },
    { enabled: Boolean(shopId) && isOwnerActive },
  );

  // Se a barbearia estiver em ambiente exclusivamente demonstrativo e source for CUSTOMER sem dados,
  // ajusta o toggle para que o usuário perceba claramente os dados disponíveis
  React.useEffect(() => {
    if (
      summary &&
      summary.flags.isDemoEnvironment &&
      selectedSource === 'CUSTOMER'
    ) {
      setSelectedSource('DEMO');
    }
  }, [summary, selectedSource]);

  if (!isOwnerActive) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4],
          backgroundColor: colors.background.primary,
        }}
      >
        <LiquidGlassView
          variant="card"
          elevated
          style={{ maxWidth: 400, borderRadius: radius.lg }}
          contentStyle={{ padding: spacing[5], alignItems: 'center', gap: spacing[3] }}
        >
          <Ionicons name="lock-closed-outline" size={40} color={colors.feedback.warning} />
          <Text variant="h2" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
            Acesso Restrito
          </Text>
          <Text variant="bodySm" color={colors.text.secondary} style={{ textAlign: 'center' }}>
            Apenas o proprietário ativo da unidade tem permissão para acessar os indicadores gerenciais e feedbacks dos clientes.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar ao início"
            onPress={() => router.replace('/(app)')}
            style={{
              marginTop: spacing[2],
              paddingVertical: spacing[2],
              paddingHorizontal: spacing[4],
              borderRadius: radius.md,
              backgroundColor: colors.brand.primary,
            }}
          >
            <Text variant="bodySm" weight="bold" color={colors.text.inverse}>
              Voltar ao Início
            </Text>
          </Pressable>
        </LiquidGlassView>
      </View>
    );
  }

  const handleSelectServiceFilter = (serviceId: string) => {
    setFilterTargetId(serviceId);
    setActiveTab('feedbacks');
  };

  const handleSelectProfessionalFilter = (professionalId: string) => {
    setFilterTargetId(professionalId);
    setActiveTab('feedbacks');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[5],
        gap: spacing[4],
        maxWidth: 960,
        width: '100%',
        alignSelf: 'center',
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={colors.brand.primary}
        />
      }
    >
      {/* Header da Tela */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[2],
        }}
      >
        <View style={{ gap: 2 }}>
          <Text variant="h1" weight="extraBold" color={colors.text.primary}>
            Avaliações & Métricas
          </Text>
          <Text variant="bodySm" color={colors.text.secondary}>
            {barbershop?.name || 'Unidade'} • Fuso horário: {summary?.period.timezone || 'America/Sao_Paulo'}
          </Text>
        </View>

        <Badge
          label={isOwnerActive ? 'Gestão do Proprietário' : 'Visualização'}
          tone="brand"
          size="md"
        />
      </View>

      {/* Cartão de Resumo e Filtro de Período */}
      {isSummaryLoading || !summary ? (
        <View style={{ gap: spacing[3] }}>
          <Skeleton width="100%" height={160} />
          <Skeleton width="100%" height={120} />
        </View>
      ) : (
        <>
          <ReviewMetricsSummaryCard
            summary={summary}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            periodDays={periodDays}
            onSelectPeriodDays={setPeriodDays}
          />

          {/* Distribuição de Notas e Grid de Indicadores */}
          <ReviewStarDistributionCard
            distribution={summary.metrics.distribution}
            totalReviews={summary.metrics.reviewCount}
            percentage1to2Stars={summary.metrics.percentage1to2Stars}
          />

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing[3],
            }}
          >
            <View style={{ flex: 1, minWidth: 260 }}>
              <ReviewResponseRateCard
                cohortCompletedBookings={summary.responseRate.cohortCompletedBookings}
                reviewedBookings={summary.responseRate.reviewedBookings}
                ratePercentage={summary.responseRate.ratePercentage}
                cohortDefinition={summary.responseRate.cohortDefinition}
              />
            </View>

            <View style={{ flex: 1, minWidth: 260 }}>
              <ReviewServiceCoverageCard
                totalActiveServices={summary.serviceCoverage.totalActiveServices}
                evaluatedActiveServices={summary.serviceCoverage.evaluatedActiveServices}
                coveragePercentage={summary.serviceCoverage.coveragePercentage}
              />
            </View>
          </View>
        </>
      )}

      {/* Abas de Detalhamento: Serviços, Profissionais e Feedbacks */}
      <View style={{ marginTop: spacing[3], gap: spacing[4] }}>
        <View style={styles.tabsHeader}>
          {(
            [
              { id: 'services', label: 'Serviços' },
              { id: 'professionals', label: 'Profissionais' },
              { id: 'feedbacks', label: 'Feedbacks Detalhados' },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.id }}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabButton,
                activeTab === tab.id && {
                  borderBottomColor: colors.brand.primary,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                variant="bodySm"
                weight={activeTab === tab.id ? 'bold' : 'regular'}
                color={
                  activeTab === tab.id
                    ? colors.brand.primary
                    : colors.text.secondary
                }
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {shopId ? (
          activeTab === 'services' ? (
            <OwnerServicesTab
              shopId={shopId}
              source={selectedSource}
              startDate={startDate}
              endDate={endDate}
              onSelectServiceToFilter={handleSelectServiceFilter}
            />
          ) : activeTab === 'professionals' ? (
            <OwnerProfessionalsTab
              shopId={shopId}
              source={selectedSource}
              startDate={startDate}
              endDate={endDate}
              onSelectProfessionalToFilter={handleSelectProfessionalFilter}
            />
          ) : (
            <OwnerFeedbacksTab
              shopId={shopId}
              source={selectedSource}
              startDate={startDate}
              endDate={endDate}
              initialTargetId={filterTargetId}
              onClearTargetFilter={() => setFilterTargetId(undefined)}
            />
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    gap: 16,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
