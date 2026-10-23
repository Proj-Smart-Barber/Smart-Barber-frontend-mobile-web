import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { StarRating } from './StarRating';
import { ReviewFormModal } from './ReviewFormModal';
import { useBookingReview, useDeleteReview } from '../model/use-reviews';

export interface BookingReviewActionProps {
  bookingId: string;
  status?: string | null;
  onReviewChanged?: () => void;
}

export function BookingReviewAction({
  bookingId,
  status,
  onReviewChanged,
}: BookingReviewActionProps) {
  const { colors, radius } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useBookingReview(bookingId);
  const deleteMutation = useDeleteReview(() => {
    onReviewChanged?.();
  });

  // Somente atendimentos concluídos podem ser avaliados
  if (!status || status.toUpperCase() !== 'COMPLETED') {
    return null;
  }

  const existingReview = data?.review;

  const handleDelete = async () => {
    if (!existingReview?.version) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({
        bookingId,
        expectedVersion: existingReview.version,
      });
    } catch (err: any) {
      setDeleteError(err?.message || 'Falha ao remover avaliação.');
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text variant="caption" style={{ color: colors.text.secondary }}>
          Carregando avaliação...
        </Text>
      ) : existingReview?.status === 'HIDDEN_BY_MODERATION' ? (
        <View
          style={[
            styles.existingBox,
            {
              backgroundColor: colors.surface.input,
              borderColor: colors.feedback.error,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text variant="caption" style={{ color: colors.feedback.error }}>
            Esta avaliação foi ocultada pela moderação da plataforma e não está visível publicamente.
          </Text>
        </View>
      ) : existingReview && existingReview.status === 'PUBLISHED' ? (
        <View
          style={[
            styles.existingBox,
            {
              backgroundColor: colors.surface.input,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
            },
          ]}
        >
          <View style={styles.existingHeader}>
            <View>
              <Text variant="caption" weight="medium" style={{ color: colors.text.secondary }}>
                Sua avaliação
              </Text>
              <StarRating rating={existingReview.rating} size={16} />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.textBtn}
                accessibilityRole="button"
                accessibilityLabel="Editar avaliação"
              >
                <Text variant="caption" weight="bold" style={{ color: colors.brand.primary }}>
                  Editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
                style={styles.textBtn}
                accessibilityRole="button"
                accessibilityLabel="Remover avaliação"
              >
                <Text variant="caption" style={{ color: colors.feedback.error }}>
                  Excluir
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {existingReview.comment ? (
            <Text variant="caption" style={{ color: colors.text.primary, marginTop: 4 }}>
              "{existingReview.comment}"
            </Text>
          ) : null}

          {deleteError ? (
            <Text variant="caption" style={{ color: colors.feedback.error, marginTop: 4 }}>
              {deleteError}
            </Text>
          ) : null}
        </View>
      ) : (
        <Button
          title="Avaliar Atendimento"
          variant="secondary"
          onPress={() => setModalVisible(true)}
        />
      )}

      {/* Modal de Avaliação */}
      <ReviewFormModal
        visible={modalVisible}
        bookingId={bookingId}
        initialRating={existingReview?.rating ?? 5}
        initialComment={existingReview?.comment ?? ''}
        expectedVersion={existingReview?.version}
        isEditing={Boolean(existingReview && existingReview.status === 'PUBLISHED')}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          onReviewChanged?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  existingBox: {
    padding: 10,
    borderWidth: 1,
  },
  existingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  textBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
});
