import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Text } from '@/shared/ui';
import { useOptionalNavigation } from '@/shared/navigation';
import { useSession } from '@/features/auth';
import type { LocationSession } from '../model/location-provider';

export interface ClientHeaderProps {
  locationSession?: LocationSession;
  onRequestLocation?: () => void;
}

export function ClientHeader({
  locationSession,
  onRequestLocation,
}: ClientHeaderProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isExpanded } = useAdaptiveLayout();
  const { identity } = useSession();
  const router = useRouter();
  const navigation = useOptionalNavigation();
  const openDrawer = navigation?.openDrawer;

  const firstName = identity?.name
    ? identity.name.split(' ')[0]
    : 'Cliente';

  const initials = identity?.name
    ? identity.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'CL';

  const getLocationStatusText = () => {
    if (!locationSession) return 'Ativar localização';
    switch (locationSession.state) {
      case 'granted':
        if (locationSession.coords?.formattedLocation) {
          return locationSession.coords.formattedLocation;
        }
        return locationSession.coords?.isApproximate
          ? 'Perto de você (aprox.)'
          : 'Perto de você';
      case 'requesting':
        return 'Localizando...';
      case 'denied':
        return 'Localização desativada';
      case 'stale':
        return 'Atualizar localização';
      default:
        return 'Usar minha localização';
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
        },
      ]}
    >
      <View style={styles.topRow}>
        {/* Lado Esquerdo: BrandMark + Saudação + Localização (Menu hambúrguer agora reside na barra inferior) */}
        <View style={[styles.leftGroup, { gap: spacing[3] }]}>
          <View style={{ flexShrink: 0 }}>
            <BrandMark
              variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
              size={32}
              decorative={false}
              accessibilityLabel="Smart Barber Logo"
            />
          </View>

          <View style={styles.greetingCol}>
            <View style={styles.greetingRow}>
              <Text variant="subhead" weight="bold" color={colors.text.primary} numberOfLines={1}>
                Olá, {firstName}
              </Text>
              <Badge label="Cliente" tone="brand" size="sm" />
            </View>

            <Pressable
              onPress={onRequestLocation}
              accessibilityRole="button"
              accessibilityLabel="Gerenciar permissão de localização"
              hitSlop={8}
              style={styles.locationButton}
            >
              <Ionicons
                name={
                  locationSession?.state === 'granted'
                    ? 'location'
                    : 'location-outline'
                }
                size={14}
                color={
                  locationSession?.state === 'granted'
                    ? colors.brand.primary
                    : colors.text.secondary
                }
              />
              <Text
                variant="caption"
                style={[
                  styles.locationStatusText,
                  {
                    color:
                      locationSession?.state === 'granted'
                        ? colors.brand.primary
                        : colors.text.secondary,
                  },
                ]}
                numberOfLines={1}
              >
                {getLocationStatusText()}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={colors.text.secondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Lado Direito: Notificações + Botão Explícito de Conta/Perfil */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push('/(client)/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Ver notificações"
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                borderColor: colors.border.default,
                borderRadius: radius.md,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text.primary}
            />
          </Pressable>

          {/* Botão Explícito de Conta no canto superior direito */}
          <Pressable
            onPress={() => router.push('/(client)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Acessar Minha Conta"
            accessibilityHint="Navega para o perfil e configurações da sua conta"
            style={({ pressed }) => [
              styles.explicitAccountButton,
              {
                backgroundColor: pressed
                  ? colors.surface.selected
                  : isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : colors.surface.input,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border.default,
                borderRadius: radius.full,
              },
            ]}
          >
            <View
              style={[
                styles.accountAvatarCircle,
                {
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="bold"
                style={[
                  styles.avatarInitial,
                  { color: colors.brand.primary, lineHeight: 13, textAlign: 'center' },
                ]}
              >
                {initials}
              </Text>
            </View>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.primary}
              style={styles.accountButtonText}
            >
              Conta
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  greetingCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 32,
    paddingVertical: 4,
    gap: 4,
  },
  locationStatusText: {
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  explicitAccountButton: {
    height: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    borderWidth: 1,
    gap: 6,
  },
  accountAvatarCircle: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontWeight: '700',
    fontSize: 11,
  },
  accountButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});

