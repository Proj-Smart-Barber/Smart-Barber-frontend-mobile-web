import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Card, EmptyState, SegmentedFilter, type SegmentedFilterOption, Skeleton, Text } from '@/shared/ui';
import { confirmDestructiveAction } from '@/features/agenda/ui/confirm-destructive-action';
import type { AppointmentStatus, DashboardAppointment } from '../api/dashboard.contract';
import { formatCurrency, mapStatusBadgeTone, mapStatusLabel } from '../model/dashboard.helpers';
import type { TimelineFilter } from '../model/dashboard.types';

interface TodayTimelineProps {
  appointments: DashboardAppointment[];
  totalCount: number;
  currentFilter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  isLoading?: boolean;
}

export function TodayTimeline({
  appointments,
  totalCount,
  currentFilter,
  onFilterChange,
  onUpdateStatus,
  isLoading = false,
}: TodayTimelineProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const router = useRouter();

  const handleCancelAppointment = async (id: string, name: string, time: string) => {
    const confirmed = await confirmDestructiveAction({
      title: 'Cancelar agendamento',
      message: `Deseja realmente cancelar o agendamento de ${name} às ${time}? O registro será excluído da agenda.`,
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Manter',
    });

    if (confirmed) {
      onUpdateStatus(id, 'CANCELLED');
    }
  };

  const filterOptions: SegmentedFilterOption<TimelineFilter>[] = [
    { label: 'Todos', value: 'ALL', count: totalCount },
    { label: 'Pendentes', value: 'PENDING' },
    { label: 'Concluídos', value: 'DONE' },
  ];

  return (
    <View style={{ width: '100%', gap: spacing[4] }}>
      {/* Cabeçalho da Seção e Filtros */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: isCompact ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
        }}
      >
        <View style={{ gap: 2 }}>
          <Text variant="h2" color={colors.text.primary}>
            Agenda de Hoje
          </Text>
          <Text variant="caption" color={colors.text.muted}>
            Acompanhe o fluxo e o andamento dos atendimentos
          </Text>
        </View>

        {/* Filtro Segmentado C3 */}
        <SegmentedFilter
          options={filterOptions}
          value={currentFilter}
          onChange={onFilterChange}
          style={{ width: isCompact ? '100%' : 'auto', minWidth: isCompact ? undefined : 300 }}
        />
      </View>

      {/* Lista de Atendimentos */}
      {isLoading ? (
        <View style={{ gap: spacing[3] }}>
          <Card style={{ minHeight: 76, gap: spacing[2] }}>
            <Skeleton width={140} height={18} />
            <Skeleton width="60%" height={14} />
          </Card>
          <Card style={{ minHeight: 76, gap: spacing[2] }}>
            <Skeleton width={140} height={18} />
            <Skeleton width="60%" height={14} />
          </Card>
        </View>
      ) : appointments.length === 0 ? (
        <Card style={{ padding: spacing[6] }}>
          <EmptyState
            title="Nenhum agendamento encontrado"
            description="Não há atendimentos para o filtro selecionado no momento."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing[3] }}>
          {appointments.map((item) => {
            const isCompleted = item.status === 'COMPLETED';

            return (
              <Card
                key={item.id}
                style={{
                  padding: spacing[4],
                  flexDirection: isCompact ? 'column' : 'row',
                  alignItems: isCompact ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: spacing[3],
                  opacity: isCompleted ? 0.75 : 1,
                }}
              >
                {/* Horário e Detalhes do Cliente */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      width: 58,
                      height: 50,
                      flexShrink: 0,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface.input,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeftWidth: 3,
                      borderLeftColor:
                        item.status === 'IN_SERVICE'
                          ? colors.feedback.warning
                          : item.status === 'COMPLETED'
                            ? colors.feedback.success
                            : colors.brand.primary,
                    }}
                  >
                    <Text variant="subhead" color={colors.text.primary} weight="bold">
                      {item.scheduledTime}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text variant="subhead" color={colors.text.primary}>
                      {item.customerName}
                    </Text>
                    <Text variant="caption" color={colors.text.secondary}>
                      {item.serviceTitle} · {formatCurrency(item.servicePriceInCents)}
                    </Text>
                    <Text variant="caption" color={colors.text.muted}>
                      Barbeiro: {item.barbermanName}
                    </Text>
                  </View>
                </View>

                {/* Status e Ação Rápida */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[2],
                    alignSelf: isCompact ? 'flex-end' : 'center',
                  }}
                >
                  <Badge
                    label={mapStatusLabel(item.status)}
                    tone={mapStatusBadgeTone(item.status)}
                  />

                  {/* Botão de cancelamento com confirmação */}
                  {item.status !== 'CANCELLED' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Cancelar agendamento de ${item.customerName}`}
                      hitSlop={8}
                      onPress={() => void handleCancelAppointment(item.id, item.customerName, item.scheduledTime)}
                      style={({ pressed }) => ({
                        width: 36,
                        height: 36,
                        borderRadius: radius.md,
                        backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.border.default,
                      })}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.feedback.error} />
                    </Pressable>
                  ) : null}

                  {/* Botão para ver na agenda completa */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver agendamento de ${item.customerName} na agenda completa`}
                    hitSlop={8}
                    onPress={() => router.push('/(app)/agenda' as any)}
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: colors.border.default,
                    })}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}
