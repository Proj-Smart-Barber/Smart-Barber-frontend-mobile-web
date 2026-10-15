import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useSession } from '@/features/auth';
import { useNotificationsFeed } from '@/features/notifications/model/notification-queries';
import { NotificationCard } from '@/features/notifications/ui/NotificationCard';

export default function ClientNotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
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
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleWithBadge}>
            <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '800' }}>
              Notificações
            </Text>
            {unreadCount > 0 && (
              <Badge label={`${unreadCount} novas`} tone="brand" />
            )}
          </View>
          <Button
            title="Voltar"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
        <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
          Avisos, confirmações e atualizações de agendamento da sua conta.
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
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: isCompact ? 16 : 32,
              paddingBottom: isCompact ? insets.bottom + 80 : 32,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand.primary}
            />
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
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: {
    paddingTop: 8,
    gap: 12,
  },
});
