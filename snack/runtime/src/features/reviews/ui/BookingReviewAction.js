import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';
import { Button } from '../../../shared/ui/Button';
import { StarRating } from './StarRating';
import { ReviewFormModal, } from './ReviewFormModal';
import { useBookingReview, useDeleteReview } from '../model/use-reviews';
export function BookingReviewAction({ bookingId, status, barbershopId, barbershopName, barbermanId, barbermanName, services = [], onReviewChanged, }) {
    var _a, _b, _c, _d;
    const { colors, radius } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const isCompleted = (status === null || status === void 0 ? void 0 : status.toUpperCase()) === 'COMPLETED';
    const { data, isLoading, error } = useBookingReview(isCompleted ? bookingId : undefined);
    const deleteMutation = useDeleteReview(() => {
        onReviewChanged === null || onReviewChanged === void 0 ? void 0 : onReviewChanged();
    });
    // Somente atendimentos concluídos podem ser avaliados
    if (!isCompleted) {
        return null;
    }
    const existingReview = (_a = data === null || data === void 0 ? void 0 : data.review) !== null && _a !== void 0 ? _a : null;
    const secondaryItems = ((_b = existingReview === null || existingReview === void 0 ? void 0 : existingReview.items) !== null && _b !== void 0 ? _b : []).filter((item) => item.targetType !== 'BARBERSHOP');
    const handleDelete = async () => {
        if (!(existingReview === null || existingReview === void 0 ? void 0 : existingReview.version))
            return;
        setDeleteError(null);
        try {
            await deleteMutation.mutateAsync({
                bookingId,
                barbershopId,
                expectedVersion: existingReview.version,
            });
        }
        catch (err) {
            const errObj = err;
            setDeleteError((errObj === null || errObj === void 0 ? void 0 : errObj.message) || 'Falha ao remover avaliação.');
        }
    };
    return (<View style={styles.container}>
      {isLoading ? (<Text variant="caption" style={{ color: colors.text.secondary }}>
          Carregando avaliação...
        </Text>) : error && !data ? (<Text variant="caption" style={{ color: colors.feedback.error }}>
          Não foi possível carregar sua avaliação agora.
        </Text>) : (existingReview === null || existingReview === void 0 ? void 0 : existingReview.status) === 'HIDDEN_BY_MODERATION' ? (<View style={[
                styles.existingBox,
                {
                    backgroundColor: colors.surface.input,
                    borderColor: colors.feedback.error,
                    borderRadius: radius.md,
                },
            ]}>
          <Text variant="caption" style={{ color: colors.feedback.error }}>
            Esta avaliação foi ocultada pela moderação da plataforma e não está visível publicamente.
          </Text>
        </View>) : existingReview && existingReview.status === 'PUBLISHED' ? (<View style={[
                styles.existingBox,
                {
                    backgroundColor: colors.surface.input,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                },
            ]}>
          <View style={styles.existingHeader}>
            <View>
              <Text variant="caption" weight="medium" style={{ color: colors.text.secondary }}>
                Sua avaliação ({barbershopName || 'Barbearia'})
              </Text>
              <StarRating rating={existingReview.rating} size={16}/>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.textBtn} accessibilityRole="button" accessibilityLabel="Editar avaliação">
                <Text variant="caption" weight="bold" style={{ color: colors.brand.primary }}>
                  Editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDelete} disabled={deleteMutation.isPending} style={styles.textBtn} accessibilityRole="button" accessibilityLabel="Remover avaliação">
                <Text variant="caption" style={{ color: colors.feedback.error }}>
                  Excluir
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {secondaryItems.length > 0 ? (<View style={styles.targetPillsRow}>
              {secondaryItems.map((item) => (<View key={item.id} style={[
                        styles.targetPill,
                        {
                            backgroundColor: colors.surface.elevated,
                            borderColor: colors.border.subtle,
                            borderRadius: radius.sm,
                        },
                    ]}>
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    {item.targetType === 'BARBER' ? 'Profissional' : item.targetLabel}:{' '}
                    {item.rating} ★
                  </Text>
                </View>))}
            </View>) : null}

          {existingReview.comment ? (<Text variant="caption" style={{ color: colors.text.primary, marginTop: 6 }}>
              "{existingReview.comment}"
            </Text>) : null}

          {existingReview.platformFeedback ? (<Text variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
              Feedback privado ao Smart Barber registrado.
            </Text>) : null}

          {deleteError ? (<Text variant="caption" style={{ color: colors.feedback.error, marginTop: 4 }}>
              {deleteError}
            </Text>) : null}
        </View>) : (<Button title="Avaliar Atendimento" variant="secondary" onPress={() => setModalVisible(true)}/>)}

      {/* Modal de Avaliação */}
      <ReviewFormModal visible={modalVisible} bookingId={bookingId} barbershopId={barbershopId} barbershopName={barbershopName} barberId={barbermanId} barberName={barbermanName} services={services} existingReview={existingReview} initialRating={(_c = existingReview === null || existingReview === void 0 ? void 0 : existingReview.rating) !== null && _c !== void 0 ? _c : 5} initialComment={(_d = existingReview === null || existingReview === void 0 ? void 0 : existingReview.comment) !== null && _d !== void 0 ? _d : ''} expectedVersion={existingReview === null || existingReview === void 0 ? void 0 : existingReview.version} isEditing={Boolean(existingReview && existingReview.status === 'PUBLISHED')} onClose={() => setModalVisible(false)} onSuccess={() => {
            onReviewChanged === null || onReviewChanged === void 0 ? void 0 : onReviewChanged();
        }}/>
    </View>);
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
    targetPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    targetPill: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
});
