import React from 'react';
import { View, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useReducedMotion } from '../theme';
import { Text } from './Text';
import { Spinner } from './Spinner';

export type OperationState = 'idle' | 'pending' | 'success' | 'error';

export interface OperationStatusProps {
  status: OperationState;
  pendingText?: string;
  successText?: string;
  errorText?: string;
  idleText?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente C2: Estado de Operação
 * Inspirado em Status Mark (React Bits) e adaptado universalmente para React Native / Web.
 * Espelha estados assíncronos: idle / pending / success / error com rótulo explícito e ação de retry.
 */
export function OperationStatus({
  status,
  pendingText = 'Processando…',
  successText = 'Operação concluída',
  errorText = 'Falha na operação',
  idleText,
  onRetry,
  style,
}: OperationStatusProps) {
  const { colors, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();

  if (status === 'idle' && !idleText) {
    return null;
  }

  const config = {
    idle: {
      color: colors.text.muted,
      bg: 'transparent',
      border: 'transparent',
      text: idleText || '',
      icon: null,
    },
    pending: {
      color: colors.brand.primary,
      bg: colors.surface.selected,
      border: colors.border.selected,
      text: pendingText,
      icon: <Spinner size="small" color={colors.brand.primary} />,
    },
    success: {
      color: colors.feedback.success,
      bg: colors.feedback.successBackground,
      border: colors.feedback.successBorder,
      text: successText,
      icon: (
        <Ionicons
          name="checkmark-circle"
          size={16}
          color={colors.feedback.success}
        />
      ),
    },
    error: {
      color: colors.feedback.error,
      bg: colors.feedback.errorBackground,
      border: colors.feedback.errorBorder,
      text: errorText,
      icon: (
        <Ionicons
          name="alert-circle"
          size={16}
          color={colors.feedback.error}
        />
      ),
    },
  }[status];

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          borderRadius: radius.md,
          backgroundColor: config.bg,
          borderWidth: config.border !== 'transparent' ? 1 : 0,
          borderColor: config.border,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {config.icon}
      <Text
        variant="caption"
        weight="medium"
        color={config.color}
        style={{ letterSpacing: 0.1 }}
      >
        {config.text}
      </Text>

      {status === 'error' && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Tentar operação novamente"
          hitSlop={8}
          style={{
            marginLeft: spacing[1],
            paddingHorizontal: spacing[2],
            paddingVertical: 2,
            borderRadius: radius.sm,
            backgroundColor: colors.surface.elevated,
          }}
        >
          <Text variant="caption" weight="bold" color={colors.text.primary}>
            Tentar novamente
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
