import React, { useState } from 'react';
import { Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AgendaDatePicker, AgendaSyncBanner, formatCurrency, formatDurationMinutes } from '@/features/agenda';
import { useSession } from '@/features/auth';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { EmptyState, ErrorState, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { BookingDetails } from '../api/bookings.contract';
import { useBookingsViewModel } from '../model/use-bookings-view-model';
import { BookingsHeader } from './BookingsHeader';
import { BookingCancelDialog } from './BookingCancelDialog';
import { BookingManageCard } from './BookingManageCard';
import { EditBookingSheet } from './EditBookingSheet';
import { BookingRecovery } from './BookingRecovery';

function BookingsSummary({
  count,
  durationMinutes,
  priceInCents,
  isLoading,
}: {
  count: number;
  durationMinutes: number;
  priceInCents: number | null;
  isLoading: boolean;
}) {
  const { colors, spacing } = useTheme();

  if (isLoading) {
    return <Skeleton height={56} style={{ width: '100%' }} />;
  }

  if (count === 0) return null;

  return (
    <LiquidGlassView
      variant="card"
      style={{ width: '100%' }}
      contentStyle={{
        padding: spacing[3],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[3],
      }}
    >
      <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <Text variant="subhead" color={colors.text.primary} weight="bold">
          {count} {count === 1 ? 'atendimento' : 'atendimentos'}
        </Text>
        <Text variant="caption" color={colors.text.muted} numberOfLines={1}>
          {formatDurationMinutes(durationMinutes)} de trabalho no dia
        </Text>
      </View>
      {priceInCents != null ? (
        <Text variant="subhead" color={colors.text.primary} weight="bold" style={{ flexShrink: 0 }}>
          {formatCurrency(priceInCents)}
        </Text>
      ) : <Text variant="caption">Valor incompleto</Text>}
    </LiquidGlassView>
  );
}

/**
 * Atendimentos do barbeiro: lista detalhada dos agendamentos confirmados
 * do dia selecionado, com ações de remarcar e cancelar.
 */
export function BookingsView() {
  const { colors, spacing, isDark } = useTheme();
  const { contentMaxWidth, isCompact } = useAdaptiveLayout();
  const { selectedShopId, memberships } = useSession();
  const router = useRouter();

  const viewModel = useBookingsViewModel();
  const {
    bookings,
    totals,
    isInitialLoading,
    isFatalError,
    isErrorWithCachedData,
    errorTitle,
    errorDescription,
    handleRefresh,
    updatingBookingId,
    updateError,
    cancellingId,
    cancelError,
    clearCancelError,
    handleUpdateBooking,
    handleCancelBooking,
  } = viewModel;

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<BookingDetails | null>(null);
  const [cancelBooking, setCancelBooking] = useState<BookingDetails | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)');
    }
  };

  const handleSelectDate = (iso: string) => {
    viewModel.goToDate(iso);
    setIsDatePickerOpen(false);
  };

  const webBackgroundStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(20, 20, 20, 0.98) 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        } as any)
      : null;

  if (!memberships.some(m => m.id === selectedShopId && m.state === 'ACTIVE' && ['OWNER', 'BARBERMAN'].includes(m.role))) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[{ flex: 1, backgroundColor: colors.background.primary }, webBackgroundStyle]}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[6],
          }}
        >
          <EmptyState
            title="Área do barbeiro"
            description="Selecione uma unidade com vínculo profissional ativo para consultar os atendimentos."
            style={{ maxWidth: contentMaxWidth }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[{ flex: 1, backgroundColor: colors.background.primary }, webBackgroundStyle]}
    >
      <BookingsHeader
        dateLabel={viewModel.dateLabel}
        dateLabelShort={viewModel.dateLabelShort}
        isToday={viewModel.isToday}
        canGoToPreviousDay={viewModel.canGoToPreviousDay}
        canGoToNextDay={viewModel.canGoToNextDay}
        isUpdatingDate={viewModel.isUpdatingDate}
        lastUpdatedAtLabel={viewModel.lastUpdatedAtLabel}
        onGoToPreviousDay={viewModel.goToPreviousDay}
        onGoToNextDay={viewModel.goToNextDay}
        onGoToToday={viewModel.goToToday}
        onOpenDatePicker={() => setIsDatePickerOpen(true)}
        onBack={handleBack}
      />

      <AgendaDatePicker
        visible={isDatePickerOpen}
        selectedDate={viewModel.selectedDate}
        todayIso={viewModel.todayIso}
        minDateIso={viewModel.minSelectableDateIso}
        maxDateIso={viewModel.maxSelectableDateIso}
        onSelectDate={handleSelectDate}
        onClose={() => setIsDatePickerOpen(false)}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={viewModel.isRefreshing}
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
          paddingBottom: isCompact ? 104 : spacing[6],
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[4] }}>
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
                isSlowSync={viewModel.isSlowSync}
                isDataStale={viewModel.isDataStale}
                onRetry={handleRefresh}
              />

              <BookingsSummary
                count={totals.count}
                durationMinutes={totals.durationMinutes}
                priceInCents={totals.priceInCents}
                isLoading={isInitialLoading}
              />

              {isInitialLoading ? (
                <View style={{ gap: spacing[3], width: '100%' }}>
                  <Skeleton height={132} style={{ width: '100%' }} />
                  <Skeleton height={132} style={{ width: '100%' }} />
                </View>
              ) : bookings.length === 0 ? (
                <EmptyState
                  title="Nenhum atendimento neste dia"
                  description="Quando houver agendamentos confirmados, eles aparecem aqui para você gerenciar."
                  style={{ marginVertical: spacing[6] }}
                />
              ) : (
                <View style={{ gap: spacing[3], width: '100%' }}>
                  {bookings.map((booking) => (
                    <BookingManageCard
                      key={booking.id}
                      booking={booking}
                      onEdit={() => {
                        clearCancelError(booking.id);
                        setEditBooking(booking);
                      }}
                      onCancel={() => {
                        clearCancelError(booking.id);
                        setCancelBooking(booking);
                      }}
                      isEditing={updatingBookingId === booking.id}
                      isCancelling={cancellingId === booking.id}
                      cancelError={cancelError?.bookingId === booking.id ? cancelError.message : null}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {viewModel.recoveryRequestId && <BookingRecovery requestId={viewModel.recoveryRequestId} onResolvedNotApplied={viewModel.resolveRecovery} onResolvedApplied={viewModel.resolveRecovery} />}
      <EditBookingSheet
        visible={editBooking !== null}
        booking={editBooking}
        todayIso={viewModel.todayIso}
        minDateIso={viewModel.minSelectableDateIso}
        maxDateIso={viewModel.maxSelectableDateIso}
        isSaving={updatingBookingId !== null}
        onSave={handleUpdateBooking}
        onClose={() => setEditBooking(null)}
      />

      <BookingCancelDialog
        visible={cancelBooking !== null}
        booking={cancelBooking}
        onConfirm={() =>
          cancelBooking
            ? handleCancelBooking(cancelBooking.id)
            : Promise.resolve({ ok: false, message: null })
        }
        onClose={() => setCancelBooking(null)}
      />
    </SafeAreaView>
  );
}
