import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badgeText?: string;
}

export function AuthLayout({ children, title, subtitle, badgeText }: AuthLayoutProps) {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const { formMaxWidth, isCompact } = useAdaptiveLayout();

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  return (
    <SafeAreaView
      style={[
        { flex: 1, backgroundColor: colors.background.primary },
        webBackgroundStyle,
      ]}
    >
      <View
        style={{
          minHeight: 60,
          paddingHorizontal: isCompact ? spacing[4] : spacing[6],
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          onPress={toggleTheme}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
          })}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: isCompact ? spacing[3] : spacing[6],
            paddingVertical: spacing[4],
          }}
        >
          <LiquidGlassView
            variant="form"
            elevated
            style={{ width: '100%', maxWidth: formMaxWidth }}
            contentStyle={{
              padding: isCompact ? spacing[4] : spacing[6],
              gap: spacing[5],
            }}
          >
            <View style={{ alignItems: 'center', gap: spacing[3] }}>
              <BrandMark
                variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                size={isCompact ? 64 : 72}
                decorative={false}
              />
              {badgeText ? (
                <Text variant="badge" color={colors.brand.primary}>
                  {badgeText}
                </Text>
              ) : null}
              <View style={{ gap: spacing[2] }}>
                <Text variant="h1" align="center" color={colors.text.primary}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="bodySm" align="center">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            {children}
          </LiquidGlassView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
