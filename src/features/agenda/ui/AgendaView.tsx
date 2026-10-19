import React, { useState } from 'react';
import { Modal, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNavigation } from '@/shared/navigation/navigation-context';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { FloatingBookingAction } from '@/shared/navigation';
import { ErrorState } from '@/shared/ui';
import { BookingDetailView, BookingActionConfirm } from '@/features/bookings';
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
  const { colors, spacing, isDark } = useTheme();
  const { contentMaxWidth, isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const { onContentScroll } = useNavigation();

  const {
    // Contexto e Papéis
    isOwner,
    isBarberman,
    isUnitActive,
    barbershopName,
    professionals,
    selectedProfessionalId,
    onSelectProfessional,

    // Data e Navegação
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

    // Dados e Resumo
    entries,
    summary,
    isClosed,
    hasNext,
    loadMore,
    loadMoreError,
    isLoadingMore,

    // Estados
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

    // Detalhe e Ações
    selectedBookingId,
    openDetail,
    closeDetail,
    actionConfirm,
    handleOpenActionConfirm,
    closeActionConfirm,
    handleActionSuccess,
    handleCancelBooking,
    cancellingId,
  } = useAgendaViewModel();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const router = useRouter();

  const handleSelectDate = (iso: string) => {
    goToDate(iso);
    setIsDatePickerOpen(false);
  };

  const roleLabel = isOwner ? 'Proprietário' : isBarberman ? 'Barbeiro' : 'Equipe';

  const handleNewBooking = () => {
    if (!isUnitActive) return;
    router.push({
      pathname: '/(app)/new-booking' as any,
      params: {
        date: selectedDate,
        ...(selectedProfessionalId ? { barbermanId: selectedProfessionalId } : {}),
      },
    });
  };

  const webBackgroundStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage:
            isDark
              ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(20, 20, 20, 0.98) 70%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        } as any)
      : null;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[{ flex: 1, backgroundColor: colors.background.primary }, webBackgroundStyle]}
    >
      <AgendaHeader
        dateLabel={dateLabel}
        dateLabelShort={dateLabelShort}
        isToday={isToday}
        canGoToPreviousDay={canGoToPreviousDay}
        canGoToNextDay={canGoToNextDay}
        isUpdatingDate={isUpdatingDate}
        lastUpdatedAtLabel={lastUpdatedAtLabel}
        unitName={barbershopName}
        roleLabel={roleLabel}
        onGoToPreviousDay={goToPreviousDay}
        onGoToNextDay={goToNextDay}
        onGoToToday={goToToday}
        onOpenDatePicker={() => setIsDatePickerOpen(true)}
        isOwner={isOwner}
        professionals={professionals}
        selectedProfessionalId={selectedProfessionalId}
        onSelectProfessional={onSelectProfessional}
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

      <FloatingBookingAction
        bottom={Math.max(insets.bottom, 12) + (isCompact ? 86 : 24)}
        enabled={isUnitActive}
        onPress={handleNewBooking}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onScroll={onContentScroll}
        scrollEventThrottle={16}
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
          paddingTop: spacing[5],
          paddingBottom: isCompact
            ? Math.max(176, Math.max(insets.bottom, 12) + 166)
            : spacing[6],
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

              {isExpanded &&
              (isInitialLoading ||
                Boolean(
                  summary &&
                    ((summary.occupancyPercent !== null && summary.occupancyLabel !== null) ||
                      summary.next !== null),
                )) ? (
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
                      onSelect={openDetail}
                      onCancel={handleCancelBooking}
                      onReschedule={(booking) => {
                        router.push({
                          pathname: `/(account)/bookings/${booking.id}/reschedule` as any,
                          params: { scope: 'UNIT' },
                        });
                      }}
                      onComplete={(booking) => handleOpenActionConfirm('COMPLETE', booking)}
                      onNoShow={(booking) => handleOpenActionConfirm('NO_SHOW', booking)}
                      cancellingId={cancellingId}
                      hasNext={hasNext}
                      loadMore={loadMore}
                      loadMoreError={loadMoreError}
                      isLoadingMore={isLoadingMore}
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
                    onSelect={openDetail}
                    onCancel={handleCancelBooking}
                    onReschedule={(booking) => {
                      router.push({
                        pathname: `/(account)/bookings/${booking.id}/reschedule` as any,
                        params: { scope: 'UNIT' },
                      });
                    }}
                    onComplete={(booking) => handleOpenActionConfirm('COMPLETE', booking)}
                    onNoShow={(booking) => handleOpenActionConfirm('NO_SHOW', booking)}
                    cancellingId={cancellingId}
                    hasNext={hasNext}
                    loadMore={loadMore}
                    loadMoreError={loadMoreError}
                    isLoadingMore={isLoadingMore}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal de Detalhes UNIT da Reserva */}
      <Modal
        visible={Boolean(selectedBookingId)}
        animationType="slide"
        onRequestClose={closeDetail}
      >
        {selectedBookingId ? (
          <SafeAreaView
            edges={['top', 'bottom', 'left', 'right']}
            style={{ flex: 1, backgroundColor: colors.background.primary }}
          >
            <BookingDetailView
              bookingId={selectedBookingId}
              scope="UNIT"
              onBack={closeDetail}
            />
          </SafeAreaView>
        ) : null}
      </Modal>

      {/* Modal de Confirmação de Ações UNIT */}
      {actionConfirm && actionConfirm.isOpen ? (
        <BookingActionConfirm
          booking={actionConfirm.booking}
          actionType={actionConfirm.actionType}
          isOpen={actionConfirm.isOpen}
          scope="UNIT"
          onClose={closeActionConfirm}
          onSuccess={handleActionSuccess}
        />
      ) : null}
    </SafeAreaView>
  );
}
