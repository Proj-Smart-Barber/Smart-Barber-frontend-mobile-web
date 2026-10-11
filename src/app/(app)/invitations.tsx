import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../shared/theme';
import { Text, EmptyState, Spinner } from '../../shared/ui';
import { useUserInvitations } from '../../features/invitations/model/use-invitation-response';
import { InvitationCard } from '../../features/invitations/ui/InvitationCard';

export default function InvitationsScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { data: invitations, isLoading, error, refetch, isRefetching } = useUserInvitations();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.header}>
        <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700' }}>
          Meus Convites
        </Text>
        <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
          Convites recebidos para atuar como profissional em barbearias.
        </Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.feedback.error }}>
            Não foi possível carregar os convites.
          </Text>
        </View>
      ) : !invitations || invitations.length === 0 ? (
        <EmptyState
          title="Nenhum convite encontrado"
          description="Você ainda não recebeu convites para atuar em barbearias."
        />
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InvitationCard invitation={item} onSuccess={() => refetch()} />
          )}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
