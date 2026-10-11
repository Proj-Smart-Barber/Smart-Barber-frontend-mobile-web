import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Text, Button, Card, Badge } from '../../../shared/ui';
import type { InvitationDto } from '../api/invitations.dto';
import {
  useInvitationResponse,
  isInvitationExpired,
} from '../model/use-invitation-response';

interface InvitationCardProps {
  invitation: InvitationDto;
  onSuccess?: () => void;
}

export function InvitationCard({ invitation, onSuccess }: InvitationCardProps) {
  const { colors, spacing } = useTheme();
  const {
    isSubmitting,
    isAccepted,
    isDeclined,
    status,
    errorMessage,
    refetchFailed,
    accept,
    decline,
    checkStatus,
  } = useInvitationResponse(invitation.id);

  const expired = isInvitationExpired(invitation.expiresAt);
  const currentStatus = isAccepted
    ? 'ACCEPTED'
    : isDeclined
    ? 'DECLINED'
    : invitation.status;

  const handleAccept = async () => {
    try {
      await accept();
      onSuccess?.();
    } catch {
      // tratado internamente
    }
  };

  const handleDecline = async () => {
    try {
      await decline();
      onSuccess?.();
    } catch {
      // tratado internamente
    }
  };

  const renderBadge = () => {
    if (currentStatus === 'ACCEPTED') {
      return <Badge label="Aceito" tone="success" />;
    }
    if (currentStatus === 'DECLINED') {
      return <Badge label="Recusado" tone="neutral" />;
    }
    if (currentStatus === 'REVOKED') {
      return <Badge label="Revogado" tone="error" />;
    }
    if (expired) {
      return <Badge label="Expirado" tone="warning" />;
    }
    return <Badge label="Pendente" tone="pending" />;
  };

  const canRespond = currentStatus === 'PENDING' && !expired && !isAccepted && !isDeclined;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="subhead" style={{ color: colors.text.primary, fontWeight: '600' }}>
            {invitation.barbershopName || 'Barbearia'}
          </Text>
          <Text variant="caption" style={{ color: colors.text.secondary }}>
            Cargo: {invitation.role === 'BARBERMAN' ? 'Barbeiro' : invitation.role}
          </Text>
        </View>
        {renderBadge()}
      </View>

      <View style={styles.infoRow}>
        <Text variant="caption" style={{ color: colors.text.muted }}>
          Expira em: {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {refetchFailed && (
        <View style={[styles.alertBox, { backgroundColor: colors.feedback.infoBackground }]}>
          <Text variant="caption" style={{ color: colors.feedback.info }}>
            Convite aceito. Não foi possível carregar o acesso automaticamente. Tente atualizar a tela.
          </Text>
        </View>
      )}

      {status === 'uncertain' && (
        <View style={[styles.alertBox, { backgroundColor: colors.feedback.warningBackground }]}>
          <Text variant="caption" style={{ color: colors.feedback.warning }}>
            Ainda não foi possível confirmar o resultado. Verifique o status da solicitação.
          </Text>
          <Button
            title="Verificar Situação"
            variant="outline"
            style={{ marginTop: spacing.sm }}
            onPress={() => checkStatus()}
          />
        </View>
      )}

      {errorMessage && status === 'error' && (
        <View style={[styles.alertBox, { backgroundColor: colors.feedback.errorBackground }]}>
          <Text variant="caption" style={{ color: colors.feedback.error }}>
            {errorMessage}
          </Text>
        </View>
      )}

      {canRespond && (
        <View style={styles.actions}>
          <Button
            title="Aceitar"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleAccept}
            style={styles.actionButton}
          />
          <Button
            title="Recusar"
            variant="ghost"
            disabled={isSubmitting}
            onPress={handleDecline}
            style={styles.actionButton}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  infoRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  alertBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});
