import React, { useState } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion, useTheme } from '@/shared/theme';
import { Spinner, Text } from '@/shared/ui';

interface AgendaActionButtonProps {
  title: string;
  onPress: () => void;
  tone: 'success' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botão de ação contextual da Agenda (local à feature).
 * `success` = ação de confirmação/continuação (verde); `destructive` =
 * cancela/remove (vermelho). Usa apenas tokens semânticos do tema.
 */
export function AgendaActionButton({
  title,
  onPress,
  tone,
  loading = false,
  disabled = false,
  style,
}: AgendaActionButtonProps) {
  const { colors, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  const accent = tone === 'success' ? colors.feedback.success : colors.feedback.destructive;
  const pressedBg =
    tone === 'success' ? colors.feedback.successBackground : colors.feedback.errorBackground;
  const border = tone === 'success' ? colors.feedback.successBorder : colors.feedback.errorBorder;

  const handlePress: PressableProps['onPress'] = (event) => {
    if (isDisabled) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        {
          minHeight: 44,
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[2],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing[2],
          borderRadius: radius.md,
          borderCurve: 'continuous',
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? colors.border.focus : border,
          backgroundColor:
            pressed || (hovered && Platform.OS === 'web') ? pressedBg : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <Spinner color={accent} size="small" />
      ) : (
        <Text variant="button" color={accent}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
