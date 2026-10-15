import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Badge, Card, Text } from '@/shared/ui';
import type { TeamMemberDto } from '../api/team.contract';

interface TeamMemberCardProps {
  member: TeamMemberDto;
  onPress: () => void;
}

export function TeamMemberCard({ member, onPress }: TeamMemberCardProps) {
  const { colors, spacing, radius } = useTheme();

  const initials = member.name
    ? member.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'PB';

  const isActive = member.state === 'ACTIVE';
  const roleLabel =
    member.role === 'OWNER'
      ? 'Proprietário'
      : member.role === 'BARBERMAN' || member.role === 'BARBER'
      ? 'Barbeiro'
      : member.role;

  const formattedDate = (() => {
    try {
      const d = new Date(member.joinedAt);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }
  })();

  return (
    <Card
      style={[
        styles.card,
        {
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.card,
          borderRadius: radius.lg,
          padding: spacing[4],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Gerenciar membro ${member.name}`}
        style={styles.innerContainer}
      >
        <View style={styles.contentRow}>
          <View
            style={[
              styles.avatar,
              {
                borderRadius: radius.full,
                backgroundColor: colors.surface.elevated,
                borderColor: colors.brand.primary,
              },
            ]}
          >
            <Text variant="subhead" weight="bold" color={colors.text.primary}>
              {initials}
            </Text>
          </View>

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text
                variant="body"
                weight="bold"
                color={colors.text.primary}
                numberOfLines={1}
                style={styles.nameText}
              >
                {member.name}
              </Text>
              <Badge
                label={isActive ? 'Ativo' : 'Desligado'}
                tone={isActive ? 'success' : 'neutral'}
              />
            </View>

            <View style={styles.metaRow}>
              <Badge
                label={roleLabel}
                tone={member.role === 'OWNER' ? 'brand' : 'info'}
              />
              {formattedDate ? (
                <Text variant="caption" color={colors.text.muted}>
                  Desde {formattedDate}
                </Text>
              ) : null}
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.muted}
            style={styles.chevron}
          />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    borderWidth: 1,
  },
  innerContainer: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  nameText: {
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    marginLeft: 8,
  },
});
