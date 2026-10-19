import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Badge, Button, Text } from '@/shared/ui';
import { useNavigation } from '@/shared/navigation';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useSession } from '@/features/auth';

export default function ClientProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius, mode, setMode } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const { identity, signOut } = useSession();

  let openDrawer: (() => void) | undefined;
  try {
    openDrawer = useNavigation().openDrawer;
  } catch {
    openDrawer = undefined;
  }

  const userName = identity?.name || 'Cliente';
  const userEmail = identity?.email || 'cliente@smartbarber.com';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'CL';

  const themeOptions: Array<{ mode: 'system' | 'light' | 'dark'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { mode: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
    { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
    { mode: 'dark', label: 'Escuro', icon: 'moon-outline' },
  ];

  return (
    <View style={[styles.screenContainer, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: !isExpanded ? Math.max(insets.bottom, 16) + 96 : 40,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentConstraint}>
          {/* Header */}
          <View style={styles.headerRow}>
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
                <Text variant="h2" style={styles.headerTitle}>
                  Minha Conta
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  Gerencie seu perfil, aparência do app e histórico
                </Text>
              </View>
            </View>
          </View>

          {/* Card de Identificação (Padrão Owner com contentStyle em linha) */}
          <LiquidGlassView
            variant="card"
            borderRadius={radius.xl}
            contentStyle={styles.profileCardContent}
          >
            <View
              style={[
                styles.avatarLarge,
                {
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.brand.primary,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '800' }}>
                {initials}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text variant="body" weight="bold" style={{ color: colors.text.primary }}>
                {userName}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {userEmail}
              </Text>
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                <Badge label="Cliente" tone="brand" />
              </View>
            </View>
          </LiquidGlassView>

          {/* Preferências de Aparência */}
          <View style={styles.section}>
            <Text variant="caption" weight="bold" color={colors.text.muted} style={styles.sectionTitle}>
              APARÊNCIA DO APLICATIVO
            </Text>

            <View style={styles.themeOptionsRow}>
              {themeOptions.map((opt) => {
                const isSelected = mode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    onPress={() => setMode(opt.mode)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.themeOptionButton,
                      {
                        backgroundColor: isSelected
                          ? colors.surface.selected
                          : colors.surface.input,
                        borderColor: isSelected
                          ? colors.brand.primary
                          : colors.border.subtle,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? colors.brand.primary : colors.text.secondary}
                    />
                    <Text
                      variant="caption"
                      weight={isSelected ? 'bold' : 'medium'}
                      style={{
                        color: isSelected ? colors.text.primary : colors.text.secondary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Atalhos rápidos */}
          <View style={styles.section}>
            <Text variant="caption" weight="bold" color={colors.text.muted} style={styles.sectionTitle}>
              MEUS DADOS & ATIVIDADE
            </Text>

            <LiquidGlassView
              variant="card"
              borderRadius={radius.xl}
              contentStyle={styles.optionsListContent}
            >
              <Pressable
                onPress={() => router.push('/(client)/bookings')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: colors.surface.selected },
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.brand.primary} />
                <Text variant="bodySm" weight="medium" style={{ flex: 1, color: colors.text.primary, marginLeft: 12 }}>
                  Histórico de agendamentos
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              <Pressable
                onPress={() => router.push('/(client)/notifications')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: colors.surface.selected },
                ]}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.brand.primary} />
                <Text variant="bodySm" weight="medium" style={{ flex: 1, color: colors.text.primary, marginLeft: 12 }}>
                  Notificações e avisos
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>
            </LiquidGlassView>
          </View>

          {/* Botão Sair */}
          <View style={styles.logoutSection}>
            <Button
              title="Sair da Conta"
              variant="destructive"
              leftIcon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
              onPress={() => signOut()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 20,
  },
  headerRow: {
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
  headerTitle: {
    fontWeight: '800',
  },
  profileCardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOptionButton: {
    flex: 1,
    minHeight: 68,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  optionsListContent: {
    overflow: 'hidden',
  },
  optionRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
  },
  logoutSection: {
    marginTop: 12,
  },
});

