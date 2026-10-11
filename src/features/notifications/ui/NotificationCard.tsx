import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../shared/theme';
import { Text, Card, Badge } from '../../../shared/ui';
import type { NotificationDto } from '../api/notifications.dto';

interface NotificationCardProps {
  notification: NotificationDto;
}

export function NotificationCard({ notification }: NotificationCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const isUnread = !notification.readAt;

  const handlePress = () => {
    router.push({
      pathname: '/(app)/notifications/[notificationId]' as any,
      params: { notificationId: notification.id },
    });
  };

  return (
    <Pressable onPress={handlePress}>
      <Card
        style={[
          styles.card,
          isUnread && {
            borderColor: colors.border.selected,
            backgroundColor: colors.surface.selected,
          },
        ]}
      >
        <View style={styles.header}>
          <Text
            variant="subhead"
            style={[
              { color: colors.text.primary, fontWeight: '600', flex: 1, marginRight: 8 },
              isUnread && { color: colors.text.brand },
            ]}
          >
            {notification.title}
          </Text>
          {isUnread ? (
            <Badge label="Não lida" tone="brand" />
          ) : (
            <Badge label="Lida" tone="neutral" />
          )}
        </View>

        <Text
          variant="body"
          numberOfLines={2}
          style={{ color: colors.text.secondary, marginTop: 6 }}
        >
          {notification.message}
        </Text>

        <View style={styles.footer}>
          <Text variant="caption" style={{ color: colors.text.muted }}>
            {new Date(notification.scheduledAt || notification.createdAt || Date.now()).toLocaleDateString(
              'pt-BR',
              { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            )}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
