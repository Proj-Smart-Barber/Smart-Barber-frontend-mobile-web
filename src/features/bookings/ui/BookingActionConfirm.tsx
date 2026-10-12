import React, { useState, useMemo } from 'react';
import { View, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text, Button, Badge } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { BookingDto } from '../api/bookings.dto';
import { serverClock } from '../lib/server-clock';
import { bookingOperationEngine } from '../model/booking-operation-engine';
import { useSession } from '@/features/auth';

export type BookingActionType = 'CANCEL' | 'COMPLETE' | 'NO_SHOW';

export interface BookingActionConfirmProps {
  booking: BookingDto;
  actionType: BookingActionType;
  isOpen: boolean;
  scope: 'PERSONAL' | 'UNIT';
  onClose: () => void;
  onSuccess: (updatedBooking: BookingDto) => void;
}

export function BookingActionConfirm({
  booking,
  actionType,
  isOpen,
  scope,
  onClose,
  onSuccess,
}: BookingActionConfirmProps) {
  const { colors, spacing, radius } = useTheme();
  const { identity } = useSession();

  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validação temporal de fronteiras
  const timeValidation = useMemo(() => {
    let bookingStartMs: number | null = null;
    try {
      const dateStr = typeof booking.date === 'string' ? booking.date.split('T')[0] : '';
      bookingStartMs = Date.parse(`${dateStr}T${booking.startTime}:00`);
    } catch {
      bookingStartMs = null;
    }

    const nowMs = serverClock.now();
    if (nowMs === null) {
      return {
        allowed: false,
        message: 'Aguardando sincronização de horário com o servidor.',
      };
    }
    const diffMinutes = bookingStartMs ? (bookingStartMs - nowMs) / (60 * 1000) : 0;

    if (actionType === 'CANCEL') {
      if (scope === 'PERSONAL') {
        // Pessoal: até exatamente 2 horas (120 minutos) antes
        if (diffMinutes < 120) {
          return {
            allowed: false,
            message: 'O prazo limite para cancelamento pessoal (2 horas antes do início) já expirou.',
          };
        }
      } else {
        // Equipe: antes do início do atendimento
        if (diffMinutes <= 0) {
          return {
            allowed: false,
            message: 'Cancelamento pela equipe só é permitido antes do início do atendimento.',
          };
        }
      }
    }

    if (actionType === 'COMPLETE') {
      // Conclusão manual pela equipe após o início
      if (diffMinutes > 0) {
        return {
          allowed: false,
          message: 'A conclusão do atendimento só pode ser registrada após o horário de início.',
        };
      }
    }

    if (actionType === 'NO_SHOW') {
      // Não comparecimento manual após 15 minutos do início
      if (diffMinutes > -15) {
        return {
          allowed: false,
          message: 'O registro de não comparecimento (No-Show) só é permitido após 15 minutos do horário agendado.',
        };
      }
    }

    return { allowed: true, message: null };
  }, [booking, actionType, scope]);

  const handleExecuteAction = async () => {
    if (!timeValidation.allowed) {
      setErrorMessage(timeValidation.message);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const actorId = identity?.id || booking.customerId || 'current-actor';
    const expectedVersion = booking.version ?? 1;

    try {
      const prepared = await bookingOperationEngine.prepare({
        actorId,
        scope,
        action: actionType,
        bookingId: booking.id,
        expectedVersion,
        reason: reason.trim() || undefined,
      });

      const result = await bookingOperationEngine.submit(prepared);
      if (result.state === 'APPLIED') {
        const updatedBooking = result.resource?.data?.booking ?? booking;
        onSuccess(updatedBooking);
        onClose();
      } else {
        setErrorMessage('Operação não aplicada pelo servidor.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Falha ao executar ação. O agendamento pode ter sido alterado.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const actionTitle = {
    CANCEL: 'Cancelar Agendamento',
    COMPLETE: 'Concluir Atendimento',
    NO_SHOW: 'Registrar Não Comparecimento (No-Show)',
  }[actionType];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4],
        }}
      >
        <LiquidGlassView
          variant="form"
          elevated
          borderRadius={radius.xl}
          style={{ width: '100%', maxWidth: 440 }}
          contentStyle={{ padding: spacing[5], gap: spacing[3] }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="h2" weight="bold" color={colors.text.primary}>
              {actionTitle}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela de confirmação"
              hitSlop={8}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Aviso sobre a ação */}
          <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 18 }}>
            {actionType === 'CANCEL'
              ? 'Tem certeza de que deseja cancelar este agendamento? Esta ação liberará o horário na agenda.'
              : actionType === 'COMPLETE'
              ? 'Confirmar a conclusão física deste atendimento na unidade. Nota: a conclusão do serviço não infere quitação financeira.'
              : 'Registrar que o cliente não compareceu após a tolerância de 15 minutos.'}
          </Text>

          {/* Validação de prazo impeditivo */}
          {!timeValidation.allowed && (
            <View
              style={{
                backgroundColor: colors.surface.default,
                borderRadius: radius.md,
                padding: spacing[3],
                borderLeftWidth: 3,
                borderLeftColor: colors.feedback.error,
              }}
            >
              <Text variant="caption" color={colors.feedback.error}>
                {timeValidation.message}
              </Text>
            </View>
          )}

          {/* Campo opcional de motivo */}
          {timeValidation.allowed && (
            <View style={{ gap: spacing[1] }}>
              <Text variant="caption" color={colors.text.muted}>
                Motivo ou observação (opcional):
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Ex: Cliente solicitou reagendamento por telefone"
                placeholderTextColor={colors.text.muted}
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  padding: spacing[3],
                  color: colors.text.primary,
                  fontSize: 14,
                  minHeight: 64,
                }}
              />
            </View>
          )}

          {errorMessage && (
            <Text variant="caption" color={colors.feedback.error}>
              {errorMessage}
            </Text>
          )}

          {/* Botões de Ação */}
          <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
            <Button
              title="Voltar"
              variant="outline"
              disabled={isLoading}
              onPress={onClose}
              style={{ flex: 1, minHeight: 44 }}
            />
            <Button
              title="Confirmar"
              variant={actionType === 'CANCEL' ? 'destructive' : 'primary'}
              loading={isLoading}
              disabled={isLoading || !timeValidation.allowed}
              onPress={handleExecuteAction}
              style={{ flex: 1, minHeight: 44 }}
            />
          </View>
        </LiquidGlassView>
      </View>
    </Modal>
  );
}
