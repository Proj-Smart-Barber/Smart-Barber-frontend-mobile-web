import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '../../shared/theme';
import { Text, EmptyState, Spinner, Badge, Button } from '../../shared/ui';
import { useSession } from '../../features/auth';
import { useNotificationsFeed } from '../../features/notifications/model/notification-queries';
import { NotificationCard } from '../../features/notifications/ui/NotificationCard';

export default function NotificationsScreen() {
  const { colors, spacing } = useTheme();
  const { identity } = useSession();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useNotificationsFeed(identity?.id, { cursor, limit: 20 });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const nextCursor = data?.nextCursor;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700' }}>
            Notificações
          </Text>
          {unreadCount > 0 && (
            <Badge label={`${unreadCount} novas`} tone="brand" />
          )}
        </View>
        <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
          Avisos, convites e atualizações de agendamento da sua conta.
        </Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.feedback.error }}>
            Não foi possível carregar as notificações.
          </Text>
          <Button
            title="Tentar novamente"
            variant="outline"
            style={{ marginTop: spacing.md }}
            onPress={() => refetch()}
          />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="Nenhuma notificação"
          description="Você está em dia com todas as suas atualizações e avisos."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationCard notification={item} />}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListFooterComponent={
            nextCursor ? (
              <Button
                title="Carregar mais"
                variant="outline"
                style={{ marginTop: spacing.md }}
                onPress={() => setCursor(nextCursor)}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
