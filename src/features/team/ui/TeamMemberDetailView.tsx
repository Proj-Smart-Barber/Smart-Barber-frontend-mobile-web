import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { Badge, Button, Card, EmptyState, Text } from '@/shared/ui';
import { useTeamMemberQuery } from '../model/use-team';
import { DeactivateMemberModal } from './DeactivateMemberModal';
import { ProfessionalRegistrationModal } from './ProfessionalRegistrationModal';

interface TeamMemberDetailViewProps {
  membershipId: string;
}

export function TeamMemberDetailView({ membershipId }: TeamMemberDetailViewProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { selectedShopId, memberships } = useSession();

  const isOwnerActive = memberships.some(
    (m) =>
      m.id === selectedShopId &&
      m.state === 'ACTIVE' &&
      m.role === 'OWNER',
  );

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isReinviteModalOpen, setIsReinviteModalOpen] = useState(false);

  const memberQuery = useTeamMemberQuery(selectedShopId, membershipId);
  const member = memberQuery.data;

  if (!isOwnerActive) {
    return (
      <View style={[styles.container, { padding: spacing[6] }]}>
        <EmptyState
          title="Acesso Restrito"
          description="Apenas o proprietário ativo desta unidade tem permissão para visualizar o detalhe do membro."
          actionLabel="Voltar"
          onAction={() => router.push('/(app)/team' as any)}
        />
      </View>
    );
  }

  if (memberQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text
          variant="bodySm"
          color={colors.text.secondary}
          style={{ marginTop: 12 }}
        >
          Carregando informações do profissional...
        </Text>
      </View>
    );
  }

  if (memberQuery.isError || !member) {
    return (
      <View style={[styles.container, { padding: spacing[6] }]}>
        <EmptyState
          title="Profissional não encontrado"
          description="Não foi possível localizar os dados deste vínculo nesta unidade."
          actionLabel="Voltar para a Equipe"
          onAction={() => router.push('/(app)/team' as any)}
        />
      </View>
    );
  }

  const isActive = member.state === 'ACTIVE';
  const isOwner = member.role === 'OWNER';

  const initials = member.name
    ? member.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'PB';

  const roleLabel =
    member.role === 'OWNER'
      ? 'Proprietário'
      : member.role === 'BARBERMAN' || member.role === 'BARBER'
      ? 'Barbeiro'
      : member.role;

  const joinedDateStr = (() => {
    try {
      const d = new Date(member.joinedAt);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  })();

  const endedDateStr = (() => {
    if (!member.endedAt) return null;
    try {
      const d = new Date(member.endedAt);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
    } catch {
      return null;
    }
  })();

  const handleOpenAgenda = () => {
    router.push(`/(app)/agenda?barbermanId=${member.userId}` as any);
  };

  const handleOpenAvailability = () => {
    router.push(
      `/(app)/availability?barbermanId=${member.userId}&name=${encodeURIComponent(
        member.name,
      )}` as any,
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
    >
      {/* Back button row */}
      <View style={styles.topNavRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para a equipe"
          onPress={() => router.push('/(app)/team' as any)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          <Text variant="body" weight="bold" color={colors.text.primary}>
            Equipe
          </Text>
        </Pressable>
      </View>

      {/* Main Profile Card */}
      <Card
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.background.card,
            borderColor: colors.border.subtle,
            borderRadius: radius.xl,
            padding: spacing[5],
          },
        ]}
      >
        <View style={styles.profileHeaderRow}>
          <View
            style={[
              styles.avatarLarge,
              {
                borderRadius: radius.full,
                backgroundColor: colors.surface.elevated,
                borderColor: colors.brand.primary,
              },
            ]}
          >
            <Text variant="h2" weight="bold" color={colors.text.primary}>
              {initials}
            </Text>
          </View>

          <View style={styles.profileHeaderInfo}>
            <Text variant="h3" weight="bold" color={colors.text.primary}>
              {member.name}
            </Text>
            <View style={styles.badgesRow}>
              <Badge
                label={isActive ? 'Ativo' : 'Desligado'}
                tone={isActive ? 'success' : 'neutral'}
              />
              <Badge
                label={roleLabel}
                tone={isOwner ? 'brand' : 'info'}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.detailsBox,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
              padding: spacing[4],
              marginTop: spacing[4],
            },
          ]}
        >
          <View style={styles.detailRow}>
            <Text variant="caption" color={colors.text.muted}>
              Vínculo na Unidade
            </Text>
            <Text variant="bodySm" weight="bold" color={colors.text.primary}>
              {isActive ? 'Ativo' : 'Inativo / Desligado'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant="caption" color={colors.text.muted}>
              Data de Ingresso
            </Text>
            <Text variant="bodySm" color={colors.text.primary}>
              {joinedDateStr || '—'}
            </Text>
          </View>

          {endedDateStr && (
            <View style={styles.detailRow}>
              <Text variant="caption" color={colors.text.muted}>
                Data de Desligamento
              </Text>
              <Text variant="bodySm" color={colors.feedback.error}>
                {endedDateStr}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text variant="caption" color={colors.text.muted}>
              Versão do Registro
            </Text>
            <Text variant="bodySm" color={colors.text.secondary}>
              v{member.version}
            </Text>
          </View>
        </View>
      </Card>

      {/* Operational Actions */}
      <Card
        style={[
          styles.actionsCard,
          {
            backgroundColor: colors.background.card,
            borderColor: colors.border.subtle,
            borderRadius: radius.xl,
            padding: spacing[5],
            gap: spacing[3],
          },
        ]}
      >
        <Text variant="subhead" weight="bold" color={colors.text.primary}>
          Ações Operacionais
        </Text>

        <View style={{ gap: spacing[3] }}>
          <Button
            title="Ver Agenda"
            variant="outline"
            onPress={handleOpenAgenda}
          />

          <Button
            title="Configurar Horários"
            variant="outline"
            onPress={handleOpenAvailability}
          />

          {isActive && !isOwner && (
            <Button
              title="Desligar da Unidade"
              variant="destructive"
              onPress={() => setIsDeactivateModalOpen(true)}
              style={{ marginTop: spacing[2] }}
            />
          )}

          {!isActive && (
            <Button
              title="Convidar Novamente"
              variant="primary"
              onPress={() => setIsReinviteModalOpen(true)}
              style={{ marginTop: spacing[2] }}
            />
          )}
        </View>
      </Card>

      {/* Deactivate Modal */}
      {selectedShopId && (
        <DeactivateMemberModal
          visible={isDeactivateModalOpen}
          member={member}
          shopId={selectedShopId}
          onClose={() => setIsDeactivateModalOpen(false)}
          onSuccess={() => {
            memberQuery.refetch();
          }}
        />
      )}

      {/* Reinvite Modal */}
      {selectedShopId && (
        <ProfessionalRegistrationModal
          visible={isReinviteModalOpen}
          shopId={selectedShopId}
          onClose={() => setIsReinviteModalOpen(false)}
          onSuccess={() => {
            memberQuery.refetch();
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  profileCard: {
    borderWidth: 1,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderInfo: {
    flex: 1,
    gap: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBox: {
    borderWidth: 1,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsCard: {
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
