import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Card, Text } from '@/shared/ui';

export interface AuthLayoutProps { children: React.ReactNode; title: string; subtitle?: string; badgeText?: string; }
export function AuthLayout({ children, title, subtitle, badgeText }: AuthLayoutProps) {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme(); const { formMaxWidth, isCompact } = useAdaptiveLayout();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ minHeight: 60, paddingHorizontal: isCompact ? spacing[4] : spacing[6], alignItems: 'flex-end', justifyContent: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'} onPress={toggleTheme} hitSlop={8} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: pressed ? colors.surface.selected : colors.surface.default })}><Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text.secondary} /></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: isCompact ? spacing[4] : spacing[6], paddingVertical: spacing[8] }}>
          <Card style={{ width: '100%', maxWidth: formMaxWidth, gap: spacing[6] }}>
            <View style={{ alignItems: 'center', gap: spacing[4] }}>
              <BrandMark variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} size={72} decorative={false} />
              {badgeText ? <Text variant="badge" color={colors.brand.primary}>{badgeText}</Text> : null}
              <View style={{ gap: spacing[2] }}><Text variant="h1" align="center" color={colors.text.primary}>{title}</Text>{subtitle ? <Text variant="bodySm" align="center">{subtitle}</Text> : null}</View>
            </View>
            {children}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
