import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text, Badge, Skeleton, EmptyState } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { ProfessionalDto } from '../api/bookings.dto';

export interface ProfessionalPickerProps {
  professionals: ProfessionalDto[];
  selectedProfessionalId: string | null;
  onSelectProfessional: (id: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ProfessionalPicker({
  professionals,
  selectedProfessionalId,
  onSelectProfessional,
  isLoading = false,
  disabled = false,
}: ProfessionalPickerProps) {
  const { colors, spacing, radius } = useTheme();

  if (isLoading) {
    return (
      <View style={{ gap: spacing[3] }}>
        <Skeleton height={72} borderRadius={radius.lg} />
        <Skeleton height={72} borderRadius={radius.lg} />
        <Skeleton height={72} borderRadius={radius.lg} />
      </View>
    );
  }

  if (professionals.length === 0) {
    return (
      <EmptyState
        title="Nenhum profissional disponível"
        description="Esta unidade não possui profissionais com disponibilidade no momento."
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: spacing[2] }}>
      {professionals.map((prof) => {
        const isSelected = prof.id === selectedProfessionalId;

        return (
          <Pressable
            key={prof.id}
            onPress={() => !disabled && onSelectProfessional(prof.id)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Selecionar profissional ${prof.name}`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => ({
              opacity: disabled ? 0.7 : pressed ? 0.85 : 1,
            })}
          >
            <LiquidGlassView
              variant="card"
              elevated={isSelected}
              borderRadius={radius.lg}
              borderColor={isSelected ? colors.brand.primary : colors.border.default}
              borderWidth={isSelected ? 2 : 1}
              contentStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                minHeight: 64,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.full,
                    backgroundColor: isSelected ? colors.brand.primary : colors.surface.default,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color={isSelected ? '#FFFFFF' : colors.text.secondary}
                  />
                </View>

                <View style={{ gap: 2 }}>
                  <Text variant="body" weight="bold" color={colors.text.primary}>
                    {prof.name}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {prof.role === 'OWNER' ? 'Proprietário & Barbeiro' : 'Barbeiro Profissional'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                {isSelected ? (
                  <Badge label="Selecionado" tone="brand" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
                )}
              </View>
            </LiquidGlassView>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
