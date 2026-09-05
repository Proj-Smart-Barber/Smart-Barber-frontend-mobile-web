import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Card, EmptyState, Skeleton, Text } from '@/shared/ui';
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

  const filterOptions: { label: string; value: TimelineFilter }[] = [
    { label: `Todos (${totalCount})`, value: 'ALL' },
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

        {/* Pílulas de Filtro */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface.input,
            borderRadius: radius.full,
            padding: 4,
            gap: 4,
          }}
        >
          {filterOptions.map((opt) => {
            const isActive = currentFilter === opt.value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${opt.label}`}
                onPress={() => onFilterChange(opt.value)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radius.full,
                  backgroundColor: isActive ? colors.brand.primary : 'transparent',
                }}
              >
                <Text
                  variant="tab"
                  color={isActive ? colors.text.inverse : colors.text.secondary}
                  weight={isActive ? 'semibold' : 'medium'}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                  <View
                    style={{
                      width: 58,
                      height: 50,
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

                  <View style={{ flex: 1, gap: 2 }}>
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

                  {/* Botão de avanço rápido de status */}
                  {item.status === 'CONFIRMED' || item.status === 'WAITING' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Iniciar corte de ${item.customerName}`}
                      onPress={() => onUpdateStatus(item.id, 'IN_SERVICE')}
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
                      <Ionicons name="play" size={16} color={colors.brand.primary} />
                    </Pressable>
                  ) : item.status === 'IN_SERVICE' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Concluir corte de ${item.customerName}`}
                      onPress={() => onUpdateStatus(item.id, 'COMPLETED')}
                      style={({ pressed }) => ({
                        width: 36,
                        height: 36,
                        borderRadius: radius.md,
                        backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.feedback.success,
                      })}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.feedback.success} />
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );
}
