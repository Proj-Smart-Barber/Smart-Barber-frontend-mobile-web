import React, { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { Alert } from '../../../shared/ui/Alert';
import { StarRating } from './StarRating';
import { useCreateReview, useUpdateReview } from '../model/use-reviews';
const EMPTY_SERVICES = [];
function getServiceKey(svc, idx) {
    return svc.bookingServiceItemId || svc.serviceId || svc.id || `svc-${idx}`;
}
export function ReviewFormModal({ visible, bookingId, barbershopId, barbershopName, barberId, barberName, services = EMPTY_SERVICES, existingReview, initialRating = 5, initialComment = '', expectedVersion, isEditing = false, onClose, onSuccess, }) {
    const { colors, radius } = useTheme();
    const [rating, setRating] = useState(initialRating);
    const [barberRating, setBarberRating] = useState(0);
    const [serviceRatingsMap, setServiceRatingsMap] = useState({});
    const [comment, setComment] = useState(initialComment);
    const [platformRating, setPlatformRating] = useState(0);
    const [platformComment, setPlatformComment] = useState('');
    const [showPlatformCommentInput, setShowPlatformCommentInput] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const currentBookingIdRef = React.useRef(bookingId);
    const baseVersionRef = React.useRef(expectedVersion);
    const servicesRef = React.useRef(services);
    servicesRef.current = services;
    const servicesKey = services
        .map((svc, idx) => `${getServiceKey(svc, idx)}:${svc.title}`)
        .join('|');
    const syncFromProps = React.useCallback(() => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const currentServices = servicesRef.current;
        const items = (_a = existingReview === null || existingReview === void 0 ? void 0 : existingReview.items) !== null && _a !== void 0 ? _a : [];
        const shopItem = items.find((i) => i.targetType === 'BARBERSHOP');
        const barberItem = items.find((i) => i.targetType === 'BARBER');
        const initialServiceMap = {};
        currentServices.forEach((svc, idx) => {
            const key = getServiceKey(svc, idx);
            const matched = items.find((i) => i.targetType === 'SERVICE' &&
                ((svc.bookingServiceItemId &&
                    i.bookingServiceItemId === svc.bookingServiceItemId) ||
                    ((svc.serviceId || svc.id) &&
                        i.targetId === (svc.serviceId || svc.id))));
            if (matched) {
                initialServiceMap[key] = matched.rating;
            }
        });
        setRating((_b = shopItem === null || shopItem === void 0 ? void 0 : shopItem.rating) !== null && _b !== void 0 ? _b : initialRating);
        setBarberRating((_c = barberItem === null || barberItem === void 0 ? void 0 : barberItem.rating) !== null && _c !== void 0 ? _c : 0);
        setServiceRatingsMap(initialServiceMap);
        setComment(initialComment || '');
        setPlatformRating((_e = (_d = existingReview === null || existingReview === void 0 ? void 0 : existingReview.platformFeedback) === null || _d === void 0 ? void 0 : _d.rating) !== null && _e !== void 0 ? _e : 0);
        setPlatformComment((_g = (_f = existingReview === null || existingReview === void 0 ? void 0 : existingReview.platformFeedback) === null || _f === void 0 ? void 0 : _f.comment) !== null && _g !== void 0 ? _g : '');
        setShowPlatformCommentInput(Boolean((_h = existingReview === null || existingReview === void 0 ? void 0 : existingReview.platformFeedback) === null || _h === void 0 ? void 0 : _h.comment));
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
        onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess();
        onClose();
    });
    const updateMutation = useUpdateReview(() => {
        setIsDirty(false);
        setSuccessMessage('Alterações salvas com sucesso.');
        onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess();
        onClose();
    });
    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const handleSubmit = async () => {
        var _a, _b, _c;
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
        const resolvedServiceRatings = [];
        services.forEach((svc, idx) => {
            var _a, _b, _c, _d;
            const key = getServiceKey(svc, idx);
            const svcRating = (_a = serviceRatingsMap[key]) !== null && _a !== void 0 ? _a : 0;
            if (svcRating >= 1 && svcRating <= 5) {
                resolvedServiceRatings.push({
                    bookingServiceItemId: (_b = svc.bookingServiceItemId) !== null && _b !== void 0 ? _b : null,
                    serviceId: (_d = (_c = svc.serviceId) !== null && _c !== void 0 ? _c : svc.id) !== null && _d !== void 0 ? _d : null,
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
            : isEditing && (existingReview === null || existingReview === void 0 ? void 0 : existingReview.platformFeedback)
                ? null
                : undefined;
        try {
            const commentPayload = comment.trim().length > 0 ? comment.trim() : undefined;
            const hasMultiTargetPayload = barberRating >= 1 ||
                resolvedServiceRatings.length > 0 ||
                platformFeedbackPayload !== undefined ||
                Boolean(barberId) ||
                services.length > 0 ||
                Boolean((existingReview === null || existingReview === void 0 ? void 0 : existingReview.items) && existingReview.items.length > 0);
            const shopScope = barbershopId ? { barbershopId } : {};
            if (isEditing) {
                const versionToSubmit = (_b = (isDirty ? ((_a = baseVersionRef.current) !== null && _a !== void 0 ? _a : expectedVersion) : expectedVersion)) !== null && _b !== void 0 ? _b : 1;
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
            }
            else {
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
        }
        catch (err) {
            const errObj = err;
            if (((_c = errObj === null || errObj === void 0 ? void 0 : errObj.message) === null || _c === void 0 ? void 0 : _c.includes('Conflito de versão')) || (errObj === null || errObj === void 0 ? void 0 : errObj.status) === 409) {
                setErrorMessage('Esta avaliação foi modificada remotamente (conflito de versão). Atualize os dados para revisar as alterações recentes.');
            }
            else {
                setErrorMessage((errObj === null || errObj === void 0 ? void 0 : errObj.message) || 'Falha ao registrar avaliação. Tente novamente mais tarde.');
            }
        }
    };
    return (<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardContainer}>
            <View style={[
            styles.modalCard,
            {
                backgroundColor: colors.surface.elevated,
                borderColor: colors.border.subtle,
                borderRadius: radius.lg,
            },
        ]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" weight="bold">
                    {isEditing ? 'Editar Avaliação' : 'Avaliar Atendimento'}
                  </Text>
                  {barbershopName ? (<Text variant="caption" style={{ color: colors.text.secondary }}>
                      {barbershopName}
                    </Text>) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isSubmitting} accessibilityRole="button" accessibilityLabel="Fechar formulário de avaliação">
                  <Ionicons name="close" size={22} color={colors.text.secondary}/>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. Nota geral da barbearia */}
                <View style={[
            styles.targetCard,
            {
                backgroundColor: colors.surface.input,
                borderColor: colors.border.subtle,
                borderRadius: radius.md,
            },
        ]}>
                  <Text variant="body" weight="bold">
                    {barbershopName ? `Barbearia (${barbershopName})` : 'Barbearia'}
                  </Text>
                  <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 8 }}>
                    Nota pública obrigatória para o estabelecimento (1 a 5 estrelas)
                  </Text>
                  <StarRating rating={rating} interactive size={30} onRatingChange={(newRating) => {
            setIsDirty(true);
            setRating(newRating);
            if (errorMessage)
                setErrorMessage(null);
        }}/>
                </View>

                {/* 2. Nota do profissional */}
                {(barberId || barberName) && (<View style={[
                styles.targetCard,
                {
                    backgroundColor: colors.surface.input,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                },
            ]}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body" weight="bold">
                          Profissional{barberName ? ` • ${barberName}` : ''}
                        </Text>
                        <Text variant="caption" style={{ color: colors.text.secondary }}>
                          Nota pública do atendimento individual (opcional)
                        </Text>
                      </View>
                      {barberRating > 0 && (<TouchableOpacity onPress={() => {
                    setIsDirty(true);
                    setBarberRating(0);
                }} accessibilityRole="button" accessibilityLabel="Limpar nota do profissional">
                          <Text variant="caption" style={{ color: colors.text.secondary }}>
                            Limpar
                          </Text>
                        </TouchableOpacity>)}
                    </View>
                    <View style={{ marginTop: 8 }}>
                      <StarRating rating={barberRating} interactive size={26} onRatingChange={(newRating) => {
                setIsDirty(true);
                setBarberRating(newRating);
            }}/>
                    </View>
                  </View>)}

                {/* 3. Notas individuais dos serviços contratados */}
                {services.length > 0 && (<View style={[
                styles.targetCard,
                {
                    backgroundColor: colors.surface.input,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                },
            ]}>
                    <Text variant="body" weight="bold">
                      Serviços realizados
                    </Text>
                    <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 8 }}>
                      Avalie cada serviço separadamente (opcional)
                    </Text>
                    <View style={{ gap: 10 }}>
                      {services.map((svc, idx) => {
                var _a;
                const key = getServiceKey(svc, idx);
                const currentSvcRating = (_a = serviceRatingsMap[key]) !== null && _a !== void 0 ? _a : 0;
                return (<View key={key} style={[
                        styles.serviceRow,
                        { borderTopColor: colors.border.subtle },
                    ]}>
                            <View style={styles.rowBetween}>
                              <Text variant="caption" weight="medium" style={{ flex: 1 }}>
                                {svc.title}
                              </Text>
                              {currentSvcRating > 0 && (<TouchableOpacity onPress={() => {
                            setIsDirty(true);
                            setServiceRatingsMap((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                            });
                        }} accessibilityRole="button" accessibilityLabel={`Limpar nota do serviço ${svc.title}`}>
                                  <Text variant="caption" style={{ color: colors.text.secondary }}>
                                    Limpar
                                  </Text>
                                </TouchableOpacity>)}
                            </View>
                            <View style={{ marginTop: 4 }}>
                              <StarRating rating={currentSvcRating} interactive size={22} onRatingChange={(newRating) => {
                        setIsDirty(true);
                        setServiceRatingsMap((prev) => ({
                            ...prev,
                            [key]: newRating,
                        }));
                    }}/>
                            </View>
                          </View>);
            })}
                    </View>
                  </View>)}

                {/* 4. Comentário público opcional */}
                <View style={styles.commentSection}>
                  <View style={styles.commentLabelRow}>
                    <Text variant="caption" weight="medium" style={{ color: colors.text.primary }}>
                      Comentário público sobre a experiência (opcional)
                    </Text>
                    <Text variant="caption" style={{
            color: comment.length > 950
                ? colors.feedback.error
                : colors.text.secondary,
        }}>
                      {comment.length}/1000
                    </Text>
                  </View>
                  <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 6 }}>
                    Exibido publicamente nas avaliações da barbearia, do profissional e dos serviços avaliados.
                  </Text>

                  <TextInput value={comment} onChangeText={(text) => {
            setIsDirty(true);
            setComment(text);
        }} placeholder="Conte como foi o atendimento da barbearia, do profissional e dos serviços..." multiline numberOfLines={3} maxLength={1000} style={styles.textArea}/>
                </View>

                {/* 5. Feedback privado da plataforma Smart Barber */}
                <View style={[
            styles.targetCard,
            {
                backgroundColor: colors.surface.input,
                borderColor: colors.border.subtle,
                borderRadius: radius.md,
            },
        ]}>
                  <Text variant="caption" weight="bold" style={{ color: colors.text.primary }}>
                    Feedback privado sobre o app Smart Barber (opcional)
                  </Text>
                  <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: 8 }}>
                    Privado: enviado apenas para a equipe Smart Barber e não entra na nota pública nem no ranking.
                  </Text>
                  {showPlatformCommentInput || platformRating > 0 || platformComment.length > 0 ? (<>
                      <StarRating rating={platformRating} interactive size={22} onRatingChange={(newRating) => {
                setIsDirty(true);
                setPlatformRating(newRating);
            }}/>
                      <TextInput value={platformComment} onChangeText={(text) => {
                setIsDirty(true);
                setPlatformComment(text);
            }} placeholder="Sugestão ou problema ao usar o aplicativo Smart Barber..." multiline numberOfLines={2} maxLength={500} style={[styles.textArea, { minHeight: 68, marginTop: 8 }]}/>
                    </>) : (<TouchableOpacity onPress={() => setShowPlatformCommentInput(true)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
                      <Text variant="caption" weight="medium" style={{ color: colors.text.primary }}>
                        Avaliar o app Smart Barber
                      </Text>
                    </TouchableOpacity>)}
                </View>
              </ScrollView>

              {errorMessage ? (<Alert variant="error" message={errorMessage} style={{ marginTop: 10 }}/>) : null}

              {successMessage ? (<Alert variant="success" message={successMessage} style={{ marginTop: 10 }}/>) : null}

              {/* Ações */}
              <View style={styles.actionRow}>
                <Button title={isEditing ? 'Salvar Alterações' : 'Enviar Avaliação'} onPress={handleSubmit} loading={isSubmitting} disabled={isSubmitting}/>
                <Button title="Cancelar" variant="outline" onPress={onClose} disabled={isSubmitting}/>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>);
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
