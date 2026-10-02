import React, { useEffect } from 'react';
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { Badge, Text, useToast } from '@/shared/ui';
import { openPublicCatalog, sharePublicCatalog } from './catalog-share.helper';
import { useNavigation } from './navigation-context';

export function LeftDrawer() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { staff, barbershop, isOwner, signOut } = useSession();
  const {
    isDrawerOpen,
    isDrawerVisible,
    drawerProgress,
    closeDrawer,
    activeDestination,
  } = useNavigation();
  const { showToast } = useToast();

  const drawerWidth = Math.min(320, Math.round(width * 0.85));

  // Tecla Escape na Web e BackHandler no Android
  useEffect(() => {
    if (!isDrawerOpen) return;

    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        closeDrawer();
        return true;
      });
      return () => backHandler.remove();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeDrawer();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDrawerOpen, closeDrawer]);

  // Permanece montado durante a animação de saída até isDrawerVisible ser falso
  if (!isDrawerVisible) {
    return null;
  }

  const slideAnim = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const backdropAnim = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  const handleNavigate = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  const handleShareCatalog = async () => {
    closeDrawer();
    await sharePublicCatalog({
      barbershopId: barbershop?.id,
      barbershopName: barbershop?.name,
      onSuccess: (msg) => showToast(msg, 'success'),
      onError: (err) => showToast(err.message, 'error'),
    });
  };

  const handleOpenCatalog = async () => {
    closeDrawer();
    await openPublicCatalog(barbershop?.id);
  };

  const handleSignOut = () => {
    closeDrawer();
    void signOut();
  };

  const initials = staff?.name
    ? staff.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'SB';

  return (
    <View
      pointerEvents={isDrawerOpen ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, styles.overlayContainer]}
      accessibilityViewIsModal={isDrawerOpen}
    >
      {/* Backdrop semi-transparente que escurece conforme drawerProgress */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000000',
            opacity: backdropAnim,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Fechar menu lateral"
          onPress={closeDrawer}
        />
      </Animated.View>

      {/* Painel lateral do Drawer com largura calculada dinamicamente */}
      <Animated.View
        style={[
          styles.drawerPanel,
          {
            width: drawerWidth,
            backgroundColor: isDark ? '#141414' : colors.surface.elevated,
            borderRightColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
            paddingTop: Math.max(insets.top, spacing[4]),
            paddingBottom: Math.max(insets.bottom, spacing[4]),
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Cabeçalho do Drawer: Conta e Identidade */}
        <View
          style={[
            styles.drawerHeader,
            {
              borderBottomColor: colors.border.subtle,
              paddingHorizontal: spacing[5],
              paddingBottom: spacing[4],
            },
          ]}
        >
          <View style={styles.userInfoRow}>
            <View
              style={[
                styles.avatar,
                {
                  borderRadius: radius.full,
                  backgroundColor: colors.surface.input,
                  borderColor: colors.brand.primary,
                },
              ]}
            >
              <Text variant="subhead" color={colors.text.primary} weight="bold">
                {initials}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text
                variant="subhead"
                color={colors.text.primary}
                weight="bold"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {staff?.name || barbershop?.name || 'Profissional'}
              </Text>
              <Text
                variant="caption"
                color={colors.text.muted}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {barbershop?.name || 'Smart Barber'}
              </Text>
              <Badge
                label={isOwner ? 'Proprietário' : 'Barbeiro'}
                tone={isOwner ? 'brand' : 'success'}
                style={{ alignSelf: 'flex-start', marginTop: 2 }}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar menu lateral"
              onPress={closeDrawer}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  borderRadius: radius.full,
                  backgroundColor: pressed ? colors.surface.selected : 'transparent',
                },
              ]}
            >
              <Ionicons name="close-outline" size={24} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            gap: spacing[4],
          }}
        >
          {/* Grupo 1: Operação */}
          <View style={styles.menuGroup}>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.muted}
              style={styles.groupTitle}
            >
              OPERAÇÃO
            </Text>

            <DrawerMenuItem
              label="Início"
              icon="home-outline"
              activeIcon="home"
              isActive={activeDestination === 'home'}
              onPress={() => handleNavigate('/(app)')}
            />
            <DrawerMenuItem
              label="Agenda"
              icon="calendar-outline"
              activeIcon="calendar"
              isActive={activeDestination === 'agenda'}
              onPress={() => handleNavigate('/(app)/agenda')}
            />
            <DrawerMenuItem
              label="Horários"
              icon="time-outline"
              activeIcon="time"
              isActive={activeDestination === 'availability'}
              onPress={() => handleNavigate('/(app)/availability')}
            />
            <DrawerMenuItem
              label="Serviços"
              icon="cut-outline"
              activeIcon="cut"
              isActive={activeDestination === 'services'}
              onPress={() => handleNavigate('/(app)/services')}
            />
          </View>

          {/* Grupo 2: Catálogo Público */}
          <View style={styles.menuGroup}>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.muted}
              style={styles.groupTitle}
            >
              CATÁLOGO PÚBLICO
            </Text>

            <DrawerMenuItem
              label="Abrir Catálogo"
              icon="globe-outline"
              activeIcon="globe"
              isActive={false}
              onPress={handleOpenCatalog}
            />
            <DrawerMenuItem
              label="Compartilhar Link"
              icon="share-social-outline"
              activeIcon="share-social"
              isActive={false}
              onPress={handleShareCatalog}
            />
          </View>

          {/* Grupo 3: Preferências e Conta */}
          <View style={styles.menuGroup}>
            <Text
              variant="caption"
              weight="bold"
              color={colors.text.muted}
              style={styles.groupTitle}
            >
              CONTA & SISTEMA
            </Text>

            <DrawerMenuItem
              label={isDark ? 'Tema Claro' : 'Tema Escuro'}
              icon={isDark ? 'sunny-outline' : 'moon-outline'}
              activeIcon={isDark ? 'sunny' : 'moon'}
              isActive={false}
              onPress={toggleTheme}
            />
            <DrawerMenuItem
              label="Sair da Conta"
              icon="log-out-outline"
              activeIcon="log-out"
              isActive={false}
              destructive
              onPress={handleSignOut}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

interface DrawerMenuItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  destructive?: boolean;
  onPress: () => void;
}

function DrawerMenuItem({
  label,
  icon,
  activeIcon,
  isActive,
  destructive = false,
  onPress,
}: DrawerMenuItemProps) {
  const { colors, radius, spacing } = useTheme();

  const textColor = destructive
    ? colors.feedback.error
    : isActive
      ? colors.text.inverse
      : colors.text.primary;

  const iconColor = destructive
    ? colors.feedback.error
    : isActive
      ? colors.text.inverse
      : colors.text.secondary;

  const backgroundColor = isActive ? colors.brand.primary : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          borderRadius: radius.md,
          backgroundColor: isActive
            ? backgroundColor
            : pressed
              ? colors.surface.selected
              : 'transparent',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[3],
        },
      ]}
    >
      <Ionicons
        name={isActive ? activeIcon : icon}
        size={20}
        color={iconColor}
        style={{ marginRight: spacing[3] }}
      />
      <Text
        variant="bodySm"
        weight={isActive ? 'bold' : 'medium'}
        style={{ color: textColor, flex: 1 }}
      >
        {label}
      </Text>
      {isActive ? (
        <Ionicons name="chevron-forward" size={16} color={textColor} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    zIndex: 100,
  },
  drawerPanel: {
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
  },
  drawerHeader: {
    borderBottomWidth: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGroup: {
    gap: 4,
  },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
