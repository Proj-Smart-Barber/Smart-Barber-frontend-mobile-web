import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useReducedMotion, useTheme } from '../theme';
import { Spinner } from './Spinner';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  loadingTitle?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  loadingTitle,
  variant = 'primary',
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  ...rest
}: ButtonProps) {
  const { colors, components, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);

  const isDisabled = disabled || loading;
  const currentTitle = loading ? (loadingTitle || title) : title;

  const intent =
    variant === 'destructive'
      ? {
          ...components.button.destructive,
          border: components.button.destructive.background,
        }
      : variant === 'primary'
        ? {
            ...components.button.primary,
            border: components.button.primary.background,
          }
        : variant === 'secondary'
          ? {
              ...components.button.secondary,
              border: colors.border.default,
            }
          : {
              background: 'transparent',
              pressed: colors.surface.selected,
              foreground:
                variant === 'outline'
                  ? colors.brand.primary
                  : colors.text.primary,
              border:
                variant === 'outline'
                  ? colors.border.selected
                  : 'transparent',
            };

  const handlePress: PressableProps['onPress'] = (event) => {
    if (isDisabled) return;

    if (Platform.OS !== 'web') {
      void (
        variant === 'destructive'
          ? Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            )
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      );
    }

    onPress?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={currentTitle}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      onPress={handlePress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          minHeight: 48,
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
          backgroundColor: pressed ? intent.pressed : intent.background,
          opacity: isDisabled ? 0.65 : 1,
          transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
          ...(Platform.OS === 'web'
            ? ({
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: reducedMotion ? 'none' : 'all 150ms ease',
              } as any)
            : {}),
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner color={intent.foreground} size="small" />
          <Text
            color={intent.foreground}
            weight="medium"
            style={textStyle}
          >
            {currentTitle}
          </Text>
        </>
      ) : (
        <>
          {leftIcon}

          <Text
            color={intent.foreground}
            weight="medium"
            style={textStyle}
          >
            {title}
          </Text>

          {rightIcon}
        </>
      )}
    </Pressable>
  );
}