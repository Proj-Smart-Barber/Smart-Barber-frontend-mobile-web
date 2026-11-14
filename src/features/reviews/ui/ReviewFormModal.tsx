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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { TextInput } from '@/shared/ui/TextInput';
import { Alert } from '@/shared/ui/Alert';
import { StarRating } from './StarRating';
import { useCreateReview, useUpdateReview } from '../model/use-reviews';
import type {
  ReviewItemDto,
  ServiceRatingInputDto,
} from '../api/reviews.types';

export interface ReviewBookingServiceContext {
  bookingServiceItemId?: string | null;
  serviceId?: string | null;
  id?: string | null;
  title: string;
}

export interface ReviewFormModalProps {
  visible: boolean;
  bookingId: string;
  barbershopId?: string;
  barbershopName?: string;
  barberId?: string | null;
  barberName?: string | null;
  services?: ReviewBookingServiceContext[];
  existingReview?: ReviewItemDto | null;
  initialRating?: number;
  initialComment?: string;
  expectedVersion?: number;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EMPTY_SERVICES: ReviewBookingServiceContext[] = [];

function getServiceKey(svc: ReviewBookingServiceContext, idx: number): string {
  return svc.bookingServiceItemId || svc.serviceId || svc.id || `svc-${idx}`;
}

export function ReviewFormModal({
  visible,
  bookingId,
  barbershopId,
  barbershopName,
  barberId,
  barberName,
  services = EMPTY_SERVICES,
  existingReview,
  initialRating = 5,
  initialComment = '',
  expectedVersion,
  isEditing = false,
  onClose,
  onSuccess,
}: ReviewFormModalProps) {
  const { colors, radius } = useTheme();
  const [rating, setRating] = useState<number>(initialRating);
  const [barberRating, setBarberRating] = useState<number>(0);
  const [serviceRatingsMap, setServiceRatingsMap] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<string>(initialComment);
  const [platformRating, setPlatformRating] = useState<number>(0);
  const [platformComment, setPlatformComment] = useState<string>('');
  const [showPlatformCommentInput, setShowPlatformCommentInput] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const currentBookingIdRef = React.useRef<string>(bookingId);
  const baseVersionRef = React.useRef<number | undefined>(expectedVersion);
  const servicesRef = React.useRef<ReviewBookingServiceContext[]>(services);
  servicesRef.current = services;
  const servicesKey = services
    .map((svc, idx) => `${getServiceKey(svc, idx)}:${svc.title}`)
    .join('|');

  const syncFromProps = React.useCallback(() => {
    const currentServices = servicesRef.current;
    const items = existingReview?.items ?? [];
    const shopItem = items.find((i) => i.targetType === 'BARBERSHOP');
    const barberItem = items.find((i) => i.targetType === 'BARBER');

    const initialServiceMap: Record<string, number> = {};
    currentServices.forEach((svc, idx) => {
      const key = getServiceKey(svc, idx);
      const matched = items.find(
        (i) =>
          i.targetType === 'SERVICE' &&
          ((svc.bookingServiceItemId &&
            i.bookingServiceItemId === svc.bookingServiceItemId) ||
            ((svc.serviceId || svc.id) &&
              i.targetId === (svc.serviceId || svc.id))),
      );
      if (matched) {
        initialServiceMap[key] = matched.rating;
      }
    });

    setRating(shopItem?.rating ?? initialRating);
    setBarberRating(barberItem?.rating ?? 0);
    setServiceRatingsMap(initialServiceMap);
    setComment(initialComment || '');
    setPlatformRating(existingReview?.platformFeedback?.rating ?? 0);
    setPlatformComment(existingReview?.platformFeedback?.comment ?? '');
    setShowPlatformCommentInput(Boolean(existingReview?.platformFeedback?.comment));
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [existingReview, initialRating, initialComment, servicesKey]);

  // Sincroniza estado local e versão-base apenas na abertura ou troca de booking (A05)
  useEffect(() => {
    const bookingChanged = currentBookingIdRef.current !== bookingId;
    if (bookingChanged) {
      currentBookingIdRef.current = bookingId;
      setIsDirty(false);
      baseVersionRef.current = expectedVersion;
      syncFromProps();
      return;
    }

    if (visible && !isDirty) {
      baseVersionRef.current = expectedVersion;
      syncFromProps();
    }
  }, [visible, bookingId, expectedVersion, isDirty, syncFromProps]);

  const createMutation = useCreateReview(() => {
    setIsDirty(false);
    setSuccessMessage('Avaliação enviada com sucesso.');
    onSuccess?.();
    onClose();
  });

  const updateMutation = useUpdateReview(() => {
    setIsDirty(false);
    setSuccessMessage('Alterações salvas com sucesso.');
    onSuccess?.();
    onClose();
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (rating < 1 || rating > 5) {
      setErrorMessage('Por favor, selecione uma nota de 1 a 5 estrelas para a barbearia.');
      return;
    }

    if (comment.length > 1000) {
      setErrorMessage('O comentário não pode ultrapassar 1.000 caracteres.');
      return;
    }

    if (platformComment.length > 500) {
      setErrorMessage('O feedback sobre o Smart Barber não pode ultrapassar 500 caracteres.');
      return;
    }

    const resolvedServiceRatings: ServiceRatingInputDto[] = [];
    services.forEach((svc, idx) => {
      const key = getServiceKey(svc, idx);
      const svcRating = serviceRatingsMap[key] ?? 0;
      if (svcRating >= 1 && svcRating <= 5) {
        resolvedServiceRatings.push({
          bookingServiceItemId: svc.bookingServiceItemId ?? null,
          serviceId: svc.serviceId ?? svc.id ?? null,
          rating: svcRating,
        });
      }
    });

    const trimmedPlatformComment = platformComment.trim();
    const hasPlatformFeedback = platformRating >= 1 || trimmedPlatformComment.length > 0;
    const platformFeedbackPayload = hasPlatformFeedback
      ? {
          rating: platformRating >= 1 ? platformRating : null,
          comment: trimmedPlatformComment.length > 0 ? trimmedPlatformComment : null,
        }
      : isEditing && existingReview?.platformFeedback
        ? null
        : undefined;

    try {
      const commentPayload = comment.trim().length > 0 ? comment.trim() : undefined;
      const hasMultiTargetPayload =
        barberRating >= 1 ||
        resolvedServiceRatings.length > 0 ||
        platformFeedbackPayload !== undefined ||
        Boolean(barberId) ||
        services.length > 0 ||
        Boolean(existingReview?.items && existingReview.items.length > 0);
      const shopScope = barbershopId ? { barbershopId } : {};

      if (isEditing) {
        const versionToSubmit =
          (isDirty ? (baseVersionRef.current ?? expectedVersion) : expectedVersion) ?? 1;
        const editPayload = hasMultiTargetPayload
          ? {
              rating,
              barbershopRating: rating,
              ...(barberRating >= 1
                ? { ...(barberId ? { barberId } : {}), barberRating }
                : {}),
              serviceRatings: resolvedServiceRatings,
              comment: commentPayload,
              ...(platformFeedbackPayload !== undefined
                ? { platformFeedback: platformFeedbackPayload }
                : {}),
              expectedVersion: versionToSubmit,
            }
          : {
              rating,
              comment: commentPayload,
              expectedVersion: versionToSubmit,
            };

        await updateMutation.mutateAsync({
          bookingId,
          ...shopScope,
          data: editPayload,
        });
      } else {
        const createPayload = hasMultiTargetPayload
          ? {
              rating,
              barbershopRating: rating,
              ...(barberRating >= 1
                ? { ...(barberId ? { barberId } : {}), barberRating }
                : {}),
              ...(resolvedServiceRatings.length > 0
                ? { serviceRatings: resolvedServiceRatings }
                : {}),
              comment: commentPayload,
              ...(platformFeedbackPayload !== undefined &&
              platformFeedbackPayload !== null
                ? { platformFeedback: platformFeedbackPayload }
                : {}),
            }
          : {
              rating,
              comment: commentPayload,
            };

        await createMutation.mutateAsync({
          bookingId,
          ...shopScope,
          data: createPayload,
        });
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string; status?: number };
      if (errObj?.message?.includes('Conflito de versão') || errObj?.status === 409) {
        setErrorMessage(
          'Esta avaliação foi modificada remotamente (conflito de versão). Atualize os dados para revisar as alterações recentes.',
        );
      } else {
        setErrorMessage(
          errObj?.message || 'Falha ao registrar avaliação. Tente novamente mais tarde.',
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
                <View style={{ flex: 1 }}>
                  <Text variant="h3" weight="bold">
                    {isEditing ? 'Editar Avaliação' : 'Avaliar Atendimento'}
                  </Text>
                  {barbershopName ? (
                    <Text variant="caption" style={{ color: colors.text.secondary }}>
                      {barbershopName}
                    </Text>
                  ) : null}
                </View>
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

              <ScrollView
                style={styles.scrollBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. Nota geral da barbearia */}
                <View
                  style={[
                    styles.targetCard,
                    {
                      backgroundColor: colors.surface.input,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text variant="body" weight="bold">
                    {barbershopName ? `Barbearia (${barbershopName})` : 'Barbearia'}
                  </Text>
                  <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 8 }}>
                    Nota pública obrigatória para o estabelecimento (1 a 5 estrelas)
                  </Text>
                  <StarRating
                    rating={rating}
                    interactive
                    size={30}
                    onRatingChange={(newRating) => {
                      setIsDirty(true);
                      setRating(newRating);
                      if (errorMessage) setErrorMessage(null);
                    }}
                  />
                </View>

                {/* 2. Nota do profissional */}
                {(barberId || barberName) && (
                  <View
                    style={[
                      styles.targetCard,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="bold">
                          Profissional{barberName ? ` • ${barberName}` : ''}
                        </Text>
                        <Text variant="caption" style={{ color: colors.text.secondary }}>
                          Nota pública do atendimento individual (opcional)
                        </Text>
                      </View>
                      {barberRating > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setIsDirty(true);
                            setBarberRating(0);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Limpar nota do profissional"
                        >
                          <Text variant="caption" style={{ color: colors.text.secondary }}>
                            Limpar
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={{ marginTop: 8 }}>
                      <StarRating
                        rating={barberRating}
                        interactive
                        size={26}
                        onRatingChange={(newRating) => {
                          setIsDirty(true);
                          setBarberRating(newRating);
                        }}
                      />
                    </View>
                  </View>
                )}

                {/* 3. Notas individuais dos serviços contratados */}
                {services.length > 0 && (
                  <View
                    style={[
                      styles.targetCard,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Text variant="body" weight="bold">
                      Serviços realizados
                    </Text>
                    <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 8 }}>
                      Avalie cada serviço separadamente (opcional)
                    </Text>
                    <View style={{ gap: 10 }}>
                      {services.map((svc, idx) => {
                        const key = getServiceKey(svc, idx);
                        const currentSvcRating = serviceRatingsMap[key] ?? 0;
                        return (
                          <View
                            key={key}
                            style={[
                              styles.serviceRow,
                              { borderTopColor: colors.border.subtle },
                            ]}
                          >
                            <View style={styles.rowBetween}>
                              <Text variant="caption" weight="medium" style={{ flex: 1 }}>
                                {svc.title}
                              </Text>
                              {currentSvcRating > 0 && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setIsDirty(true);
                                    setServiceRatingsMap((prev) => {
                                      const next = { ...prev };
                                      delete next[key];
                                      return next;
                                    });
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Limpar nota do serviço ${svc.title}`}
                                >
                                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                                    Limpar
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            <View style={{ marginTop: 4 }}>
                              <StarRating
                                rating={currentSvcRating}
                                interactive
                                size={22}
                                onRatingChange={(newRating) => {
                                  setIsDirty(true);
                                  setServiceRatingsMap((prev) => ({
                                    ...prev,
                                    [key]: newRating,
                                  }));
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 4. Comentário público opcional */}
                <View style={styles.commentSection}>
                  <View style={styles.commentLabelRow}>
                    <Text variant="caption" weight="medium" style={{ color: colors.text.primary }}>
                      Comentário público sobre a experiência (opcional)
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
                  <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 6 }}>
                    Exibido publicamente nas avaliações da barbearia, do profissional e dos serviços avaliados.
                  </Text>

                  <TextInput
                    value={comment}
                    onChangeText={(text) => {
                      setIsDirty(true);
                      setComment(text);
                    }}
                    placeholder="Conte como foi o atendimento da barbearia, do profissional e dos serviços..."
                    multiline
                    numberOfLines={3}
                    maxLength={1000}
                    style={styles.textArea}
                  />
                </View>

                {/* 5. Feedback privado da plataforma Smart Barber */}
                <View
                  style={[
                    styles.targetCard,
                    {
                      backgroundColor: colors.surface.input,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text variant="caption" weight="bold" style={{ color: colors.text.primary }}>
                    Feedback privado sobre o app Smart Barber (opcional)
                  </Text>
                  <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 8 }}>
                    Privado: enviado apenas para a equipe Smart Barber e não entra na nota pública nem no ranking.
                  </Text>
                  {showPlatformCommentInput || platformRating > 0 || platformComment.length > 0 ? (
                    <>
                      <StarRating
                        rating={platformRating}
                        interactive
                        size={22}
                        onRatingChange={(newRating) => {
                          setIsDirty(true);
                          setPlatformRating(newRating);
                        }}
                      />
                      <TextInput
                        value={platformComment}
                        onChangeText={(text) => {
                          setIsDirty(true);
                          setPlatformComment(text);
                        }}
                        placeholder="Sugestão ou problema ao usar o aplicativo Smart Barber..."
                        multiline
                        numberOfLines={2}
                        maxLength={500}
                        style={[styles.textArea, { minHeight: 68, marginTop: 8 }]}
                      />
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowPlatformCommentInput(true)}
                      accessibilityRole="button"
                      style={{ paddingVertical: 6 }}
                    >
                      <Text variant="caption" weight="medium" style={{ color: colors.text.primary }}>
                        Avaliar o app Smart Barber
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>

              {errorMessage ? (
                <Alert
                  variant="error"
                  message={errorMessage}
                  style={{ marginTop: 10 }}
                />
              ) : null}

              {successMessage ? (
                <Alert
                  variant="success"
                  message={successMessage}
                  style={{ marginTop: 10 }}
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
    maxWidth: 500,
    maxHeight: '92%',
  },
  modalCard: {
    width: '100%',
    maxHeight: '100%',
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    maxHeight: 460,
  },
  targetCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  serviceRow: {
    paddingTop: 8,
    borderTopWidth: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  commentSection: {
    marginVertical: 8,
  },
  commentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
});
