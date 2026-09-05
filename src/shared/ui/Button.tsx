import React, { useState } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion, useTheme } from '../theme';
import { Spinner } from './Spinner';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({ title, variant = 'primary', loading = false, disabled = false, onPress, style, textStyle, leftIcon, rightIcon, ...rest }: ButtonProps) {
  const { colors, components, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || loading;
  const intent = variant === 'destructive'
    ? { ...components.button.destructive, border: components.button.destructive.background }
    : variant === 'primary'
      ? { ...components.button.primary, border: components.button.primary.background }
      : variant === 'secondary'
        ? { ...components.button.secondary, border: colors.border.default }
        : { background: 'transparent', pressed: colors.surface.selected, foreground: variant === 'outline' ? colors.brand.primary : colors.text.primary, border: variant === 'outline' ? colors.border.selected : 'transparent' };

  const handlePress: PressableProps['onPress'] = (event) => {
    if (isDisabled) return;
    if (Platform.OS !== 'web') {
      void (variant === 'destructive' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
    onPress?.(event);
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
      style={({ pressed, hovered }) => [
        {
          minHeight: 52,
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing[2],
          borderRadius: radius.md,
          borderCurve: 'continuous',
          borderWidth: variant === 'outline' || focused ? 2 : 1,
          borderColor: focused ? components.button.focus : intent.border,
          backgroundColor: pressed || (hovered && Platform.OS === 'web') ? intent.pressed : intent.background,
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
        },
        style,
      ]}
      {...rest}
    >
      {loading ? <Spinner color={intent.foreground} size="small" /> : <><>{leftIcon}</><Text variant="button" color={intent.foreground} style={textStyle}>{title}</Text><>{rightIcon}</></>}
    </Pressable>
  );
}
