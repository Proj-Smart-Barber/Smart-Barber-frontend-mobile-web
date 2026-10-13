import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, Spinner, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { formatDateLabel } from '@/features/agenda';
import type { BookingDetails } from '../api/bookings.contract';
import type { BookingActionResult } from '../model/use-bookings-view-model';

type CancelPhase = 'idle' | 'holding' | 'submitting' | 'success';

interface BookingCancelDialogProps {
  visible: boolean;
  booking: BookingDetails | null;
  onConfirm: () => Promise<BookingActionResult>;
  onClose: () => void;
}

const HOLD_DURATION_MS = 1000;

export function BookingCancelDialog({
  visible,
  booking,
  onConfirm,
  onClose,
}: BookingCancelDialogProps) {
  const { colors, spacing, radius } = useTheme();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<CancelPhase>('idle');
  const [phase, setPhase] = useState<CancelPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transitionTo = (nextPhase: CancelPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  useEffect(() => {
    if (visible && booking) {
      phaseRef.current = 'idle';
      setPhase('idle');
      setErrorMessage(null);
    }
  }, [visible, booking?.id]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
  );

  const runConfirmation = async () => {
    if (phaseRef.current === 'submitting' || phaseRef.current === 'success') return;

    transitionTo('submitting');
    setErrorMessage(null);

    try {
      const result = await onConfirm();
      if (!result.ok) {
        setErrorMessage(result.message ?? 'Não foi possível cancelar o atendimento.');
        transitionTo('idle');
        return;
      }

      transitionTo('success');
      closeTimer.current = setTimeout(onClose, 900);
    } catch {
      setErrorMessage('Não foi possível cancelar o atendimento. Tente novamente.');
      transitionTo('idle');
    }
  };

  const handleHoldStart = () => {
    if (phaseRef.current !== 'idle') return;

    setErrorMessage(null);
    transitionTo('holding');
  };

  const handleHoldEnd = () => {
    if (phaseRef.current !== 'holding') return;

    transitionTo('idle');
  };

  const handleClose = () => {
    if (phaseRef.current === 'submitting') return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onClose();
  };

  if (!booking) return null;

  const serviceLabel = booking.services.map((service) => service.title).join(', ');
  const isBusy = phase === 'submitting' || phase === 'success';
  const statusColor = phase === 'success' ? colors.feedback.successForeground : colors.feedback.errorForeground;
  const statusBackground = phase === 'success' ? colors.feedback.successBackground : colors.feedback.errorBackground;
  const statusBorder = phase === 'success' ? colors.feedback.successBorder : colors.feedback.errorBorder;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      accessibilityLabel="Confirmar cancelamento do atendimento"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
          backgroundColor: colors.background.overlay,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar confirmação de cancelamento"
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />

        <LiquidGlassView
          variant="form"
          elevated
          style={{ width: '100%', maxWidth: 440 }}
          contentStyle={{ padding: spacing[5], gap: spacing[4] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: phase === 'success' ? colors.feedback.successBackground : colors.feedback.errorBackground,
              }}
            >
              <Ionicons
                name={phase === 'success' ? 'checkmark' : 'close-circle-outline'}
                size={22}
                color={statusColor}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
              <Text variant="h2" color={colors.text.primary} accessibilityRole="header">
                {phase === 'success' ? 'Atendimento cancelado' : 'Cancelar atendimento?'}
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                {booking.customer.name} · {formatDateLabel(booking.date)} · {booking.startTime}–{booking.endTime}
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing[1] }}>
            {serviceLabel ? (
              <Text variant="bodySm" color={colors.text.primary} weight="semibold">
                {serviceLabel}
              </Text>
            ) : null}
            <Text variant="caption" color={colors.text.secondary}>
              O horário será liberado na agenda. Essa ação não pode ser desfeita.
            </Text>
          </View>

          {errorMessage ? (
            <Text variant="caption" color={colors.feedback.error} accessibilityRole="alert">
              {errorMessage}
            </Text>
          ) : null}

          {phase === 'success' ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing[2],
                borderRadius: radius.md,
                backgroundColor: statusBackground,
                borderWidth: 1,
                borderColor: statusBorder,
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color={statusColor} />
              <Text variant="button" color={statusColor}>
                Atendimento cancelado
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing[2] }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Segure para cancelar o atendimento"
                accessibilityHint="Mantenha pressionado por um segundo. Leitores de tela podem usar a ação Confirmar cancelamento."
                accessibilityState={{ disabled: isBusy, busy: phase === 'submitting' }}
                accessibilityActions={[{ name: 'confirmCancel', label: 'Confirmar cancelamento' }]}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === 'confirmCancel') void runConfirmation();
                }}
                delayLongPress={HOLD_DURATION_MS}
                disabled={isBusy}
                onLongPress={() => {
                  void runConfirmation();
                }}
                onPressIn={handleHoldStart}
                onPressOut={handleHoldEnd}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                  paddingHorizontal: spacing[3],
                  paddingBottom: spacing[2],
                  overflow: 'hidden',
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: statusBorder,
                  backgroundColor:
                    phase === 'holding' || pressed ? statusBackground : colors.surface.default,
                  opacity: isBusy ? 0.7 : 1,
                })}
              >
                <View
                  pointerEvents="none"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing[2],
                  }}
                >
                  {phase === 'submitting' ? (
                    <Spinner color={colors.feedback.error} size="small" />
                  ) : (
                    <Ionicons
                      name={phase === 'holding' ? 'hand-left' : 'hand-left-outline'}
                      size={18}
                      color={colors.feedback.error}
                    />
                  )}
                  <Text variant="button" color={colors.feedback.error}>
                    {phase === 'submitting'
                      ? 'Cancelando atendimento…'
                      : phase === 'holding'
                        ? 'Continue segurando…'
                        : 'Segure para cancelar'}
                  </Text>
                </View>
              </Pressable>
              <Text variant="caption" color={colors.text.muted} style={{ textAlign: 'center' }}>
                Mantenha pressionado por 1 segundo para confirmar
              </Text>
            </View>
          )}

          {phase !== 'success' ? (
            <Button
              variant="ghost"
              title="Voltar"
              disabled={phase === 'submitting'}
              onPress={handleClose}
              style={{ minHeight: 44 }}
            />
          ) : null}
        </LiquidGlassView>
      </View>
    </Modal>
  );
}
