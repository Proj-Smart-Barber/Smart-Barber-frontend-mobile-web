import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Badge, Button, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import { StarRating } from '../StarRating';
import { useOwnerFeedbacks } from '../../model/use-owner-reviews';
import type { ReviewSourceDto } from '../../api/owner-reviews.types';

interface OwnerFeedbacksTabProps {
  shopId: string;
  source: ReviewSourceDto;
  startDate?: string;
  endDate?: string;
  initialTargetId?: string;
  onClearTargetFilter?: () => void;
}

export function OwnerFeedbacksTab({
  shopId,
  source,
  startDate,
  endDate,
  initialTargetId,
  onClearTargetFilter,
}: OwnerFeedbacksTabProps) {
  const { colors, spacing, radius, isDark } = useTheme();

  const [targetType, setTargetType] = useState<
    'ALL' | 'BARBERSHOP' | 'BARBER' | 'SERVICE'
  >('ALL');
  const [selectedRating, setSelectedRating] = useState<number | undefined>(
    undefined,
  );
  const [onlyWithComment, setOnlyWithComment] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOwnerFeedbacks(shopId, {
    source,
    startDate,
    endDate,
    targetType,
    targetId: initialTargetId,
    rating: selectedRating,
    hasComment: onlyWithComment ? true : undefined,
    page,
    limit: 10,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = data?.hasNext ?? false;

  return (
    <View style={{ gap: spacing[3] }}>
      {/* Chip de Filtro Ativo por ID de Alvo */}
      {initialTargetId ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(0, 0, 0, 0.05)',
            padding: spacing[2],
            borderRadius: radius.md,
          }}
        >
          <Text variant="caption" color={colors.text.secondary}>
            Filtrando por alvo específico
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar filtro de alvo"
            onPress={onClearTargetFilter}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.brand.primary} />
            <Text variant="caption" weight="bold" color={colors.brand.primary}>
              Limpar filtro
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Filtros da Lista: Tipo de Alvo */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {(
          [
            { label: 'Todos', value: 'ALL' },
            { label: 'Barbearia', value: 'BARBERSHOP' },
            { label: 'Barbeiros', value: 'BARBER' },
            { label: 'Serviços', value: 'SERVICE' },
          ] as const
        ).map((tab) => (
          <Pressable
            key={tab.value}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${tab.label}`}
            onPress={() => {
              setTargetType(tab.value);
              setPage(1);
            }}
            style={[
              styles.filterPill,
              targetType === tab.value && {
                backgroundColor: colors.brand.primary,
              },
            ]}
          >
            <Text
              variant="caption"
              weight="bold"
              color={
                targetType === tab.value
                  ? colors.text.inverse
                  : colors.text.secondary
              }
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Filtro por Estrelas e Checkbox Comentário */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {[5, 4, 3, 2, 1].map((rating) => (
            <Pressable
              key={rating}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por nota ${rating}`}
              onPress={() => {
                setSelectedRating((prev) => (prev === rating ? undefined : rating));
                setPage(1);
              }}
              style={[
                styles.ratingPill,
                selectedRating === rating && {
                  backgroundColor: colors.brand.primary,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="bold"
                color={
                  selectedRating === rating
                    ? colors.text.inverse
                    : colors.text.secondary
                }
              >
                {rating}★
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Apenas avaliações com comentário"
          onPress={() => {
            setOnlyWithComment((prev) => !prev);
            setPage(1);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
        >
          <Ionicons
            name={onlyWithComment ? 'checkbox' : 'square-outline'}
            size={18}
            color={onlyWithComment ? colors.brand.primary : colors.text.muted}
          />
          <Text variant="caption" color={colors.text.secondary}>
            Com comentário
          </Text>
        </Pressable>
      </View>

      {/* Conteúdo de Feedbacks */}
      {isLoading ? (
        <View style={{ gap: spacing[3] }}>
          <Skeleton width="100%" height={120} />
          <Skeleton width="100%" height={120} />
        </View>
      ) : items.length === 0 ? (
        <LiquidGlassView
          variant="card"
          elevated
          style={{ borderRadius: radius.md }}
          contentStyle={{ padding: spacing[4], alignItems: 'center' }}
        >
          <Text variant="bodySm" color={colors.text.muted}>
            Nenhuma avaliação encontrada com os filtros selecionados.
          </Text>
        </LiquidGlassView>
      ) : (
        items.map((feedback) => (
          <LiquidGlassView
            key={feedback.id}
            variant="card"
            elevated
            style={{ borderRadius: radius.lg }}
            contentStyle={{ padding: spacing[4], gap: spacing[3] }}
          >
            {/* Header: Autor, Data e Badge de Demonstração */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.full,
                    backgroundColor: colors.surface.elevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="caption" weight="bold" color={colors.text.primary}>
                    {feedback.customer.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View>
                  <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                    {feedback.customer.name}
                  </Text>
                  <Text variant="caption" color={colors.text.muted}>
                    {new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>

              {feedback.source === 'DEMO' ? (
                <Badge label="Demonstração" tone="brand" size="sm" />
              ) : null}
            </View>

            {/* Nota Geral da Barbearia */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <StarRating rating={feedback.barbershopRating} size={18} />
              <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                Nota da barbearia: {feedback.barbershopRating}
              </Text>
            </View>

            {/* Comentário Geral do Atendimento */}
            {feedback.generalComment ? (
              <View
                style={{
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.03)',
                  padding: spacing[3],
                  borderRadius: radius.md,
                  gap: 4,
                }}
              >
                <Text variant="caption" weight="bold" color={colors.text.muted}>
                  Comentário geral do atendimento:
                </Text>
                <Text variant="bodySm" color={colors.text.primary}>
                  "{feedback.generalComment}"
                </Text>
              </View>
            ) : null}

            {/* Itens Avaliados (Serviços e Profissional) */}
            {feedback.items.length > 0 ? (
              <View style={{ gap: spacing[1] }}>
                <Text variant="caption" weight="bold" color={colors.text.muted}>
                  Notas por item da reserva:
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing[2],
                  }}
                >
                  {feedback.items.map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)',
                        paddingHorizontal: spacing[2],
                        paddingVertical: 4,
                        borderRadius: radius.sm,
                      }}
                    >
                      <Text variant="caption" color={colors.text.secondary}>
                        {item.targetLabel}:
                      </Text>
                      <Text
                        variant="caption"
                        weight="bold"
                        color={colors.text.primary}
                      >
                        {item.rating}★
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </LiquidGlassView>
        ))
      )}

      {/* Paginação */}
      {total > 10 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing[3],
          }}
        >
          <Button
            title="Anterior"
            variant="ghost"
            disabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          />
          <Text variant="caption" color={colors.text.muted}>
            Página {page} ({total} avaliações)
          </Text>
          <Button
            title="Próxima"
            variant="ghost"
            disabled={!hasNext}
            onPress={() => setPage((p) => p + 1)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  ratingPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
});
