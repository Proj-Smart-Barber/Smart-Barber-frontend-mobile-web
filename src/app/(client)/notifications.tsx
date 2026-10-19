import React, { useState } from 'react';
import { Platform, View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useNavigation } from '@/shared/navigation';
import { useSession } from '@/features/auth';
import { useNotificationsFeed } from '@/features/notifications/model/notification-queries';
import { NotificationCard } from '@/features/notifications/ui/NotificationCard';

export default function ClientNotificationsScreen() {
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const { identity } = useSession();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  let openDrawer: (() => void) | undefined;
  let onContentScroll: ((event: any) => void) | undefined;
  try {
    const nav = useNavigation();
    openDrawer = nav.openDrawer;
    onContentScroll = nav.onContentScroll;
  } catch {
    openDrawer = undefined;
    onContentScroll = undefined;
  }

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useNotificationsFeed(identity?.id, { cursor, limit: 20 });

  if (isLoading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background.primary },
          webBackgroundStyle,
        ]}
      >
        <Spinner size="large" />
      </View>
    );
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const nextCursor = data?.nextCursor;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.primary },
        webBackgroundStyle,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
      >
        <View style={styles.contentConstraint}>
          <View style={styles.titleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
              {!isExpanded && openDrawer ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir menu de navegação"
                  onPress={openDrawer}
                  style={({ pressed }) => [
                    styles.menuButton,
                    {
                      borderRadius: radius.md,
                      backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                      borderColor: colors.border.default,
                    },
                  ]}
                >
                  <Ionicons name="menu-outline" size={22} color={colors.text.primary} />
                </Pressable>
              ) : null}

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.titleWithBadge}>
                  <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '800' }}>
                    Notificações
                  </Text>
                  {unreadCount > 0 && (
                    <Badge label={`${unreadCount} novas`} tone="brand" />
                  )}
                </View>
                <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                  Avisos, confirmações e atualizações de agendamento da sua conta.
                </Text>
              </View>
            </View>

            <Button
              title="Voltar"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </View>
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
          onScroll={onContentScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={styles.contentConstraint}>
              <NotificationCard notification={item} />
            </View>
          )}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: isCompact ? 16 : 32,
              paddingBottom: !isExpanded ? Math.max(insets.bottom, 16) + 96 : 40,
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
              <View style={styles.contentConstraint}>
                <Button
                  title="Carregar mais"
                  variant="outline"
                  style={{ marginTop: spacing.md }}
                  onPress={() => setCursor(nextCursor)}
                />
              </View>
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
  contentConstraint: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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

