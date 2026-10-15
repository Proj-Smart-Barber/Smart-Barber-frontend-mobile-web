import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@/shared/navigation/navigation-context';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { ThemeMode, useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui';

const themeOptions: Array<{ mode: ThemeMode; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { mode: 'system', title: 'Sistema', description: 'Seguir a preferência de aparência do dispositivo.', icon: 'phone-portrait-outline' },
  { mode: 'light', title: 'Claro', description: 'Usar a aparência clara no aplicativo.', icon: 'sunny-outline' },
  { mode: 'dark', title: 'Escuro', description: 'Usar a aparência escura no aplicativo.', icon: 'moon-outline' },
];

export function AppearanceSettingsScreen() {
  const { colors, spacing, radius, mode, setMode } = useTheme();
  const { contentMaxWidth, isCompact, isExpanded } = useAdaptiveLayout();
  const { openDrawer } = useNavigation();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[isCompact ? 4 : 6] }}>
        {!isExpanded ? (
          <LiquidGlassView variant="navigation" borderRadius={radius.md} elevated={false} style={{ width: 44, height: 44 }} contentStyle={{ padding: 0 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu" onPress={openDrawer} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }}>
              <Ionicons name="menu-outline" size={22} color={colors.text.primary} />
            </Pressable>
          </LiquidGlassView>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h2" color={colors.text.primary} accessibilityRole="header">Configurações</Text>
          <Text variant="caption" color={colors.text.secondary}>Preferências do aplicativo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: spacing[isCompact ? 4 : 6], paddingBottom: spacing[10] }}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[4] }}>
          <LiquidGlassView variant="card" style={{ width: '100%' }} contentStyle={{ padding: spacing[5], gap: spacing[4] }}>
            <View style={{ gap: spacing[1] }}>
              <Text variant="h3" color={colors.text.primary}>Aparência</Text>
              <Text variant="bodySm" color={colors.text.secondary}>Escolha como o Smart Barber será exibido.</Text>
            </View>

            <View accessibilityRole="radiogroup" accessibilityLabel="Tema do aplicativo" style={{ gap: spacing[2] }}>
              {themeOptions.map((option) => {
                const selected = mode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option.title}. ${option.description}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => setMode(option.mode)}
                    style={({ pressed }) => ({
                      minHeight: 64,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[3],
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: selected ? colors.brand.primary : colors.border.subtle,
                      backgroundColor: selected ? colors.surface.selected : pressed ? colors.surface.selected : colors.surface.default,
                    })}
                  >
                    <Ionicons name={option.icon} size={20} color={selected ? colors.brand.primary : colors.text.secondary} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodySm" weight="semibold" color={colors.text.primary}>{option.title}</Text>
                      <Text variant="caption" color={colors.text.secondary}>{option.description}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.brand.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </LiquidGlassView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
