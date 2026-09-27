import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Card, EmptyState, Skeleton, Text } from '@/shared/ui';
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
}

function renderEntry(entry: AgendaEntry) {
  switch (entry.type) {
    case 'APPOINTMENT':
      return <AgendaAppointmentCard key={entry.id} entry={entry} />;
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
}: AgendaTimelineProps) {
  const { colors, spacing } = useTheme();

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
        </Text>
      </View>

      {isLoading ? (
        <View style={{ gap: spacing[3] }}>
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} style={{ minHeight: 84, gap: spacing[2] }}>
              <Skeleton width={140} height={18} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={14} />
            </Card>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <Card style={{ padding: spacing[6] }}>
          <EmptyState
            title={isClosed ? 'Barbearia fechada neste dia' : 'Nenhum horário neste dia'}
            description={
              isClosed
                ? 'Não há expediente programado para a data selecionada.'
                : 'Não encontramos entradas de agenda para esta data.'
            }
            actionLabel="Voltar para hoje"
            onAction={onGoToToday}
          />
        </Card>
      ) : (
        <View
          style={[
            { gap: spacing[3] },
            isUpdatingDate ? { opacity: 0.6 } : null,
          ]}
        >
          {entries.map(renderEntry)}
        </View>
      )}
    </View>
  );
}
