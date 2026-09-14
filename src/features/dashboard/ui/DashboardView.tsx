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
import { QuickActionsBar } from './QuickActionsBar';

export function DashboardView() {
  const { colors, spacing } = useTheme();
  const { contentMaxWidth, isCompact } = useAdaptiveLayout();

  const {
    staff,
    isOwner,
    greeting,
    metricCards,
    appointments,
    totalCount,
    nextAppointment,
    filter,
    setFilter,
    isLoading,
    isError,
    isUpdatingStatus,
    handleUpdateStatus,
    handleRefetch,
    signOut,
  } = useDashboardViewModel();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    >
      {/* Barra de Topo / Header Executivo */}
      <DashboardHeader
        staff={staff}
        greeting={greeting}
        isOwner={isOwner}
        onSignOut={() => void signOut()}
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
          paddingVertical: spacing[5],
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[6] }}>
          {isError ? (
            <ErrorState
              title="Erro ao carregar o dashboard"
              description="Não foi possível sincronizar os dados da sua barbearia. Verifique sua conexão e tente novamente."
              onRetry={handleRefetch}
              style={{ marginVertical: spacing[8] }}
            />
          ) : (
            <>
              {/* 1. Cards de Poder / KPIs do Dia */}
              <MetricsOverview metrics={metricCards} isLoading={isLoading} />

              {/* 2. Barra de Ações Rápidas */}
              <QuickActionsBar />

              {/* 3. Próximo Atendimento na Cadeira (Hero Card) */}
              <NextAppointmentCard
                appointment={nextAppointment}
                isLoading={isLoading}
                isUpdating={isUpdatingStatus}
                onUpdateStatus={handleUpdateStatus}
              />

              {/* 4. Agenda do Dia / Timeline de Slots */}
              <TodayTimeline
                appointments={appointments}
                totalCount={totalCount}
                currentFilter={filter}
                onFilterChange={setFilter}
                onUpdateStatus={handleUpdateStatus}
                isLoading={isLoading}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
