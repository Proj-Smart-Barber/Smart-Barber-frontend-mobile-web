import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { Badge, Button, Card, EmptyState, ErrorState, Text } from '@/shared/ui';
import {
  useTeamInvitationsQuery,
  useTeamMembersQuery,
} from '../model/use-team';
import { ProfessionalRegistrationModal } from './ProfessionalRegistrationModal';
import { SentInvitationCard } from './SentInvitationCard';
import { TeamMemberCard } from './TeamMemberCard';

type TeamTab = 'ACTIVE' | 'INACTIVE' | 'INVITATIONS';

export function TeamView() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { selectedShopId, memberships } = useSession();

  const isOwnerActive = memberships.some(
    (m) =>
      m.id === selectedShopId &&
      m.state === 'ACTIVE' &&
      m.role === 'OWNER',
  );

  const [activeTab, setActiveTab] = useState<TeamTab>('ACTIVE');
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  // Queries
  const activeMembersQuery = useTeamMembersQuery(
    selectedShopId,
    'ACTIVE',
    activePage,
  );
  const inactiveMembersQuery = useTeamMembersQuery(
    selectedShopId,
    'INACTIVE',
    inactivePage,
  );
  const invitationsQuery = useTeamInvitationsQuery(
    selectedShopId,
    invitationsPage,
  );

  if (!isOwnerActive) {
    return (
      <View style={[styles.container, { padding: spacing[6] }]}>
        <EmptyState
          title="Acesso Restrito"
          description="Apenas o proprietário ativo desta unidade tem permissão para gerenciar a equipe."
          actionLabel="Voltar ao Início"
          onAction={() => router.push('/(app)')}
        />
      </View>
    );
  }

  const currentTabQuery =
    activeTab === 'ACTIVE'
      ? activeMembersQuery
      : activeTab === 'INACTIVE'
      ? inactiveMembersQuery
      : invitationsQuery;

  const handleTabChange = (tab: TeamTab) => {
    setActiveTab(tab);
  };

  const activeTotal = activeMembersQuery.data?.total ?? 0;
  const inactiveTotal = inactiveMembersQuery.data?.total ?? 0;
  const invitationsTotal = invitationsQuery.data?.total ?? 0;

  const currentPage =
    activeTab === 'ACTIVE'
      ? activePage
      : activeTab === 'INACTIVE'
      ? inactivePage
      : invitationsPage;

  const currentTotal =
    activeTab === 'ACTIVE'
      ? activeTotal
      : activeTab === 'INACTIVE'
      ? inactiveTotal
      : invitationsTotal;

  const totalPages = Math.max(1, Math.ceil(currentTotal / 20));

  const setPageForActiveTab = (newPage: number) => {
    if (activeTab === 'ACTIVE') setActivePage(newPage);
    else if (activeTab === 'INACTIVE') setInactivePage(newPage);
    else setInvitationsPage(newPage);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text variant="h2" weight="bold" color={colors.text.primary}>
              Equipe
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              Gerencie profissionais, convites e acessos da unidade
            </Text>
          </View>

          <Button
            title="Novo Barbeiro"
            variant="primary"
            onPress={() => setIsRegistrationModalOpen(true)}
          />
        </View>

        {/* Tab Selector */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.background.card,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
              marginTop: spacing[3],
            },
          ]}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'ACTIVE' }}
            onPress={() => handleTabChange('ACTIVE')}
            style={[
              styles.tabItem,
              activeTab === 'ACTIVE' && {
                backgroundColor: colors.surface.elevated,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Text
              variant="bodySm"
              weight={activeTab === 'ACTIVE' ? 'bold' : 'regular'}
              color={
                activeTab === 'ACTIVE'
                  ? colors.text.primary
                  : colors.text.secondary
              }
            >
              Ativos ({activeTotal})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'INACTIVE' }}
            onPress={() => handleTabChange('INACTIVE')}
            style={[
              styles.tabItem,
              activeTab === 'INACTIVE' && {
                backgroundColor: colors.surface.elevated,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Text
              variant="bodySm"
              weight={activeTab === 'INACTIVE' ? 'bold' : 'regular'}
              color={
                activeTab === 'INACTIVE'
                  ? colors.text.primary
                  : colors.text.secondary
              }
            >
              Desligados ({inactiveTotal})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'INVITATIONS' }}
            onPress={() => handleTabChange('INVITATIONS')}
            style={[
              styles.tabItem,
              activeTab === 'INVITATIONS' && {
                backgroundColor: colors.surface.elevated,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Text
              variant="bodySm"
              weight={activeTab === 'INVITATIONS' ? 'bold' : 'regular'}
              color={
                activeTab === 'INVITATIONS'
                  ? colors.text.primary
                  : colors.text.secondary
              }
            >
              Convites ({invitationsTotal})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        {currentTabQuery.isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text
              variant="bodySm"
              color={colors.text.secondary}
              style={{ marginTop: 12 }}
            >
              Carregando dados da equipe...
            </Text>
          </View>
        ) : currentTabQuery.isError ? (
          <ErrorState
            title="Erro ao carregar dados"
            description="Não foi possível obter os dados da equipe. Verifique sua conexão e tente novamente."
            onRetry={() => currentTabQuery.refetch()}
          />
        ) : activeTab === 'ACTIVE' ? (
          (activeMembersQuery.data?.items ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum barbeiro ativo"
              description="Convide novos profissionais para compor a equipe desta unidade."
              actionLabel="Cadastrar Barbeiro"
              onAction={() => setIsRegistrationModalOpen(true)}
            />
          ) : (
            <FlatList
              data={activeMembersQuery.data?.items ?? []}
              keyExtractor={(item) => item.membershipId}
              renderItem={({ item }) => (
                <TeamMemberCard
                  member={item}
                  onPress={() => router.push(`/(app)/team/${item.membershipId}` as any)}
                />
              )}
              contentContainerStyle={{ paddingBottom: spacing[6] }}
            />
          )
        ) : activeTab === 'INACTIVE' ? (
          (inactiveMembersQuery.data?.items ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum membro desligado"
              description="Profissionais desligados desta unidade aparecerão aqui caso precisem ser consultados ou reconvidados."
            />
          ) : (
            <FlatList
              data={inactiveMembersQuery.data?.items ?? []}
              keyExtractor={(item) => item.membershipId}
              renderItem={({ item }) => (
                <TeamMemberCard
                  member={item}
                  onPress={() => router.push(`/(app)/team/${item.membershipId}` as any)}
                />
              )}
              contentContainerStyle={{ paddingBottom: spacing[6] }}
            />
          )
        ) : (
          (invitationsQuery.data?.items ?? []).length === 0 ? (
            <EmptyState
              title="Nenhum convite pendente"
              description="Quando você cadastrar um profissional, o convite e status de envio aparecerão aqui."
              actionLabel="Enviar Convite"
              onAction={() => setIsRegistrationModalOpen(true)}
            />
          ) : (
            <FlatList
              data={invitationsQuery.data?.items ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SentInvitationCard
                  invitation={item}
                  shopId={selectedShopId!}
                />
              )}
              contentContainerStyle={{ paddingBottom: spacing[6] }}
            />
          )
        )}
      </View>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <View
          style={[
            styles.paginationBar,
            {
              borderTopColor: colors.border.subtle,
              backgroundColor: colors.background.card,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
            },
          ]}
        >
          <Button
            title="Anterior"
            variant="outline"
            disabled={currentPage <= 1}
            onPress={() => setPageForActiveTab(currentPage - 1)}
          />
          <Text variant="caption" color={colors.text.secondary}>
            Página {currentPage} de {totalPages}
          </Text>
          <Button
            title="Próxima"
            variant="outline"
            disabled={currentPage >= totalPages}
            onPress={() => setPageForActiveTab(currentPage + 1)}
          />
        </View>
      )}

      {/* Registration Modal */}
      {selectedShopId && (
        <ProfessionalRegistrationModal
          visible={isRegistrationModalOpen}
          shopId={selectedShopId}
          onClose={() => setIsRegistrationModalOpen(false)}
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
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
});
