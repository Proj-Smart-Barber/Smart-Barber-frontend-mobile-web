import React, { useState, forwardRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput, TextInputProps } from './TextInput';
import { useTheme } from '../theme';

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {}

export const PasswordInput = forwardRef<any, PasswordInputProps>(function PasswordInput(
  props,
  ref
) {
  const [isVisible, setIsVisible] = useState(false);
  const { colors, spacing } = useTheme();

  return (
    <TextInput
      ref={ref}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      rightIcon={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Ocultar senha' : 'Ver senha'}
          accessibilityHint="Alterna a visibilidade dos caracteres da senha"
          onPress={() => setIsVisible((prev) => !prev)}
          style={[styles.toggleButton, { minWidth: spacing.minTouchTarget, minHeight: spacing.minTouchTarget }]}
          hitSlop={8}
        >
          <Ionicons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>
      }
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  toggleButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
