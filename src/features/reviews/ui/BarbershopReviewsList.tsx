import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { TextInput } from '@/shared/ui/TextInput';
import { Alert } from '@/shared/ui/Alert';
import { BrandMark } from '@/shared/brand';
import { StarRating } from './StarRating';
import { useBarbershopReviews, useReportReview } from '../model/use-reviews';
import type { ReviewItemDto } from '../api/reviews.types';

export interface BarbershopReviewsListProps {
  shopId?: string;
  barbershopId?: string;
}

export function BarbershopReviewsList({ shopId, barbershopId }: BarbershopReviewsListProps) {
  const { colors, radius, isDark } = useTheme();
  const effectiveShopId = shopId || barbershopId || '';
  const { data, isLoading, error } = useBarbershopReviews(effectiveShopId);

  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const reportMutation = useReportReview(() => {
    setReportSuccess(true);
    setTimeout(() => {
      setReportingReviewId(null);
      setReportReason('');
      setReportSuccess(false);
    }, 1500);
  });

  const handleOpenReport = (reviewId: string) => {
    setReportingReviewId(reviewId);
    setReportReason('');
    setReportSuccess(false);
    setReportError(null);
  };

  const handleSendReport = async () => {
    if (!reportingReviewId) return;
    if (!reportReason.trim()) {
      setReportError('Informe o motivo da denúncia.');
      return;
    }

    try {
      await reportMutation.mutateAsync({
        reviewId: reportingReviewId,
        reason: reportReason.trim(),
      });
    } catch (err: any) {
      setReportError(err?.message || 'Falha ao enviar denúncia.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <Text variant="caption" style={{ color: colors.text.secondary }}>
          Carregando avaliações...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Alert
          variant="error"
          title="Erro ao carregar avaliações"
          message="Não foi possível carregar as avaliações no momento. Tente novamente mais tarde."
        />
      </View>
    );
  }

  const reviewCount = data?.reviewCount ?? 0;
  const averageRating = data?.averageRating ?? 0;
  const reviews = data?.reviews ?? [];

  return (
    <View style={styles.container}>
      {/* Resumo da Nota */}
      <View style={styles.summaryHeader}>
        <Text variant="h3" weight="bold">
          Avaliações
        </Text>

        {reviewCount === 0 ? (
          <Text variant="caption" style={{ color: colors.text.secondary }}>
            Ainda sem avaliações
          </Text>
        ) : (
          <View style={styles.ratingBadgeRow}>
            <View
              style={[
                styles.badgeBox,
                {
                  backgroundColor: colors.surface.input,
                  borderColor: colors.border.subtle,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text variant="caption" weight="bold" style={{ marginLeft: 4 }}>
                {averageRating.toFixed(1)}
              </Text>
            </View>
            <Text variant="caption" style={{ color: colors.text.secondary, marginLeft: 6 }}>
              ({reviewCount} {reviewCount === 1 ? 'avaliação' : 'avaliações'})
            </Text>
          </View>
        )}
      </View>

      {/* Lista de Avaliações */}
      {reviews.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surface.input,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
            },
          ]}
        >
          <Ionicons name="chatbox-ellipses-outline" size={28} color={colors.text.secondary} />
          <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 8 }}>
            Esta unidade ainda não possui avaliações de clientes.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {reviews.map((rev) => (
            <View
              key={rev.id}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.border.subtle,
                  borderRadius: radius.md,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.authorRow}>
                  <View
                    style={[
                      styles.avatarThumb,
                      {
                        borderRadius: 18,
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                      },
                    ]}
                  >
                    {rev.author.avatarUrl ? (
                      <Image
                        source={{ uri: rev.author.avatarUrl }}
                        style={styles.avatarImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <BrandMark
                        variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                        size={16}
                        decorative
                      />
                    )}
                  </View>

                  <View style={{ marginLeft: 10 }}>
                    <Text variant="body" weight="medium">
                      {rev.author.name}
                    </Text>
                    <StarRating rating={rev.rating} size={14} />
                  </View>
                </View>

                {/* Botão de Denúncia */}
                <TouchableOpacity
                  onPress={() => handleOpenReport(rev.id)}
                  style={styles.flagBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Denunciar avaliação abusiva"
                >
                  <Ionicons name="flag-outline" size={14} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {rev.comment ? (
                <Text variant="body" style={styles.commentText}>
                  {rev.comment}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Modal de Denúncia */}
      <Modal
        visible={!!reportingReviewId}
        transparent
        animationType="fade"
        onRequestClose={() => setReportingReviewId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface.elevated,
                borderColor: colors.border.subtle,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text variant="h3" weight="bold" style={{ marginBottom: 8 }}>
              Denunciar Conteúdo
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 12 }}>
              Descreva o motivo da denúncia (linguagem abusiva, spam, difamação). A moderação analisará.
            </Text>

            {reportSuccess ? (
              <Alert variant="success" message="Denúncia enviada à moderação com sucesso." />
            ) : (
              <>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Motivo da denúncia..."
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                />

                {reportError ? (
                  <Alert variant="error" message={reportError} style={{ marginTop: 8 }} />
                ) : null}

                <View style={styles.modalActions}>
                  <Button
                    title="Enviar Denúncia"
                    onPress={handleSendReport}
                    loading={reportMutation.isPending}
                    disabled={reportMutation.isPending}
                  />
                  <Button
                    title="Cancelar"
                    variant="outline"
                    onPress={() => setReportingReviewId(null)}
                    disabled={reportMutation.isPending}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  listContainer: {
    gap: 10,
  },
  reviewCard: {
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarThumb: {
    width: 36,
    height: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  flagBtn: {
    padding: 6,
  },
  commentText: {
    marginTop: 8,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
});
