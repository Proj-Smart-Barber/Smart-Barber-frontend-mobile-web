import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/features/auth';
import { getBarberScheduleContext } from '../model/barber-schedule-access';
import { AvailabilityScreen, AvailabilityMenuButton } from './AvailabilityScreen';
import { BarberScheduleScreen } from './BarberScheduleScreen';
import { useTeamMembersQuery } from '@/features/team/model/use-team';
import type { TeamMemberDto } from '@/features/team/api/team.contract';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Button, EmptyState, ErrorState, SegmentedFilter, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useNavigation } from '@/shared/navigation/navigation-context';

export type AvailabilityScope = 'unit' | 'personal' | 'team';

export interface UnifiedAvailabilityContainerProps {
  initialScope?: AvailabilityScope;
  barbershopId?: string | null;
  barbermanId?: string | null;
  professionalName?: string | null;
}

const OWNER_SCOPE_OPTIONS: { value: AvailabilityScope; label: string }[] = [
  { value: 'unit', label: 'Da barbearia' },
  { value: 'personal', label: 'Meus horários' },
  { value: 'team', label: 'Equipe' },
];

export function UnifiedAvailabilityContainer({
  initialScope,
  barbershopId: propShopId,
  barbermanId: propBarbermanId,
  professionalName: propProfessionalName,
}: UnifiedAvailabilityContainerProps) {
  const session = useSession();
  const context = getBarberScheduleContext(session);
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isExpanded, contentMaxWidth } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const { openDrawer, onContentScroll } = useNavigation();

  const isOwner = context?.role === 'OWNER';
  const effectiveShopId = context?.shopId ?? propShopId ?? '';
  const currentUserId = context?.userId ?? '';

  // Determina escopo inicial com base no papel e parâmetros de URL
  const resolvedInitialScope: AvailabilityScope = useMemo(() => {
    if (!isOwner) return 'personal';
    if (initialScope) return initialScope;
    if (propBarbermanId) {
      return propBarbermanId === currentUserId ? 'personal' : 'team';
    }
    return 'unit';
  }, [isOwner, initialScope, propBarbermanId, currentUserId]);

  const [activeScope, setActiveScope] = useState<AvailabilityScope>(resolvedInitialScope);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(() => {
    if (isOwner && propBarbermanId && propBarbermanId !== currentUserId) {
      return propBarbermanId;
    }
    return null;
  });

  // Limpa seleção ao trocar de unidade
  const prevShopIdRef = useRef(effectiveShopId);
  useEffect(() => {
    if (prevShopIdRef.current !== effectiveShopId) {
      prevShopIdRef.current = effectiveShopId;
      setSelectedTeamMemberId(null);
    }
  }, [effectiveShopId]);

  useEffect(() => {
    if (!isOwner) {
      setActiveScope('personal');
    }
  }, [isOwner]);

  // Consulta membros ativos da equipe para o escopo de gestão do proprietário
  const teamQuery = useTeamMembersQuery(isOwner ? effectiveShopId : null, 'ACTIVE');
  const teamMembers = useMemo(() => {
    const list = teamQuery.data?.members ?? teamQuery.data?.items ?? [];
    return list;
  }, [teamQuery.data]);

  const selectedMember = useMemo(() => {
    if (!selectedTeamMemberId) return null;
    return teamMembers.find((m: TeamMemberDto) => m.userId === selectedTeamMemberId) ?? null;
  }, [teamMembers, selectedTeamMemberId]);

  const webBackgroundStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(20, 20, 20, 0.98) 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        } as any)
      : null;

  // Falha fechado: sem contexto operacional ativo ou sem unidade
  if (!context || !session.identity) {
    return (
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background.primary }, webBackgroundStyle]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.stateContent, { paddingHorizontal: spacing[5] }]}>
          <ErrorState
            title="Horários indisponíveis"
            description="Entre com sua conta e selecione uma unidade com vínculo operacional ativo para configurar horários."
            actionLabel="Ir para o início"
            onAction={() => router.push('/(app)')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Se for BARBERMAN: acesso exclusivo e direto à própria jornada
  if (!isOwner) {
    return (
      <BarberScheduleScreen
        key={`personal-${context.userId}-${context.shopId}`}
        barbershopId={context.shopId}
        barbermanId={context.userId}
        barberName={session.identity.name}
      />
    );
  }

  // Usuário é OWNER: renderiza o contêiner de escopos unificado
  const handleScopeChange = (nextScope: AvailabilityScope) => {
    if (nextScope === activeScope) return;
    setActiveScope(nextScope);
  };

  const handleSelectTeamMember = (memberId: string) => {
    setSelectedTeamMemberId(memberId);
  };

  const handleBackToTeamList = () => {
    setSelectedTeamMemberId(null);
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background.primary }, webBackgroundStyle]}
      edges={['top', 'bottom']}
    >
      {/* Cabeçalho Canônico Unificado e Seletor de Escopos */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingHorizontal: spacing[isExpanded ? 8 : 5],
            paddingTop: insets.top > 0 ? insets.top + spacing[2] : spacing[4],
            paddingBottom: spacing[3],
            borderBottomColor: colors.border.subtle,
          },
        ]}
      >
        <View style={[styles.headerInner, { maxWidth: contentMaxWidth }]}>
          <View style={styles.topRow}>
            {!isExpanded && <AvailabilityMenuButton onPress={openDrawer} />}
            <View style={styles.titleColumn}>
              <Text variant="bodySm" weight="bold" color={colors.text.primary} numberOfLines={1}>
                Horários
              </Text>
              <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
                {activeScope === 'unit'
                  ? 'Expediente geral e exceções da barbearia'
                  : activeScope === 'personal'
                    ? 'Sua jornada pessoal de atendimento'
                    : 'Jornadas individuais da equipe'}
              </Text>
            </View>
          </View>

          {/* Abas de Contexto para OWNER */}
          <SegmentedFilter<AvailabilityScope>
            options={OWNER_SCOPE_OPTIONS}
            value={activeScope}
            onChange={handleScopeChange}
            style={{ marginTop: spacing[3] }}
          />
        </View>
      </View>

      {/* Conteúdo do Escopo Ativo */}
      <View style={styles.contentContainer}>
        {/* ── Aba 1: Da barbearia ── */}
        {activeScope === 'unit' && (
          <AvailabilityScreen
            key={`unit-${context.shopId}`}
            barbershopId={context.shopId}
            barbermanId={null}
            professionalName={null}
            hideTopBar
          />
        )}

        {/* ── Aba 2: Meus horários ── */}
        {activeScope === 'personal' && (
          <View style={styles.tabWrapper}>
            <View
              style={[
                styles.ownerNoticeCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  borderColor: colors.border.subtle,
                  borderRadius: radius.md,
                  marginHorizontal: spacing[isExpanded ? 8 : 5],
                  marginTop: spacing[3],
                  marginBottom: spacing[1],
                  padding: spacing[3],
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.brand.primary} />
              <Text variant="caption" color={colors.text.secondary} style={{ flex: 1 }}>
                Sua disponibilidade como profissional nesta unidade. Se você apenas administra a barbearia e não realiza atendimentos a clientes, a configuração desta jornada é opcional.
              </Text>
            </View>

            <BarberScheduleScreen
              key={`personal-owner-${context.userId}-${context.shopId}`}
              barbershopId={context.shopId}
              barbermanId={context.userId}
              barberName={session.identity.name}
              hideTopBar
            />
          </View>
        )}

        {/* ── Aba 3: Equipe ── */}
        {activeScope === 'team' && (
          <View style={styles.tabWrapper}>
            {selectedTeamMemberId ? (
              <View style={styles.tabWrapper}>
                <View
                  style={[
                    styles.selectedMemberBar,
                    {
                      paddingHorizontal: spacing[isExpanded ? 8 : 5],
                      paddingVertical: spacing[3],
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}
                >
                  <Button
                    variant="ghost"
                    title="Voltar para a lista da equipe"
                    leftIcon={<Ionicons name="arrow-back" size={18} color={colors.text.primary} />}
                    onPress={handleBackToTeamList}
                  />
                  <View style={styles.selectedMemberInfo}>
                    <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                      {selectedMember?.name ?? propProfessionalName ?? 'Profissional'}
                    </Text>
                    <Badge label="Equipe" tone="info" size="sm" />
                  </View>
                </View>

                <AvailabilityScreen
                  key={`team-${context.shopId}-${selectedTeamMemberId}`}
                  barbershopId={context.shopId}
                  barbermanId={selectedTeamMemberId}
                  professionalName={selectedMember?.name ?? propProfessionalName}
                  hideTopBar
                />
              </View>
            ) : (
              <ScrollView
                style={styles.teamScroll}
                contentContainerStyle={[
                  styles.teamContent,
                  {
                    paddingHorizontal: spacing[isExpanded ? 8 : 5],
                    paddingTop: spacing[4],
                    paddingBottom: Math.max(insets.bottom, 16) + 80,
                  },
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={onContentScroll}
                scrollEventThrottle={16}
              >
                <View style={[styles.teamContentInner, { maxWidth: contentMaxWidth }]}>
                  <View style={{ marginBottom: spacing[4], gap: 4 }}>
                    <Text variant="h2" weight="bold" color={colors.text.primary}>
                      Horários da Equipe
                    </Text>
                    <Text variant="bodySm" color={colors.text.secondary}>
                      Selecione um profissional da equipe para gerenciar sua disponibilidade e folgas.
                    </Text>
                  </View>

                  {teamQuery.isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.brand.primary} />
                      <Text variant="bodySm" color={colors.text.secondary} style={{ marginTop: 12 }}>
                        Carregando equipe...
                      </Text>
                    </View>
                  ) : teamMembers.length === 0 ? (
                    <EmptyState
                      title="Nenhum barbeiro ativo"
                      description="Esta unidade não possui profissionais ativos com atendimento individual configurável."
                      actionLabel="Gerenciar Equipe"
                      onAction={() => router.push('/(app)/team')}
                    />
                  ) : (
                    <View style={{ gap: spacing[3] }}>
                      {teamMembers.map((member: TeamMemberDto) => {
                        const isSelf = member.userId === currentUserId;
                        const initials = member.name
                          ? member.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0].toUpperCase())
                              .join('')
                          : 'PR';

                        return (
                          <LiquidGlassView
                            key={member.membershipId}
                            variant="card"
                            elevated
                            style={{ width: '100%' }}
                            contentStyle={{ padding: spacing[4] }}
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Configurar horários de ${member.name}`}
                              onPress={() => handleSelectTeamMember(member.userId)}
                              style={({ pressed }) => [
                                styles.memberCardRow,
                                { opacity: pressed ? 0.75 : 1 },
                              ]}
                            >
                              <View
                                style={[
                                  styles.avatar,
                                  {
                                    borderRadius: radius.full,
                                    backgroundColor: colors.surface.elevated,
                                    borderColor: isSelf ? colors.brand.primary : colors.border.default,
                                  },
                                ]}
                              >
                                <Text variant="caption" weight="bold" color={colors.text.primary}>
                                  {initials}
                                </Text>
                              </View>

                              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <Text variant="body" weight="bold" color={colors.text.primary} numberOfLines={1}>
                                    {member.name}
                                  </Text>
                                  {isSelf && <Badge label="Você" tone="brand" size="sm" />}
                                </View>
                                <Text variant="caption" color={colors.text.muted}>
                                  {member.role === 'OWNER' ? 'Proprietário' : 'Barbeiro'} • Vínculo Ativo
                                </Text>
                              </View>

                              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
                            </Pressable>
                          </LiquidGlassView>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrapper: {
    borderBottomWidth: 1,
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  contentContainer: {
    flex: 1,
  },
  tabWrapper: {
    flex: 1,
  },
  ownerNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  selectedMemberBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectedMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamScroll: {
    flex: 1,
  },
  teamContent: {
    alignItems: 'center',
  },
  teamContentInner: {
    width: '100%',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
