import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { ApiError } from '@/shared/api/api-errors';
import { Badge, Button, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import { StarRating } from '../StarRating';
import { useOwnerFeedbacks } from '../../model/use-owner-reviews';
import { useReportReview } from '../../model/use-reviews';
import type { ReviewSourceDto } from '../../api/owner-reviews.types';
import { ReviewErrorBanner } from './ReviewErrorBanner';

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
  const [commentFilter, setCommentFilter] = useState<'ALL' | 'WITH' | 'WITHOUT'>(
    'ALL',
  );
  const [page, setPage] = useState(1);

  const [reportingReviewId, setReportingReviewId] = useState<string | null>(
    null,
  );
  const [reportReason, setReportReason] = useState('');
  const [reportFeedback, setReportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const reportMutation = useReportReview();

  useEffect(() => {
    setPage(1);
  }, [
    shopId,
    source,
    startDate,
    endDate,
    initialTargetId,
    targetType,
    selectedRating,
    commentFilter,
  ]);

  const hasComment =
    commentFilter === 'WITH'
      ? true
      : commentFilter === 'WITHOUT'
        ? false
        : undefined;

  const { data, isLoading, isError, error, refetch } = useOwnerFeedbacks(
    shopId,
    {
      source,
      startDate,
      endDate,
      targetType,
      targetId: initialTargetId,
      rating: selectedRating,
      hasComment,
      page,
      limit: 10,
    },
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = data?.hasNext ?? false;

  const handleOpenReport = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportReason('');
    setReportFeedback(null);
  };

  const handleSubmitReport = async () => {
    if (!reportingReviewId) return;
    const trimmed = reportReason.trim();
    if (trimmed.length < 5) {
      setReportFeedback({
        type: 'error',
        message: 'Informe um motivo com pelo menos 5 caracteres.',
      });
      return;
    }

    try {
      await reportMutation.mutateAsync({
        reviewId: reportingReviewId,
        reason: trimmed,
      });
      setReportFeedback({
        type: 'success',
        message: 'Avaliação denunciada com sucesso para moderação.',
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setReportFeedback({
          type: 'error',
          message: 'Você já denunciou esta avaliação anteriormente.',
        });
      } else {
        setReportFeedback({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Não foi possível enviar a denúncia.',
        });
      }
    }
  };

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

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(
            [
              { label: 'Todos', value: 'ALL' },
              { label: 'Com comentário', value: 'WITH' },
              { label: 'Sem comentário', value: 'WITHOUT' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Comentário: ${option.label}`}
              onPress={() => {
                setCommentFilter(option.value);
                setPage(1);
              }}
              style={[
                styles.ratingPill,
                commentFilter === option.value && {
                  backgroundColor: colors.brand.primary,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="bold"
                color={
                  commentFilter === option.value
                    ? colors.text.inverse
                    : colors.text.secondary
                }
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Conteúdo de Feedbacks */}
      {isError && !data ? (
        <ReviewErrorBanner
          error={error}
          hasCachedData={false}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : isLoading && !data ? (
        <View style={{ gap: spacing[3] }}>
          <Skeleton width="100%" height={120} />
          <Skeleton width="100%" height={120} />
        </View>
      ) : (
        <>
          {isError ? (
            <ReviewErrorBanner
              error={error}
              hasCachedData={Boolean(data)}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : null}
          {items.length === 0 ? (
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

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                {feedback.source === 'DEMO' ? (
                  <Badge label="Demonstração" tone="brand" size="sm" />
                ) : feedback.source === 'UNKNOWN' ? (
                  <Badge label="Origem não identificada" tone="warning" size="sm" />
                ) : null}
              </View>
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

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingTop: spacing[2],
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border.subtle,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Denunciar avaliação de ${feedback.customer.name}`}
                onPress={() => handleOpenReport(feedback.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons
                  name="flag-outline"
                  size={14}
                  color={colors.text.muted}
                />
                <Text variant="caption" color={colors.text.muted}>
                  Denunciar
                </Text>
              </Pressable>
            </View>
          </LiquidGlassView>
        ))
      )}
        </>
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

      <Modal
        visible={reportingReviewId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReportingReviewId(null)}
      >
        <View style={styles.modalBackdrop}>
          <LiquidGlassView
            variant="card"
            elevated
            style={{ width: '90%', maxWidth: 420, borderRadius: radius.lg }}
            contentStyle={{ padding: spacing[4], gap: spacing[3] }}
          >
            <Text variant="subhead" weight="bold" color={colors.text.primary}>
              Denunciar avaliação
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              Descreva o motivo da denúncia para análise da equipe de moderação.
            </Text>

            <TextInput
              accessibilityLabel="Motivo da denúncia"
              placeholder="Ex.: Conteúdo ofensivo ou spam"
              placeholderTextColor={colors.text.muted}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              style={[
                styles.reportInput,
                {
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderRadius: radius.md,
                  padding: spacing[3],
                },
              ]}
            />

            {reportFeedback ? (
              <Text
                variant="caption"
                color={
                  reportFeedback.type === 'success'
                    ? colors.feedback.success
                    : colors.feedback.error
                }
              >
                {reportFeedback.message}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: spacing[2],
              }}
            >
              <Button
                title="Fechar"
                variant="ghost"
                onPress={() => setReportingReviewId(null)}
              />
              <Button
                title={
                  reportMutation.isPending ? 'Enviando...' : 'Enviar denúncia'
                }
                variant="primary"
                disabled={reportMutation.isPending}
                onPress={() => {
                  void handleSubmitReport();
                }}
              />
            </View>
          </LiquidGlassView>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  reportInput: {
    minHeight: 88,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
});
