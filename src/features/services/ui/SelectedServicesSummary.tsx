import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
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

/**
 * Componente de Resumo de Seleção de Serviços (P06)
 * Barra flutuante adaptativa (empilha em 320px) e modal com rolagem interna
 * que comunica com clareza factual que a escolha NÃO constitui reserva efetuada.
 */
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
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();

  if (selectedServices.length === 0) {
    return null;
  }

  const count = selectedServices.length;

  return (
    <>
      {/* Barra Flutuante Inferior Adaptativa */}
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
            title="Revisar Escolha"
            variant="primary"
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            onPress={onOpenModal}
            style={{
              minHeight: 46,
              paddingHorizontal: spacing[4],
              width: isCompact ? '100%' : 'auto',
            }}
          />
        </View>
      </View>

      {/* Modal Rolável de Resumo e Transparência */}
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
              maxHeight: '88%',
              backgroundColor: components.card.background,
              borderRadius: radius.xl,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.border.default,
              overflow: 'hidden',
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

              {/* Aviso Transparente Obrigatório: NÃO É RESERVA CONCLUÍDA */}
              <View
                style={{
                  backgroundColor: colors.background.card,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.brand.primary,
                  padding: spacing[3],
                  borderRadius: radius.sm,
                  gap: 4,
                }}
              >
                <Text variant="caption" weight="bold" color={colors.text.primary}>
                  Aviso sobre agendamento
                </Text>
                <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 18 }}>
                  A seleção destes serviços ainda não constitui nem garante uma reserva confirmada. A escolha de data, horário e barbeiro estará disponível na próxima atualização do Smart Barber.
                </Text>
              </View>

              <Button
                title="Entendido"
                variant="primary"
                onPress={onCloseModal}
                style={{ minHeight: 46, width: '100%', marginTop: spacing[2] }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
