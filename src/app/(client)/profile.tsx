import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useSession } from '@/features/auth';

export default function ClientProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radius, mode, setMode } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const { identity, signOut } = useSession();

  const userName = identity?.name || 'Cliente';
  const userEmail = identity?.email || 'cliente@smartbarber.com';

  const themeOptions: Array<{ mode: 'system' | 'light' | 'dark'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { mode: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
    { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
    { mode: 'dark', label: 'Escuro', icon: 'moon-outline' },
  ];

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background.primary }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: isCompact ? insets.bottom + 80 : 32,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentConstraint}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text variant="h2" style={styles.headerTitle}>
              Minha Conta
            </Text>
            <Button
              title="Voltar"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>

          {/* Card de Identificação */}
          <LiquidGlassView
            style={[
              styles.profileCard,
              {
                borderRadius: radius.xl,
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <View
              style={[
                styles.avatarLarge,
                {
                  backgroundColor: colors.surface.input,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '800' }}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text variant="body" weight="bold" style={{ color: colors.text.primary }}>
                {userName}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {userEmail}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text variant="caption" color={colors.brand.primary} style={{ fontWeight: '700' }}>
                  Cliente
                </Text>
              </View>
            </View>
          </LiquidGlassView>

          {/* Preferências de Aparência */}
          <View style={styles.section}>
            <Text variant="caption" weight="medium" color={colors.text.secondary} style={styles.sectionTitle}>
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
                          : colors.surface.default,
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
                      weight={isSelected ? 'bold' : 'regular'}
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
            <Text variant="caption" weight="medium" color={colors.text.secondary} style={styles.sectionTitle}>
              MEUS DADOS
            </Text>

            <LiquidGlassView
              style={[
                styles.optionsList,
                {
                  borderRadius: radius.xl,
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <Pressable
                onPress={() => router.push('/(client)/bookings')}
                style={styles.optionRow}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.text.primary} />
                <Text variant="body" style={{ flex: 1, color: colors.text.primary, marginLeft: 12 }}>
                  Histórico de agendamentos
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              <Pressable
                onPress={() => router.push('/(client)/notifications')}
                style={styles.optionRow}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
                <Text variant="body" style={{ flex: 1, color: colors.text.primary, marginLeft: 12 }}>
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
    maxWidth: 720,
    alignSelf: 'center',
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: '800',
  },
  profileCard: {
    padding: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOptionButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  optionsList: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  divider: {
    height: 1,
  },
  logoutSection: {
    marginTop: 12,
  },
});
