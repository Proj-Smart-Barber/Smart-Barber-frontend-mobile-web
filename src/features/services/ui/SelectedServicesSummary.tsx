import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text, Button } from '@/shared/ui';
import type { Service } from '../model/service.types';
import { formatPrice, formatDuration } from '../model/service.types';

export interface SelectedServicesSummaryProps {
  selectedServices: Service[];
  totalPriceInCents: number;
  totalDurationInMinutes: number;
  onClear: () => void;
  isModalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export function SelectedServicesSummary({
  selectedServices,
  totalPriceInCents,
  totalDurationInMinutes,
  onClear,
  isModalOpen,
  onOpenModal,
  onCloseModal,
}: SelectedServicesSummaryProps) {
  const { colors, spacing, radius, components } = useTheme();
  const insets = useSafeAreaInsets();

  if (selectedServices.length === 0) {
    return null;
  }

  const count = selectedServices.length;

  return (
    <>
      {/* Barra Flutuante Inferior */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: components.card.background,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
          paddingHorizontal: spacing[4],
          paddingTop: spacing[3],
          paddingBottom: Math.max(insets.bottom, spacing[3]),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <View
          style={{
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[3],
          }}
        >
          {/* Informações de Total */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="caption" weight="medium" color={colors.text.secondary}>
                {count === 1 ? '1 serviço selecionado' : `${count} serviços selecionados`}
              </Text>
              <Pressable
                onPress={onClear}
                accessibilityRole="button"
                accessibilityLabel="Limpar seleção"
                hitSlop={8}
              >
                <Text variant="caption" color={colors.feedback.error}>
                  (limpar)
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2], marginTop: 2 }}>
              <Text variant="price" weight="bold" color={colors.brand.primary}>
                {formatPrice(totalPriceInCents)}
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                • {formatDuration(totalDurationInMinutes)}
              </Text>
            </View>
          </View>

          {/* Botão de Ação */}
          <Button
            title="Continuar"
            variant="primary"
            rightIcon={<Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />}
            onPress={onOpenModal}
            style={{ minHeight: 46, paddingHorizontal: spacing[4] }}
          />
        </View>
      </View>

      {/* Modal de Transparência / Handoff */}
      <Modal
        visible={isModalOpen}
        animationType="fade"
        transparent
        onRequestClose={onCloseModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing[4],
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: components.card.background,
              borderRadius: radius.xl,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.border.default,
              padding: spacing[6],
              gap: spacing[4],
            }}
          >
            {/* Ícone de status */}
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.full,
                backgroundColor: colors.surface.selected,
                borderWidth: 1,
                borderColor: colors.border.selected,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={32}
                color={colors.brand.primary}
              />
            </View>

            <View style={{ alignItems: 'center', gap: spacing[1] }}>
              <Text variant="h2" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Seleção de Serviços Concluída!
              </Text>
              <Text variant="body" color={colors.text.secondary} style={{ textAlign: 'center' }}>
                Resumo da sua escolha para agendamento:
              </Text>
            </View>

            {/* Lista dos serviços selecionados */}
            <View
              style={{
                backgroundColor: colors.surface.default,
                borderRadius: radius.md,
                padding: spacing[3],
                gap: spacing[2],
              }}
            >
              {selectedServices.map((service) => (
                <View
                  key={service.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text variant="caption" weight="medium" color={colors.text.primary} style={{ flex: 1 }}>
                    • {service.title}
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    {formatPrice(service.priceInCents)} ({formatDuration(service.durationInMinutes)})
                  </Text>
                </View>
              ))}

              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border.default,
                  marginVertical: 4,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text variant="caption" weight="bold" color={colors.text.primary}>
                  Total Previsto ({formatDuration(totalDurationInMinutes)}):
                </Text>
                <Text variant="body" weight="bold" color={colors.brand.primary}>
                  {formatPrice(totalPriceInCents)}
                </Text>
              </View>
            </View>

            {/* Aviso transparente sobre a próxima fase */}
            <View
              style={{
                backgroundColor: colors.background.card,
                borderLeftWidth: 3,
                borderLeftColor: colors.brand.primary,
                padding: spacing[3],
                borderRadius: radius.sm,
              }}
            >
              <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 18 }}>
                O agendamento de horários em tempo real e a seleção de barbeiros estão em fase final de homologação e estarão disponíveis na próxima atualização do Smart Barber.
              </Text>
            </View>

            <Button
              title="Entendido"
              variant="primary"
              onPress={onCloseModal}
              style={{ minHeight: 46 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
