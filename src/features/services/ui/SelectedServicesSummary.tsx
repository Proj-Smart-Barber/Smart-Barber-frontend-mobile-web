import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text, Button } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
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
  onProceed?: () => void;
}

/**
 * Componente de Resumo de Seleção de Serviços (P06)
 * Barra flutuante adaptativa (empilha em 320px) e modal com rolagem interna
 * que conduz diretamente à etapa de agendamento.
 */
export function SelectedServicesSummary({
  selectedServices,
  totalPriceInCents,
  totalDurationInMinutes,
  onClear,
  isModalOpen,
  onOpenModal,
  onCloseModal,
  onProceed,
}: SelectedServicesSummaryProps) {
  const { colors, spacing, radius, components } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();

  if (selectedServices.length === 0) {
    return null;
  }

  const count = selectedServices.length;

  return (
    <>
      {/* Barra Flutuante Inferior Adaptativa */}
      <LiquidGlassView
        variant="form"
        elevated
        borderRadius={0}
        borderWidth={1}
        borderColor={colors.border.default}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
        contentStyle={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[3],
          paddingBottom: Math.max(insets.bottom, spacing[3]),
        }}
      >
        <View
          style={{
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: spacing[3],
          }}
        >
          {/* Informações de Total */}
          <View style={{ flex: isCompact ? undefined : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="caption" weight="medium" color={colors.text.secondary}>
                {count === 1 ? '1 serviço selecionado' : `${count} serviços selecionados`}
              </Text>
              <Pressable
                onPress={onClear}
                accessibilityRole="button"
                accessibilityLabel="Limpar seleção de serviços"
                hitSlop={8}
                style={{ minWidth: 44, minHeight: 24, justifyContent: 'center' }}
              >
                <Text variant="caption" color={colors.feedback.error}>
                  (limpar)
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2], marginTop: 2 }}>
              <Text variant="price" weight="bold" color={colors.text.brand}>
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
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            onPress={onProceed ?? onOpenModal}
            style={{
              minHeight: 46,
              paddingHorizontal: spacing[4],
              width: isCompact ? '100%' : 'auto',
            }}
          />
        </View>
      </LiquidGlassView>

      {/* Modal Rolável de Resumo */}
      <Modal
        visible={isModalOpen}
        animationType="fade"
        transparent
        onRequestClose={onCloseModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background.overlay,
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing[4],
          }}
        >
          <LiquidGlassView
            variant="form"
            elevated
            autoHeight={false}
            borderRadius={radius.xl}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '88%',
            }}
          >
            {/* Header com botão de fechar acessível */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing[5],
                paddingTop: spacing[5],
                paddingBottom: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: colors.border.default,
              }}
            >
              <Text variant="h2" weight="bold" color={colors.text.primary}>
                Serviços Selecionados
              </Text>

              <Pressable
                onPress={onCloseModal}
                accessibilityRole="button"
                accessibilityLabel="Fechar resumo"
                hitSlop={8}
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.full,
                  backgroundColor: pressed ? colors.surface.selected : 'transparent',
                })}
              >
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            </View>

            {/* Conteúdo rolável */}
            <ScrollView
              contentContainerStyle={{
                padding: spacing[5],
                gap: spacing[4],
              }}
            >
              <Text variant="bodySm" color={colors.text.secondary}>
                Resumo dos itens escolhidos para esta barbearia:
              </Text>

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
                      gap: spacing[2],
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

              <Button
                title="Continuar para Agendamento"
                variant="primary"
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
                onPress={() => {
                  onCloseModal();
                  onProceed?.();
                }}
                style={{ minHeight: 46, width: '100%', marginTop: spacing[2] }}
              />
            </ScrollView>
          </LiquidGlassView>
        </View>
      </Modal>
    </>
  );
}
