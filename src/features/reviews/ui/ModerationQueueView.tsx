import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/shared/theme';
import { TextInput } from '@/shared/ui/TextInput';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Alert } from '@/shared/ui/Alert';
import { useModerationQueue, useModerateReview } from '../model/use-reviews';
import type { ModerationQueueItemDto } from '../api/reviews.types';
import { StarRating } from './StarRating';

export function ModerationQueueView() {
  const { colors, radius, spacing } = useTheme();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useModerationQueue(page);
  const [selectedReview, setSelectedReview] = useState<ModerationQueueItemDto | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState<'HIDE' | 'RESTORE' | null>(null);

  const moderateMutation = useModerateReview(() => {
    setSelectedReview(null);
    setAdminNote('');
    setActionType(null);
    refetch();
  });

  const handleOpenAction = (item: ModerationQueueItemDto, action: 'HIDE' | 'RESTORE') => {
    setSelectedReview(item);
    setActionType(action);
    setAdminNote('');
  };

  const handleConfirmAction = () => {
    if (!selectedReview || !actionType) return;
    moderateMutation.mutate({
      reviewId: selectedReview.id,
      action: actionType,
      expectedVersion: selectedReview.version,
      note: adminNote.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Carregando fila de moderação...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ marginVertical: spacing.md }}>
        <Alert
          variant="error"
          title="Erro ao carregar fila de moderação"
          message="Apenas operadores com perfil PLATFORM_ADMIN têm acesso a esta área."
        />
        <Button
          title="Tentar novamente"
          variant="outline"
          onPress={() => refetch()}
        />
      </View>
    );
  }

  const items = data?.reviews || [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Moderação de Avaliações
        </Text>
        <Text style={[styles.counter, { color: colors.text.secondary }]}>
          Total: {data?.total ?? items.length}
        </Text>
      </View>

      {items.length === 0 ? (
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
          <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>
            Nenhuma avaliação na fila de moderação no momento.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isHidden = item.status === 'HIDDEN_BY_MODERATION';
            const isDeleted = item.status === 'DELETED_BY_AUTHOR';

            return (
              <View
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.surface.elevated,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <View style={styles.itemHeader}>
                  <StarRating rating={item.rating} size={14} />
                  <Badge
                    label={item.status}
                    tone={isHidden ? 'error' : isDeleted ? 'neutral' : 'success'}
                    size="sm"
                  />
                </View>

                {item.comment ? (
                  <Text style={[styles.commentText, { color: colors.text.primary }]}>
                    {item.comment}
                  </Text>
                ) : (
                  <Text style={[styles.emptyCommentText, { color: colors.text.secondary }]}>
                    Sem comentário escrito
                  </Text>
                )}

                <View
                  style={[
                    styles.itemFooter,
                    { borderTopColor: colors.border.subtle },
                  ]}
                >
                  <Text style={[styles.idText, { color: colors.text.secondary }]}>
                    ID: {item.id.slice(0, 8)}... | v{item.version}
                  </Text>

                  <View style={styles.actionButtonsRow}>
                    {!isHidden && (
                      <TouchableOpacity
                        onPress={() => handleOpenAction(item, 'HIDE')}
                        style={[
                          styles.actionPill,
                          { backgroundColor: colors.feedback.errorBackground, borderColor: colors.feedback.errorBorder },
                        ]}
                      >
                        <Text style={{ color: colors.feedback.error, fontSize: 12, fontWeight: '600' }}>
                          Ocultar
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isHidden && (
                      <TouchableOpacity
                        onPress={() => handleOpenAction(item, 'RESTORE')}
                        style={[
                          styles.actionPill,
                          { backgroundColor: colors.feedback.successBackground, borderColor: colors.feedback.successBorder },
                        ]}
                      >
                        <Text style={{ color: colors.feedback.success, fontSize: 12, fontWeight: '600' }}>
                          Restaurar
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal de confirmação com nota administrativa */}
      <Modal
        visible={Boolean(selectedReview && actionType)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReview(null)}
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
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {actionType === 'HIDE' ? 'Ocultar Avaliação' : 'Restaurar Avaliação'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
              {actionType === 'HIDE'
                ? 'A avaliação deixará de ser exibida publicamente. Uma nota de auditoria é recomendada.'
                : 'A avaliação voltará a ser exibida publicamente e recalculada na média.'}
            </Text>

            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Justificativa administrativa..."
              multiline
              numberOfLines={3}
            />

            {moderateMutation.isError ? (
              <View style={{ marginTop: 8 }}>
                <Alert
                  variant="error"
                  message="Erro ao aplicar moderação. Verifique suas permissões de PLATFORM_ADMIN."
                />
              </View>
            ) : null}

            <View style={styles.modalActionsRow}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setSelectedReview(null)}
                disabled={moderateMutation.isPending}
              />
              <Button
                title={actionType === 'HIDE' ? 'Confirmar Ocultação' : 'Confirmar Restauração'}
                variant={actionType === 'HIDE' ? 'destructive' : 'primary'}
                onPress={handleConfirmAction}
                loading={moderateMutation.isPending}
                disabled={moderateMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  counter: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  itemCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 8,
  },
  emptyCommentText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  idText: {
    fontSize: 11,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
