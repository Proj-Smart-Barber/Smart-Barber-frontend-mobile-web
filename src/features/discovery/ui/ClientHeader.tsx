import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
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
  const { colors, spacing, radius } = useTheme();
  const { identity } = useSession();
  const router = useRouter();

  const firstName = identity?.name
    ? identity.name.split(' ')[0]
    : 'Cliente';

  const getLocationStatusText = () => {
    if (!locationSession) return 'Ativar localização';
    switch (locationSession.state) {
      case 'granted':
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
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Saudação e Localização */}
        <View style={styles.greetingCol}>
          <Text variant="caption" color={colors.text.secondary}>
            Olá, {firstName} 👋
          </Text>
          <Pressable
            onPress={onRequestLocation}
            accessibilityRole="button"
            accessibilityLabel="Gerenciar permissão de localização"
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

        {/* Notificações e Perfil */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push('/(client)/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Ver notificações"
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.subtle,
                borderRadius: radius.full,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text.primary}
            />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(client)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Menu de perfil e conta"
            style={[
              styles.avatarButton,
              {
                backgroundColor: colors.surface.input,
                borderColor: colors.border.subtle,
                borderRadius: radius.full,
              },
            ]}
          >
            <Text
              variant="caption"
              style={[styles.avatarInitial, { color: colors.text.primary }]}
            >
              {firstName.charAt(0).toUpperCase()}
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
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingCol: {
    flex: 1,
    justifyContent: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  locationStatusText: {
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarInitial: {
    fontWeight: '700',
    fontSize: 16,
  },
});
