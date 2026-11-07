import React, { useRef, useState } from 'react';
import { Platform, View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import { Badge, Button, Text } from '@/shared/ui';
import { useNavigation } from '@/shared/navigation';
import { ClientNavbarMetricsContext } from '@/shared/navigation/ClientNavbarMetrics';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useSession, EditProfileModal } from '@/features/auth';
import { AvatarUploader, AvatarUploaderHandle } from '@/features/media';
import { formatPhoneNumber } from '@/shared/lib/phone-format';

interface ThemeOption {
  mode: 'system' | 'light' | 'dark';
  label: string;
  icon: any;
}

const themeOptions: ThemeOption[] = [
  { mode: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Escuro', icon: 'moon-outline' },
];

export default function ClientProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, radius, mode, setMode, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useAppSafeArea();
  const navbarOffset = React.useContext(ClientNavbarMetricsContext);
  const { identity, signOut, refreshIdentity } = useSession();

  const avatarUploaderRef = useRef<AvatarUploaderHandle>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);

  let openDrawer: (() => void) | undefined;
  let onContentScroll: ((event: any) => void) | undefined;
  try {
    const nav = useNavigation();
    openDrawer = nav.openDrawer;
    onContentScroll = nav.onContentScroll;
  } catch {
    openDrawer = undefined;
    onContentScroll = undefined;
  }

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  const displayTitleName = identity?.name?.trim() ? identity.name : 'Cliente';
  const userName = identity?.name?.trim() ? identity.name : 'Não informado';
  const userEmail = identity?.email ? identity.email : 'Não informado';
  const userPhone = identity?.phoneNumber ? formatPhoneNumber(identity.phoneNumber) : 'Não informado';



  return (
    <View
      style={[
        styles.screenContainer,
        { backgroundColor: colors.background.primary },
        webBackgroundStyle,
      ]}
    >
      <ScrollView
        onScroll={onContentScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
            paddingBottom: !isExpanded
              ? (navbarOffset > 0 ? navbarOffset + 24 : Math.max(insets.bottom, 16) + 96)
              : 40,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentConstraint}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="h2" style={styles.headerTitle} accessibilityRole="header">
                  Minha Conta
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  Gerencie seu perfil, aparência do app e histórico
                </Text>
              </View>
            </View>
          </View>

          {/* Card de Identificação */}
          <LiquidGlassView
            variant="card"
            borderRadius={radius.xl}
            contentStyle={styles.profileCardContent}
          >
            <View style={styles.profileHeaderRow}>
              <AvatarUploader
                ref={avatarUploaderRef}
                variant="avatar-only"
                currentAvatarUrl={identity?.avatarUrl}
                onAvatarUpdated={async () => {
                  await refreshIdentity?.().catch(() => {});
                  queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
                }}
                onBusyChange={setIsPhotoBusy}
                size={68}
                label=""
              />

              <View style={styles.profileInfo}>
                <Text
                  variant="h3"
                  weight="bold"
                  style={{ color: colors.text.primary, flexShrink: 1 }}
                >
                  {displayTitleName}
                </Text>
                <Text
                  variant="caption"
                  color={colors.text.secondary}
                  style={{ flexShrink: 1 }}
                >
                  {userEmail}
                </Text>
                <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                  <Badge label="Cliente" tone="brand" size="sm" />
                </View>
              </View>
            </View>

            {/* Ações do Perfil */}
            <View style={styles.profileActionsRow}>
              <Button
                title={isPhotoBusy ? 'Atualizando foto…' : 'Alterar foto'}
                variant="outline"
                loading={isPhotoBusy}
                disabled={isPhotoBusy}
                leftIcon={<Ionicons name="camera-outline" size={16} color={colors.text.primary} />}
                onPress={() => avatarUploaderRef.current?.pickPhoto()}
                accessibilityRole="button"
                accessibilityLabel="Alterar foto de perfil"
                style={{ flex: 1 }}
              />
              <Button
                title="Editar perfil"
                variant="outline"
                disabled={isPhotoBusy}
                leftIcon={<Ionicons name="create-outline" size={16} color={colors.text.primary} />}
                onPress={() => setIsEditModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Editar dados do perfil"
                style={{ flex: 1 }}
              />
            </View>
          </LiquidGlassView>

          {/* Meus Dados */}
          <View style={styles.section}>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.muted}
              style={styles.sectionTitle}
            >
              MEUS DADOS
            </Text>

            <LiquidGlassView
              variant="card"
              borderRadius={radius.xl}
              contentStyle={styles.optionsListContent}
            >
              <View style={styles.dataRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="caption" color={colors.text.muted}>
                    Nome completo
                  </Text>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    color={colors.text.primary}
                    style={{ marginTop: 2, flexWrap: 'wrap' }}
                  >
                    {userName}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              <View style={styles.dataRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="caption" color={colors.text.muted}>
                    Telefone de contato
                  </Text>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    color={colors.text.primary}
                    style={{ marginTop: 2 }}
                  >
                    {userPhone}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              <View style={styles.dataRow}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text variant="caption" color={colors.text.muted}>
                    E-mail
                  </Text>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    color={colors.text.primary}
                    style={{ marginTop: 2, flexWrap: 'wrap' }}
                  >
                    {userEmail}
                  </Text>
                </View>
                <Badge label="Somente leitura" tone="neutral" size="sm" />
              </View>
            </LiquidGlassView>
          </View>

          {/* Preferências de Aparência */}
          <View style={styles.section}>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.muted}
              style={styles.sectionTitle}
            >
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
                    accessibilityLabel={`Aparência ${opt.label}`}
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

          {/* Atalhos Rápidos */}
          <View style={styles.section}>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.muted}
              style={styles.sectionTitle}
            >
              ATALHOS & ATIVIDADE
            </Text>

            <LiquidGlassView
              variant="card"
              borderRadius={radius.xl}
              contentStyle={styles.optionsListContent}
            >
              {/* Meus agendamentos */}
              <Pressable
                onPress={() => router.push('/(client)/bookings')}
                accessibilityRole="button"
                accessibilityLabel="Meus agendamentos"
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: colors.surface.selected },
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.brand.primary} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    style={{ color: colors.text.primary }}
                  >
                    Meus agendamentos
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    Próximos atendimentos e agendamentos confirmados
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              {/* Histórico de agendamentos */}
              <Pressable
                onPress={() => router.push('/(client)/bookings?tab=history' as any)}
                accessibilityRole="button"
                accessibilityLabel="Histórico de agendamentos"
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: colors.surface.selected },
                ]}
              >
                <Ionicons name="time-outline" size={20} color={colors.brand.primary} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    style={{ color: colors.text.primary }}
                  >
                    Histórico de agendamentos
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    Atendimentos anteriores concluídos ou cancelados
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              {/* Notificações e avisos */}
              <Pressable
                onPress={() => router.push('/(client)/notifications' as any)}
                accessibilityRole="button"
                accessibilityLabel="Notificações e avisos"
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: colors.surface.selected },
                ]}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.brand.primary} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    style={{ color: colors.text.primary }}
                  >
                    Notificações e avisos
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    Lembretes, confirmações e avisos do sistema
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              {/* Localização e barbearias próximas */}
              <Pressable
                onPress={() => router.push('/(client)/explore?section=nearby' as any)}
                accessibilityRole="button"
                accessibilityLabel="Localização e barbearias próximas"
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: colors.surface.selected },
                ]}
              >
                <Ionicons name="location-outline" size={20} color={colors.brand.primary} />
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <Text
                    variant="bodySm"
                    weight="medium"
                    style={{ color: colors.text.primary }}
                  >
                    Localização e barbearias próximas
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    Explorar unidades perto de você no mapa ou lista
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </Pressable>
            </LiquidGlassView>
          </View>

          {/* Botão Sair */}
          <View style={styles.logoutSection}>
            <Button
              title="Sair da Conta"
              variant="destructive"
              accessibilityRole="button"
              accessibilityLabel="Sair da Conta"
              leftIcon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
              onPress={() => signOut()}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modal de Edição de Perfil */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
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
  headerTitle: {
    fontWeight: '800',
  },
  profileCardContent: {
    padding: 20,
    gap: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  profileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  dataRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    minHeight: 56,
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
