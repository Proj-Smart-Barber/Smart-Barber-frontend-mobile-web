import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../shared/theme';
import { Text, Card, Button, Spinner, Badge } from '../../../shared/ui';
import { useSession } from '../../../features/auth';
import {
  useNotificationsFeed,
  useMarkNotificationRead,
} from '../../../features/notifications/model/notification-queries';
import { useInvitationDetail } from '../../../features/invitations/model/use-invitation-response';
import { InvitationCard } from '../../../features/invitations/ui/InvitationCard';

export default function AccountNotificationDetailScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { identity } = useSession();
  const { notificationId } = useLocalSearchParams<{ notificationId: string }>();

  const hasMarkedReadRef = useRef(false);
  const markReadMutation = useMarkNotificationRead(identity?.id);

  const { data: feedData, isLoading: feedLoading } = useNotificationsFeed(identity?.id);
  const notification = feedData?.notifications?.find((n) => n.id === notificationId);

  // Leitura automática no primeiro render de abertura dos detalhes
  useEffect(() => {
    if (notification && !notification.readAt && !hasMarkedReadRef.current && notificationId) {
      hasMarkedReadRef.current = true;
      markReadMutation.mutate(notificationId);
    }
  }, [notification, notificationId, markReadMutation]);

  // Se houver referência a convite, carrega os detalhes seguros do convite
  const isInvitation =
    notification?.referenceType === 'INVITATION' && Boolean(notification?.referenceId);
  const { data: invitation, isLoading: invitationLoading } = useInvitationDetail(
    isInvitation ? (notification?.referenceId as string) : ''
  );

  if (feedLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  if (!notification) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Text variant="body" style={{ color: colors.feedback.error }}>
          Notificação não encontrada.
        </Text>
        <Button
          title="Voltar"
          variant="outline"
          style={{ marginTop: spacing.md }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.content}>
        <Button
          title="← Voltar para notificações"
          variant="ghost"
          style={styles.backButton}
          onPress={() => router.back()}
        />

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700', flex: 1 }}>
              {notification.title}
            </Text>
            {notification.readAt || hasMarkedReadRef.current ? (
              <Badge label="Lida" tone="neutral" />
            ) : (
              <Badge label="Nova" tone="brand" />
            )}
          </View>

          <Text variant="caption" style={{ color: colors.text.muted, marginTop: 4 }}>
            {new Date(notification.scheduledAt || notification.createdAt || Date.now()).toLocaleDateString(
              'pt-BR',
              { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            )}
          </Text>

          <View style={styles.separator} />

          <Text variant="body" style={{ color: colors.text.primary, lineHeight: 22 }}>
            {notification.message}
          </Text>
        </Card>

        {isInvitation && (
          <View style={{ marginTop: spacing.lg }}>
            <Text variant="subhead" style={{ color: colors.text.primary, marginBottom: spacing.sm, fontWeight: '600' }}>
              Convite Relacionado
            </Text>
            {invitationLoading ? (
              <Spinner size="small" />
            ) : invitation ? (
              <InvitationCard
                invitation={invitation}
                onSuccess={() => {
                  router.push('/(account)/invitations' as any);
                }}
              />
            ) : (
              <Text variant="caption" style={{ color: colors.text.muted }}>
                Os detalhes do convite não estão mais disponíveis ou o convite expirou.
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
