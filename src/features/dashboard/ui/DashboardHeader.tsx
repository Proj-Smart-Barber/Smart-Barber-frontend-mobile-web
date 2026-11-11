import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { useSession } from '@/features/auth';
import type { Staff } from '@/entities/staff';

interface DashboardHeaderProps {
  staff: Staff | null;
  greeting: string;
  isOwner: boolean;
}

export function DashboardHeader({ greeting }: DashboardHeaderProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const router = useRouter();
  const { barbershop } = useSession();
  const [failedLogo, setFailedLogo] = React.useState<string | null>(null);
  const shopName = barbershop?.name;
  const logoUrl = barbershop?.avatarUrl;
  const showLogo = Boolean(logoUrl && logoUrl !== failedLogo);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: barbershop?.timezone,
  }).format(new Date());

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal: isCompact ? spacing[4] : spacing[6],
          paddingVertical: spacing[3],
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
          backgroundColor: isDark ? 'rgba(11, 11, 11, 0.78)' : 'rgba(255, 255, 255, 0.82)',
        },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as any)
          : null,
      ]}
    >
      {/* Identidade da unidade e data de referência do painel. */}
      <View
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
        }}
      >
        <View
          style={{
            width: shopName ? 48 : 32,
            height: shopName ? 48 : 32,
            padding: shopName ? 4 : 0,
            flexShrink: 0,
            borderRadius: radius.md,
            backgroundColor: shopName ? colors.surface.elevated : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {showLogo ? (
            <Image
              source={{ uri: logoUrl! }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              accessibilityLabel={`Logotipo de ${shopName}`}
              onError={() => setFailedLogo(logoUrl ?? null)}
            />
          ) : shopName ? (
            <Text variant="subhead" weight="bold" color={colors.text.primary}>
              {shopName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0])
                .join('')
                .toUpperCase()}
            </Text>
          ) : (
            <BrandMark
              variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
              size={32}
              decorative={false}
              accessibilityLabel="Smart Barber Logo"
            />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing[2],
            }}
          >
            <Text
              variant="subhead"
              weight="bold"
              color={colors.text.primary}
              numberOfLines={shopName && !isExpanded ? 3 : 2}
              style={{ flexShrink: 1, ...(shopName ? { width: '100%' } : {}) }}
            >
              {shopName || greeting}
            </Text>
          </View>
          <Text variant="caption" color={colors.text.muted} numberOfLines={1}>
            {capitalizedDate}
          </Text>
        </View>
      </View>

      {/* Ação rápida de agendamento no desktop. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        {isExpanded ? (
          <Button
            title="Novo Agendamento"
            variant="primary"
            leftIcon={<Ionicons name="add" size={18} color="#FFFFFF" />}
            onPress={() => router.push('/(app)/new-booking' as any)}
            style={{ minHeight: 44, paddingHorizontal: spacing[4] }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
