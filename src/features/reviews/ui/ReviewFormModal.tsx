import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { TextInput } from '@/shared/ui/TextInput';
import { Alert } from '@/shared/ui/Alert';
import { StarRating } from './StarRating';
import { useCreateReview, useUpdateReview } from '../model/use-reviews';

export interface ReviewFormModalProps {
  visible: boolean;
  bookingId: string;
  initialRating?: number;
  initialComment?: string;
  expectedVersion?: number;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReviewFormModal({
  visible,
  bookingId,
  initialRating = 5,
  initialComment = '',
  expectedVersion,
  isEditing = false,
  onClose,
  onSuccess,
}: ReviewFormModalProps) {
  const { colors, radius, spacing } = useTheme();
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState<string>(initialComment);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const currentBookingIdRef = React.useRef<string>(bookingId);
  const baseVersionRef = React.useRef<number | undefined>(expectedVersion);

  // Sincroniza estado local e versão-base apenas na abertura ou troca de booking (A05)
  useEffect(() => {
    const bookingChanged = currentBookingIdRef.current !== bookingId;
    if (bookingChanged) {
      currentBookingIdRef.current = bookingId;
      setIsDirty(false);
      baseVersionRef.current = expectedVersion;
      setRating(initialRating);
      setComment(initialComment || '');
      setErrorMessage(null);
      return;
    }

    if (visible && !isDirty) {
      baseVersionRef.current = expectedVersion;
      setRating(initialRating);
      setComment(initialComment || '');
      setErrorMessage(null);
    }
  }, [visible, bookingId, initialRating, initialComment, expectedVersion, isDirty]);

  const createMutation = useCreateReview(() => {
    setIsDirty(false);
    onSuccess?.();
    onClose();
  });

  const updateMutation = useUpdateReview(() => {
    setIsDirty(false);
    onSuccess?.();
    onClose();
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (rating < 1 || rating > 5) {
      setErrorMessage('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    if (comment.length > 1000) {
      setErrorMessage('O comentário não pode ultrapassar 1.000 caracteres.');
      return;
    }

    try {
      const commentPayload = comment.trim().length > 0 ? comment.trim() : undefined;
      if (isEditing) {
        // Envia a versão-base sobre a qual o rascunho foi digitado (A05)
        const versionToSubmit =
          (isDirty ? (baseVersionRef.current ?? expectedVersion) : expectedVersion) ?? 1;
        await updateMutation.mutateAsync({
          bookingId,
          data: {
            rating,
            comment: commentPayload,
            expectedVersion: versionToSubmit,
          },
        });
      } else {
        await createMutation.mutateAsync({
          bookingId,
          data: { rating, comment: commentPayload },
        });
      }
    } catch (err: any) {
      if (err?.message?.includes('Conflito de versão') || err?.status === 409) {
        setErrorMessage(
          'Esta avaliação foi modificada remotamente (conflito de versão). Atualize os dados para revisar as alterações recentes.',
        );
      } else {
        setErrorMessage(
          err?.message || 'Falha ao registrar avaliação. Tente novamente mais tarde.',
        );
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
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
              {/* Header */}
              <View style={styles.header}>
                <Text variant="h3" weight="bold">
                  {isEditing ? 'Editar Avaliação' : 'Avaliar Atendimento'}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar formulário de avaliação"
                >
                  <Ionicons name="close" size={22} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Seletor de Estrelas */}
              <View style={styles.ratingSection}>
                <Text variant="body" weight="medium" style={{ marginBottom: 8 }}>
                  Sua nota de 1 a 5 estrelas:
                </Text>
                <StarRating
                  rating={rating}
                  interactive
                  size={32}
                  onRatingChange={(newRating) => {
                    setIsDirty(true);
                    setRating(newRating);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </View>

              {/* Comentário Opcional */}
              <View style={styles.commentSection}>
                <View style={styles.commentLabelRow}>
                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                    Comentário (opcional)
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      color:
                        comment.length > 950
                          ? colors.feedback.error
                          : colors.text.secondary,
                    }}
                  >
                    {comment.length}/1000
                  </Text>
                </View>

                <TextInput
                  value={comment}
                  onChangeText={(text) => {
                    setIsDirty(true);
                    setComment(text);
                  }}
                  placeholder="Conte como foi sua experiência com o corte ou atendimento..."
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  style={styles.textArea}
                />
              </View>

              {errorMessage ? (
                <Alert
                  variant="error"
                  message={errorMessage}
                  style={{ marginBottom: 12 }}
                />
              ) : null}

              {/* Ações */}
              <View style={styles.actionRow}>
                <Button
                  title={isEditing ? 'Salvar Alterações' : 'Enviar Avaliação'}
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={onClose}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
  },
  modalCard: {
    width: '100%',
    padding: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  closeBtn: {
    padding: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  commentSection: {
    marginVertical: 12,
  },
  commentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
});
