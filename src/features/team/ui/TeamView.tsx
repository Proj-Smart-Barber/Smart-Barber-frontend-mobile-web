import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/features/auth';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button, EmptyState, ErrorState, SegmentedFilter, Text } from '@/shared/ui';
import {
  useTeamInvitationsQuery,
  useTeamMembersQuery,
} from '../model/use-team';
import { ProfessionalRegistrationModal } from './ProfessionalRegistrationModal';
import { SentInvitationCard } from './SentInvitationCard';
import { TeamMemberCard } from './TeamMemberCard';

type TeamTab = 'ACTIVE' | 'INACTIVE' | 'INVITATIONS';

export function TeamView() {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded, contentMaxWidth } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedShopId, memberships } = useSession();

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

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
      <View style={[styles.container, { padding: spacing[6] }, webBackgroundStyle]}>
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        },
        webBackgroundStyle,
      ]}
    >
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            maxWidth: 800,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: spacing[4],
            paddingTop: spacing[4],
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1, paddingRight: isExpanded ? spacing[4] : 0 }}>
            <Text variant="h2" weight="bold" color={colors.text.primary} numberOfLines={1}>
              Equipe
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              Gerencie profissionais, convites e acessos da unidade
            </Text>
          </View>

          {isExpanded ? (
            <Button
              title="Novo Barbeiro"
              variant="primary"
              leftIcon={<Ionicons name="person-add" size={18} color="#FFFFFF" />}
              onPress={() => setIsRegistrationModalOpen(true)}
              style={{ minHeight: 44, paddingHorizontal: spacing[4] }}
            />
          ) : null}
        </View>

        {/* Tab Selector usando SegmentedFilter canônico C3 */}
        <SegmentedFilter<TeamTab>
          options={[
            { value: 'ACTIVE', label: 'Ativos', count: activeTotal },
            { value: 'INACTIVE', label: 'Desligados', count: inactiveTotal },
            { value: 'INVITATIONS', label: 'Convites', count: invitationsTotal },
          ]}
          value={activeTab}
          onChange={handleTabChange}
          style={{ marginTop: spacing[3] }}
        />
      </View>

      {/* Main Content Area */}
      <View
        style={{
          flex: 1,
          maxWidth: 800,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: spacing[4],
          paddingTop: spacing[3],
        }}
      >
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
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 16) + 120,
                gap: spacing[2],
              }}
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
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 16) + 120,
                gap: spacing[2],
              }}
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
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 16) + 120,
                gap: spacing[2],
              }}
            />
          )
        )}
      </View>

      {/* Floating Action Button (FAB) circular para telas compactas / mobile */}
      {!isExpanded && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: 24,
            bottom: Math.max(insets.bottom, 12) + (isCompact ? 86 : 24),
            zIndex: 95,
            elevation: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Novo Barbeiro"
            accessibilityHint="Abre o cadastro de um novo profissional para a equipe."
            onPress={() => setIsRegistrationModalOpen(true)}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 28,
              backgroundColor: colors.brand.primary,
              opacity: pressed ? 0.85 : 1,
              shadowColor: colors.brand.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.38,
              shadowRadius: 10,
              elevation: 8,
            })}
          >
            <Ionicons name="person-add" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <View
          style={[
            styles.paginationBar,
            {
              maxWidth: 800,
              width: '100%',
              alignSelf: 'center',
              borderTopColor: colors.border.subtle,
              backgroundColor: 'transparent',
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
    width: '100%',
  },
});
