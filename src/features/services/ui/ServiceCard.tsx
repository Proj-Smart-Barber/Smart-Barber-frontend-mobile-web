import React from 'react';
import { View, Pressable, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/shared/theme';
import { Text, Badge } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import type { Service } from '../model/service.types';
import { formatPrice, formatDuration } from '../model/service.types';

export interface ServiceCardProps {
  service: Service;
  isManagement?: boolean;
  onEdit?: (service: Service) => void;
  onToggleActive?: (service: Service, nextActive: boolean) => void;
  isToggling?: boolean;
  isSelected?: boolean;
  onSelect?: (service: Service) => void;
}

export function ServiceCard({
  service,
  isManagement = false,
  onEdit,
  onToggleActive,
  isToggling = false,
  isSelected = false,
  onSelect,
}: ServiceCardProps) {
  const { colors, radius, spacing, components, isDark } = useTheme();

  const handlePress = () => {
    if (onSelect) {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSelect(service);
    }
  };

  const handleToggle = (value: boolean) => {
    if (onToggleActive) {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onToggleActive(service, value);
    }
  };

  return (
    <LiquidGlassView
      variant="card"
      elevated
      borderColor={isSelected ? colors.brand.primary : undefined}
      borderWidth={isSelected ? 1.5 : 1}
      style={{
        width: '100%',
        marginVertical: spacing[1],
        opacity: service.isActive || isManagement ? 1 : 0.82,
      }}
      contentStyle={{
        padding: spacing[4],
      }}
    >
      <Pressable
        onPress={onSelect ? handlePress : undefined}
        disabled={!onSelect}
        accessibilityRole={onSelect ? 'checkbox' : 'none'}
        accessibilityState={{
          checked: isSelected,
        }}
        accessibilityLabel={`${service.title}, ${formatPrice(service.priceInCents)}, duração ${formatDuration(service.durationInMinutes)}`}
        style={({ pressed }) => [
          {
            opacity: pressed && onSelect ? 0.85 : 1,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing[3],
          }}
        >
          {/* Lado esquerdo: Seleção ou Título */}
          <View style={{ flex: 1, gap: spacing[1] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              {onSelect && (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: radius.full,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? colors.brand.primary
                      : colors.border.default,
                    backgroundColor: isSelected
                      ? colors.brand.primary
                      : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              )}

            <Text
              variant="h3"
              weight="bold"
              color={colors.text.primary}
              numberOfLines={2}
              style={{ flex: 1, fontSize: 16 }}
            >
              {service.title}
            </Text>
          </View>

          {service.description ? (
            <Text
              variant="caption"
              color={colors.text.secondary}
              numberOfLines={2}
              style={{ marginTop: 2, lineHeight: 18 }}
            >
              {service.description}
            </Text>
          ) : null}

          {/* Preço e Duração */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing[3],
              marginTop: spacing[2],
            }}
          >
            <Text
              variant="price"
              weight="bold"
              color={colors.text.brand}
              style={{ fontSize: 16 }}
            >
              {formatPrice(service.priceInCents)}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.text.muted}
              />
              <Text variant="caption" color={colors.text.muted}>
                {formatDuration(service.durationInMinutes)}
              </Text>
            </View>

            {isManagement && (
              <Badge
                label={
                  isToggling
                    ? 'Atualizando…'
                    : service.isActive
                      ? 'Ativo'
                      : 'Inativo'
                }
                tone={
                  isToggling
                    ? 'pending'
                    : service.isActive
                      ? 'success'
                      : 'error'
                }
                style={{ marginLeft: 'auto' }}
              />
            )}
          </View>
        </View>

        {/* Lado direito: Ações de Gestão (Owner) */}
        {isManagement && (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[2],
              paddingLeft: spacing[2],
            }}
          >
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Switch
                value={service.isActive}
                onValueChange={handleToggle}
                disabled={isToggling}
                trackColor={{
                  false: colors.surface.elevated,
                  true: colors.brand.primary,
                }}
                thumbColor={isDark ? '#F7F5F3' : '#FFFFFF'}
                {...({
                  activeThumbColor: isDark ? '#F7F5F3' : '#FFFFFF',
                  activeTrackColor: colors.brand.primary,
                } as any)}
                ios_backgroundColor={colors.surface.elevated}
              />
            </View>

            {onEdit && (
              <Pressable
                onPress={() => onEdit(service)}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${service.title}`}
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: pressed
                    ? colors.surface.selected
                    : 'transparent',
                })}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.text.secondary}
                />
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  </LiquidGlassView>
  );
}
