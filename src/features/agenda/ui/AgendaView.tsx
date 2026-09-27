import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { ErrorState } from '@/shared/ui';
import { useAgendaViewModel } from '../model/use-agenda-view-model';
import { AgendaDatePicker } from './AgendaDatePicker';
import { AgendaHeader } from './AgendaHeader';
import { AgendaSummary } from './AgendaSummary';
import { AgendaSyncBanner } from './AgendaSyncBanner';
import { AgendaTimeline } from './AgendaTimeline';

/**
 * Agenda operacional: linha do tempo cronológica do dia selecionado
 * com agendamentos, buffers, holds e horários livres consolidados.
 */
export function AgendaView() {
  const { colors, spacing } = useTheme();
  const { contentMaxWidth, isCompact, isExpanded } = useAdaptiveLayout();

  const {
    dateLabel,
    dateLabelShort,
    isToday,
    selectedDate,
    todayIso,
    minSelectableDateIso,
    maxSelectableDateIso,
    canGoToPreviousDay,
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
    entries,
    summary,
    isClosed,
    isInitialLoading,
    isUpdatingDate,
    isRefreshing,
    isFatalError,
    isErrorWithCachedData,
    errorTitle,
    errorDescription,
    lastUpdatedAtLabel,
    isDataStale,
    isSlowSync,
    handleRefresh,
  } = useAgendaViewModel();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)');
    }
  };

  const handleSelectDate = (iso: string) => {
    goToDate(iso);
    setIsDatePickerOpen(false);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background.primary }}
    >
      <AgendaHeader
        dateLabel={dateLabel}
        dateLabelShort={dateLabelShort}
        isToday={isToday}
        canGoToPreviousDay={canGoToPreviousDay}
        canGoToNextDay={canGoToNextDay}
        isUpdatingDate={isUpdatingDate}
        lastUpdatedAtLabel={lastUpdatedAtLabel}
        onGoToPreviousDay={goToPreviousDay}
        onGoToNextDay={goToNextDay}
        onGoToToday={goToToday}
        onOpenDatePicker={() => setIsDatePickerOpen(true)}
        onBack={handleBack}
      />

      <AgendaDatePicker
        visible={isDatePickerOpen}
        selectedDate={selectedDate}
        todayIso={todayIso}
        minDateIso={minSelectableDateIso}
        maxDateIso={maxSelectableDateIso}
        onSelectDate={handleSelectDate}
        onClose={() => setIsDatePickerOpen(false)}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
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
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[5] }}>
          {isFatalError ? (
            <ErrorState
              title={errorTitle}
              description={errorDescription}
              onRetry={handleRefresh}
              style={{ marginVertical: spacing[8] }}
            />
          ) : (
            <>
              <AgendaSyncBanner
                isErrorWithCachedData={isErrorWithCachedData}
                errorTitle={errorTitle}
                errorDescription={errorDescription}
                isSlowSync={isSlowSync}
                isDataStale={isDataStale}
                onRetry={handleRefresh}
              />

              {isExpanded && summary ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[6] }}>
                  <View style={{ width: 340, flexShrink: 0 }}>
                    <AgendaSummary summary={summary} isLoading={isInitialLoading} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AgendaTimeline
                      entries={entries}
                      isClosed={isClosed}
                      isLoading={isInitialLoading}
                      isUpdatingDate={isUpdatingDate}
                      onGoToToday={goToToday}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <AgendaSummary summary={summary} isLoading={isInitialLoading} />
                  <AgendaTimeline
                    entries={entries}
                    isClosed={isClosed}
                    isLoading={isInitialLoading}
                    isUpdatingDate={isUpdatingDate}
                    onGoToToday={goToToday}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
