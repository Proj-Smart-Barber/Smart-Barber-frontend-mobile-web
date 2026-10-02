import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { ErrorState } from '@/shared/ui';
import { useDashboardViewModel } from '../model/use-dashboard-view-model';
import { DashboardHeader } from './DashboardHeader';
import { MetricsOverview } from './MetricsOverview';
import { NextAppointmentCard } from './NextAppointmentCard';
import { TodayTimeline } from './TodayTimeline';

export function DashboardView() {
  const { colors, spacing } = useTheme();
  const { contentMaxWidth, isCompact } = useAdaptiveLayout();

  const {
    staff,
    isOwner,
    greeting,
    metricCards,
    previewAppointments,
    nextAppointment,
    isLoading,
    isError,
    isUpdatingStatus,
    handleUpdateStatus,
    handleRefetch,
  } = useDashboardViewModel();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    >
      {/* Topo Compacto com Identidade & Menu Hamburger para Mobile */}
      <DashboardHeader
        staff={staff}
        greeting={greeting}
        isOwner={isOwner}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefetch}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: isCompact ? spacing[4] : spacing[6],
          paddingTop: spacing[4],
          paddingBottom: isCompact ? 120 : spacing[6],
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[5] }}>
          {isError ? (
            <ErrorState
              title="Erro ao carregar o dashboard"
              description="Não foi possível sincronizar os dados da sua barbearia. Verifique sua conexão e tente novamente."
              onRetry={handleRefetch}
              style={{ marginVertical: spacing[8] }}
            />
          ) : (
            <>
              {/* 1. Atenção Imediata: Próximo Atendimento na Cadeira (Hero Card) */}
              <NextAppointmentCard
                appointment={nextAppointment}
                isLoading={isLoading}
                isUpdating={isUpdatingStatus}
                onUpdateStatus={handleUpdateStatus}
              />

              {/* 2. Resumo Compacto do Dia (Até 2 KPIs do Dia) */}
              <MetricsOverview metrics={metricCards} isLoading={isLoading} />

              {/* 3. Prévia dos Próximos Atendimentos (Até 3 linhas + Link para Agenda) */}
              <TodayTimeline
                appointments={previewAppointments}
                isLoading={isLoading}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
