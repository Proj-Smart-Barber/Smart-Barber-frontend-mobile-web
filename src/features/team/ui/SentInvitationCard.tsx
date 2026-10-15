import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateUuidV7 } from '@/shared/lib/uuidv7';
import { LiquidGlassView } from '@/shared/navigation';
import { useTheme } from '@/shared/theme';
import { Badge, Button, Text, useToast } from '@/shared/ui';
import type { BarbershopInvitationDto } from '../api/team.contract';
import { normalizeTeamError } from '../lib/normalize-team-error';
import { useResendInvitationMutation, useRevokeInvitationMutation } from '../model/use-team';

interface SentInvitationCardProps {
  invitation: BarbershopInvitationDto;
  shopId: string;
}

export function SentInvitationCard({ invitation, shopId }: SentInvitationCardProps) {
  const { colors, spacing, radius } = useTheme();
  const { showToast } = useToast();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const resendMutation = useResendInvitationMutation();
  const revokeMutation = useRevokeInvitationMutation();

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const isPending = invitation.status === 'PENDING';

  const statusTone =
    invitation.status === 'PENDING'
      ? 'warning'
      : invitation.status === 'ACCEPTED'
      ? 'success'
      : invitation.status === 'DECLINED'
      ? 'error'
      : 'neutral';

  const statusLabel =
    invitation.status === 'PENDING'
      ? 'Pendente'
      : invitation.status === 'ACCEPTED'
      ? 'Aceito'
      : invitation.status === 'DECLINED'
      ? 'Recusado'
      : 'Revogado';

  const expiresDateStr = (() => {
    try {
      const d = new Date(invitation.expiresAt);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  })();

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;
    const idempotencyKey = generateUuidV7();
    try {
      await resendMutation.mutateAsync({
        shopId,
        invitationId: invitation.id,
        idempotencyKey,
      });
      setCooldownSeconds(60);
      showToast('Convite reenviado com sucesso!', 'success');
    } catch (err: unknown) {
      const normalized = normalizeTeamError(err);
      if (normalized.code === 'RESEND_COOLDOWN') {
        const retryAfter = normalized.retryAfterSeconds ?? 60;
        setCooldownSeconds(retryAfter);
        showToast(`Aguarde ${retryAfter} segundos antes de reenviar este convite.`, 'info');
      } else {
        showToast(normalized.message, 'error');
      }
    }
  };

  const handleRevokeConfirm = () => {
    const doRevoke = async () => {
      const idempotencyKey = generateUuidV7();
      try {
        await revokeMutation.mutateAsync({
          shopId,
          invitationId: invitation.id,
          idempotencyKey,
        });
        showToast('Convite revogado com sucesso.', 'success');
      } catch (err: unknown) {
        const normalized = normalizeTeamError(err);
        showToast(normalized.message, 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza de que deseja revogar este convite? O link de ativação deixará de funcionar.')) {
        void doRevoke();
      }
    } else {
      Alert.alert(
        'Revogar Convite',
        'Tem certeza de que deseja revogar este convite? O link de ativação deixará de funcionar.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Revogar', style: 'destructive', onPress: () => void doRevoke() },
        ],
      );
    }
  };

  return (
    <LiquidGlassView
      variant="card"
      elevated
      style={{
        width: '100%',
        marginVertical: spacing[1],
      }}
      contentStyle={{
        padding: spacing[4],
      }}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.avatar,
            {
              borderRadius: radius.full,
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.headerRow}>
            <Text
              variant="body"
              weight="bold"
              color={colors.text.primary}
              numberOfLines={1}
              style={{ flex: 1, marginRight: 8 }}
            >
              {invitation.email}
            </Text>
            <Badge label={statusLabel} tone={statusTone} />
          </View>

          {expiresDateStr ? (
            <Text variant="caption" color={colors.text.muted}>
              Expira em: {expiresDateStr}
            </Text>
          ) : null}

          {isPending && (
            <View style={styles.actionsRow}>
              <Button
                title={cooldownSeconds > 0 ? `Reenviar (${cooldownSeconds}s)` : 'Reenviar'}
                variant="outline"
                disabled={cooldownSeconds > 0 || resendMutation.isPending}
                loading={resendMutation.isPending}
                onPress={handleResend}
                style={{ minHeight: 36, paddingHorizontal: spacing[3] }}
              />
              <Button
                title="Revogar"
                variant="ghost"
                disabled={revokeMutation.isPending}
                loading={revokeMutation.isPending}
                onPress={handleRevokeConfirm}
                style={{ minHeight: 36, paddingHorizontal: spacing[3], marginLeft: 8 }}
              />
            </View>
          )}
        </View>
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});
