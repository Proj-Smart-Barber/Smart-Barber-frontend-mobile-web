import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Alert } from '@/shared/ui/Alert';
import { StarRating } from './StarRating';
import { useProfessionalReviews, useServiceReviews } from '../model/use-reviews';

export interface TargetReviewsModalProps {
  visible: boolean;
  shopId: string;
  targetType: 'BARBER' | 'SERVICE';
  targetId: string;
  targetName: string;
  onClose: () => void;
}

export function TargetReviewsModal({
  visible,
  shopId,
  targetType,
  targetId,
  targetName,
  onClose,
}: TargetReviewsModalProps) {
  const { colors, isDark, radius } = useTheme();
  const barberQuery = useProfessionalReviews(
    visible && targetType === 'BARBER' ? shopId : undefined,
    visible && targetType === 'BARBER' ? targetId : undefined,
  );
  const serviceQuery = useServiceReviews(
    visible && targetType === 'SERVICE' ? shopId : undefined,
    visible && targetType === 'SERVICE' ? targetId : undefined,
  );

  const query = targetType === 'BARBER' ? barberQuery : serviceQuery;
  const data = query.data;
  const reviewCount = data?.reviewCount ?? 0;
  const averageRating = data?.averageRating ?? null;
  const reviews = data?.reviews ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar avaliações"
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.subtle,
              borderRadius: radius.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="bold" style={{ color: colors.brand.primary }}>
                {targetType === 'BARBER'
                  ? 'AVALIAÇÕES DO PROFISSIONAL'
                  : 'AVALIAÇÕES DO SERVIÇO'}
              </Text>
              <Text variant="h3" weight="bold">
                {targetName}
              </Text>
              <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                {reviewCount > 0 && averageRating != null
                  ? `★ ${averageRating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'avaliação' : 'avaliações'})`
                  : 'Sem avaliações'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela de avaliações"
            >
              <Ionicons
                name="close"
                size={22}
                color={isDark ? '#e0e0e0' : colors.text.primary}
              />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {query.isLoading ? (
              <Text variant="caption" style={{ color: colors.text.secondary }}>
                Carregando avaliações...
              </Text>
            ) : query.error && !data ? (
              <Alert
                variant="error"
                title="Erro ao carregar avaliações"
                message="Não foi possível carregar as avaliações no momento."
              />
            ) : reviews.length === 0 ? (
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
                <Text variant="caption" style={{ color: colors.text.secondary }}>
                  Ainda sem avaliações publicadas para este{' '}
                  {targetType === 'BARBER' ? 'profissional' : 'serviço'}.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {reviews.map((rev) => (
                  <View
                    key={`${rev.id}-${rev.targetId}`}
                    style={[
                      styles.reviewItem,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <Text variant="body" weight="medium">
                        {rev.author.name}
                      </Text>
                      <StarRating rating={rev.rating} size={14} />
                    </View>
                    {rev.comment ? (
                      <Text variant="caption" style={{ color: colors.text.primary, marginTop: 6 }}>
                        {rev.comment}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '82%',
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    maxHeight: 380,
  },
  emptyCard: {
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  reviewItem: {
    padding: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
