import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { generateUuidV7 } from '@/shared/lib/uuidv7';
import { useTheme } from '@/shared/theme';
import { Alert, Button, Text } from '@/shared/ui';
import type { TeamMemberDto } from '../api/team.contract';
import { normalizeTeamError } from '../lib/normalize-team-error';
import { useDeactivateMemberMutation } from '../model/use-team';

interface DeactivateMemberModalProps {
  visible: boolean;
  member: TeamMemberDto;
  shopId: string;
  onClose: () => void;
  onSuccess?: () => void;
  onReload?: () => void;
}

export function DeactivateMemberModal({
  visible,
  member,
  shopId,
  onClose,
  onSuccess,
  onReload,
}: DeactivateMemberModalProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBlockingBookings, setHasBlockingBookings] = useState(false);
  const [blockingCount, setBlockingCount] = useState(0);
  const [versionConflict, setVersionConflict] = useState(false);

  const deactivateMutation = useDeactivateMemberMutation();

  const handleClose = () => {
    setErrorMessage(null);
    setHasBlockingBookings(false);
    setBlockingCount(0);
    setVersionConflict(false);
    onClose();
  };

  const handleReload = () => {
    handleClose();
    if (onReload) {
      onReload();
    } else {
      onSuccess?.();
    }
  };

  const handleGoToAgenda = () => {
    handleClose();
    router.push(`/(app)/agenda?barbermanId=${member.userId}` as any);
  };

  const handleConfirm = async () => {
    setErrorMessage(null);
    setHasBlockingBookings(false);
    setBlockingCount(0);
    setVersionConflict(false);

    const idempotencyKey = generateUuidV7();

    try {
      await deactivateMutation.mutateAsync({
        shopId,
        membershipId: member.membershipId,
        expectedVersion: member.version,
        idempotencyKey,
      });

      handleClose();
      onSuccess?.();
    } catch (err: unknown) {
      const normalized = normalizeTeamError(err);

      if (normalized.code === 'MEMBERSHIP_HAS_BOOKINGS') {
        setHasBlockingBookings(true);
        setBlockingCount(normalized.blockingCount);
        const countText =
          normalized.blockingCount > 0
            ? ` (${normalized.blockingCount} agendamento${normalized.blockingCount > 1 ? 's' : ''})`
            : '';
        setErrorMessage(
          `Não é possível desligar o profissional no momento: existem agendamentos futuros ou em andamento vinculados a ele nesta unidade${countText}.`,
        );
      } else if (normalized.code === 'MEMBERSHIP_VERSION_CONFLICT') {
        setVersionConflict(true);
        setErrorMessage(
          'Conflito de concorrência: o vínculo deste profissional foi alterado recentemente. Por favor, recarregue os dados antes de prosseguir.',
        );
      } else if (normalized.code === 'CANNOT_DEACTIVATE_OWNER') {
        setErrorMessage('Não é permitido desligar o proprietário da unidade.');
      } else {
        setErrorMessage(normalized.message);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.subtle,
              borderRadius: radius.xl,
              padding: spacing[5],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text variant="h3" weight="bold" color={colors.text.primary}>
              Desligar Barbeiro
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.text.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing[2], gap: spacing[3] }}
          >
            {hasBlockingBookings ? (
              <View style={{ gap: spacing[3] }}>
                <Alert
                  variant="warning"
                  title="Agendamentos Pendentes"
                  message={
                    errorMessage ??
                    'Existem agendamentos futuros ou em andamento. Acesse a Agenda para remanejar ou cancelar os atendimentos antes de desligar o vínculo.'
                  }
                />
                <Button
                  title="Abrir Agenda do Profissional"
                  variant="primary"
                  onPress={handleGoToAgenda}
                  style={{ marginTop: spacing[2] }}
                />
                <Button
                  title="Voltar"
                  variant="outline"
                  onPress={handleClose}
                />
              </View>
            ) : versionConflict ? (
              <View style={{ gap: spacing[3] }}>
                <Alert
                  variant="error"
                  title="Dados Desatualizados"
                  message={errorMessage!}
                />
                <Button
                  title="Fechar e Recarregar"
                  variant="primary"
                  onPress={handleReload}
                  style={{ marginTop: spacing[2] }}
                />
              </View>
            ) : (
              <View style={{ gap: spacing[3] }}>
                {errorMessage ? (
                  <Alert variant="error" title="Erro" message={errorMessage} />
                ) : null}

                <Text variant="body" color={colors.text.primary}>
                  Deseja realmente desligar{' '}
                  <Text weight="bold" color={colors.text.primary}>
                    {member.name}
                  </Text>{' '}
                  da unidade?
                </Text>

                <View
                  style={[
                    styles.warningCard,
                    {
                      backgroundColor: colors.background.card,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                      padding: spacing[3],
                    },
                  ]}
                >
                  <Text variant="caption" color={colors.text.secondary}>
                    • O desligamento inativa apenas a atuação nesta barbearia.{'\n'}
                    • A conta pessoal e os agendamentos como cliente continuam preservados.{'\n'}
                    • O retorno à equipe exigirá um novo convite e aceite do profissional.
                  </Text>
                </View>

                <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
                  <Button
                    title="Cancelar"
                    variant="outline"
                    disabled={deactivateMutation.isPending}
                    onPress={handleClose}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Confirmar Desligamento"
                    variant="primary"
                    loading={deactivateMutation.isPending}
                    disabled={deactivateMutation.isPending}
                    onPress={handleConfirm}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  warningCard: {
    borderWidth: 1,
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
