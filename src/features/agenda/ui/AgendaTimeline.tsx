import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@/shared/theme';
import { EmptyState, Skeleton, Text, Button } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { AgendaEntry } from '../api/agenda.contract';
import { AgendaAppointmentCard } from './AgendaAppointmentCard';
import { AgendaBufferRow } from './AgendaBufferRow';
import { AgendaFreeSlotCard } from './AgendaFreeSlotCard';
import { AgendaHoldCard } from './AgendaHoldCard';

interface AgendaTimelineProps {
  entries: AgendaEntry[];
  isClosed: boolean;
  isLoading: boolean;
  isUpdatingDate: boolean;
  onGoToToday: () => void;
  onSelect?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (booking: any) => void;
  onComplete?: (booking: any) => void;
  onNoShow?: (booking: any) => void;
  cancellingId?: string | null;
  isPartial?: boolean;
  hasNext?: boolean;
  loadMore?: () => void;
  loadMoreError?: string | null;
  isLoadingMore?: boolean;
}

function renderEntry(
  entry: AgendaEntry,
  onSelect?: (id: string) => void,
  onCancel?: (id: string) => void,
  onReschedule?: (booking: any) => void,
  onComplete?: (booking: any) => void,
  onNoShow?: (booking: any) => void,
  cancellingId?: string | null,
) {
  switch (entry.type) {
    case 'APPOINTMENT':
      return (
        <AgendaAppointmentCard
          key={entry.id}
          entry={entry}
          onSelect={onSelect}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onComplete={onComplete}
          onNoShow={onNoShow}
          isCancelling={cancellingId === entry.id}
        />
      );
    case 'FREE_SLOT':
      return <AgendaFreeSlotCard key={entry.id} entry={entry} />;
    case 'HOLD':
      return <AgendaHoldCard key={entry.id} entry={entry} />;
    case 'BUFFER':
      return <AgendaBufferRow key={entry.id} entry={entry} />;
    default:
      return null;
  }
}

/** Linha do tempo do dia em ordem cronológica. */
export function AgendaTimeline({
  entries,
  isClosed,
  isLoading,
  isUpdatingDate,
  onGoToToday,
  onSelect,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
  cancellingId,
  isPartial = false,
  hasNext = false,
  loadMore,
  loadMoreError,
  isLoadingMore = false,
}: AgendaTimelineProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ width: '100%', gap: spacing[4] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
        }}
      >
        <Text variant="h2" color={colors.text.primary}>
          Horários
        </Text>
        <Text variant="caption" color={colors.text.muted}>
          {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
          {isPartial ? ' (parcial)' : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: spacing[3] }}>
          {[0, 1, 2, 3].map((index) => (
            <LiquidGlassView
              key={index}
              variant="card"
              style={{ width: '100%', minHeight: 84 }}
              contentStyle={{ gap: spacing[2], padding: spacing[4] }}
            >
              <Skeleton width={140} height={18} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={14} />
            </LiquidGlassView>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <LiquidGlassView
          variant="card"
          elevated
          style={{ width: '100%' }}
          contentStyle={{ padding: spacing[6] }}
        >
          <EmptyState
            title={isClosed ? 'Unidade fechada nesta data' : 'Nenhum agendamento para este dia'}
            description={
              isClosed
                ? 'Consulte os horários da barbearia para mais informações.'
                : 'Não há agendamentos agendados para a data selecionada.'
            }
            actionLabel="Ir para hoje"
            onAction={onGoToToday}
          />
        </LiquidGlassView>
      ) : (
        <View style={{ gap: spacing[3] }}>
          {entries.map((entry) =>
            renderEntry(
              entry,
              onSelect,
              onCancel,
              onReschedule,
              onComplete,
              onNoShow,
              cancellingId
            )
          )}

          {/* Feedback de erro ao carregar páginas adicionais com ação de retry */}
          {loadMoreError && loadMore ? (
            <View
              style={{
                marginTop: spacing[2],
                padding: spacing[3],
                borderRadius: radius.md,
                backgroundColor: colors.surface.input,
                borderWidth: 1,
                borderColor: colors.feedback.error,
                alignItems: 'center',
                gap: spacing[2],
              }}
              accessibilityRole="alert"
            >
              <Text variant="caption" color={colors.feedback.error}>
                {loadMoreError}
              </Text>
              <Button
                variant="outline"
                title="Tentar carregar novamente"
                onPress={loadMore}
                disabled={isLoadingMore}
                style={{ minHeight: 36, paddingHorizontal: spacing[4] }}
              />
            </View>
          ) : null}

          {/* Paginação honesta: Botão Carregar Mais se hasNext for verdadeiro */}
          {hasNext && loadMore && !loadMoreError ? (
            <View style={{ marginTop: spacing[3], alignItems: 'center' }}>
              <Button
                variant="outline"
                title={isLoadingMore ? 'Carregando mais reservas…' : 'Carregar mais reservas'}
                onPress={loadMore}
                disabled={isLoadingMore}
                style={{ minHeight: 44, paddingHorizontal: spacing[6] }}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
