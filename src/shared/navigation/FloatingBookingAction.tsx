import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/shared/theme';

interface FloatingBookingActionProps {
  bottom: number;
  right?: number;
  enabled: boolean;
  onPress: () => void;
}

export function FloatingBookingAction({
  bottom,
  right = 24,
  enabled,
  onPress,
}: FloatingBookingActionProps) {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right, bottom, zIndex: 95, elevation: 12 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Novo agendamento"
        accessibilityHint={enabled
          ? 'Abre a criação de um novo agendamento.'
          : 'Esta barbearia está inativa e não pode receber novos agendamentos.'}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 28,
          backgroundColor: enabled ? colors.brand.primary : colors.text.disabled,
          opacity: pressed && enabled ? 0.82 : 1,
          shadowColor: colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.34,
          shadowRadius: 8,
          elevation: 8,
        })}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
