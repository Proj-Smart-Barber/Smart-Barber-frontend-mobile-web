import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Text, Button, Badge, ErrorState } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { Service } from '@/features/services/model/service.types';
import type { ProfessionalDto } from '../api/bookings.dto';
import type { SelectedSlot, BookingCustomer, BookingMode } from '../model/booking-flow.types';
import type { AuthoritativeQuote } from '../lib/normalize-booking-error';
import { formatPrice, formatDuration } from '@/features/services/model/service.types';
import { setBookingReturnIntent } from '@/features/auth/model/booking-return-intent';

export interface BookingReviewProps {
  mode: BookingMode;
  shopId: string;
  barbershopName?: string;
  selectedServices: Service[];
  selectedProfessional: ProfessionalDto | null;
  selectedDate: string | null;
  selectedSlot: SelectedSlot | null;
  customer: BookingCustomer | null;
  totalPriceInCents: number;
  totalDurationInMinutes: number;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  quoteMismatch: boolean;
  authoritativeQuote?: AuthoritativeQuote | null;
  errorMessage?: string | null;
  onConfirm: () => void;
  onEditServices: () => void;
  onEditSlot: () => void;
}

export function BookingReview({
  mode,
  shopId,
  barbershopName = 'Barbearia',
  selectedServices,
  selectedProfessional,
  selectedDate,
  selectedSlot,
  customer,
  totalPriceInCents,
  totalDurationInMinutes,
  isAuthenticated,
  isSubmitting,
  quoteMismatch,
  authoritativeQuote,
  errorMessage,
  onConfirm,
  onEditServices,
  onEditSlot,
}: BookingReviewProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  // Verifica se o início é a menos de 2h
  const isLessThanTwoHoursFromStart = useMemo(() => {
    if (!selectedSlot?.slotStartAt) return false;
    try {
      const slotTimeMs = Date.parse(selectedSlot.slotStartAt);
      if (Number.isNaN(slotTimeMs)) return false;
      const diffMs = slotTimeMs - Date.now();
      return diffMs > 0 && diffMs < 2 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, [selectedSlot]);

  const handleLoginToConfirm = () => {
    setBookingReturnIntent({ shopId });
    router.push('/(auth)/login' as any);
  };

  return (
    <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[6] }}>
      {/* Alerta de Divergência de Orçamento (QUOTE_CHANGED) */}
      {quoteMismatch && authoritativeQuote && (
        <LiquidGlassView
          variant="card"
          elevated
          borderRadius={radius.lg}
          borderColor={colors.feedback.warning}
          borderWidth={2}
          contentStyle={{ padding: spacing[4], gap: spacing[2] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Ionicons name="alert-circle" size={22} color={colors.feedback.warning} />
            <Text variant="body" weight="bold" color={colors.text.primary}>
              Atualização de Valores e Duração
            </Text>
          </View>

          <Text variant="caption" color={colors.text.secondary}>
            Os valores ou durações dos serviços foram alterados pela barbearia. Confira a nova cotação autorizada antes de confirmar:
          </Text>

          <View
            style={{
              backgroundColor: colors.surface.default,
              borderRadius: radius.md,
              padding: spacing[3],
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color={colors.text.muted}>
                Valor Anterior:
              </Text>
              <Text variant="caption" color={colors.text.muted} style={{ textDecorationLine: 'line-through' }}>
                {formatPrice(totalPriceInCents)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                Novo Valor Autorizado:
              </Text>
              <Text variant="bodySm" weight="bold" color={colors.brand.primary}>
                {formatPrice(authoritativeQuote.totalPriceInCents)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
              <Text variant="caption" color={colors.text.muted}>
                Duração Prevista:
              </Text>
              <Text variant="caption" weight="medium" color={colors.text.primary}>
                {formatDuration(authoritativeQuote.totalDurationInMinutes)}
              </Text>
            </View>
          </View>
        </LiquidGlassView>
      )}

      {/* Mensagem de Erro Geral */}
      {errorMessage && !quoteMismatch && (
        <ErrorState
          title="Não foi possível concluir"
          description={errorMessage}
        />
      )}

      {/* Resumo da Barbearia e Profissional */}
      <LiquidGlassView
        variant="card"
        borderRadius={radius.lg}
        borderColor={colors.border.default}
        borderWidth={1}
        contentStyle={{ padding: spacing[4], gap: spacing[3] }}
      >
        <Text variant="h2" weight="bold" color={colors.text.primary}>
          Detalhes do Atendimento
        </Text>

        <View style={{ gap: spacing[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color={colors.text.muted}>
              Barbearia
            </Text>
            <Text variant="bodySm" weight="medium" color={colors.text.primary}>
              {barbershopName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color={colors.text.muted}>
              Profissional
            </Text>
            <Text variant="bodySm" weight="bold" color={colors.text.primary}>
              {selectedProfessional?.name || 'Não selecionado'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color={colors.text.muted}>
              Data e Horário
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="bodySm" weight="bold" color={colors.brand.primary}>
                {selectedDate} às {selectedSlot?.startTime || '--:--'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color={colors.text.muted}>
              Cliente
            </Text>
            <Text variant="bodySm" weight="medium" color={colors.text.primary}>
              {mode === 'UNIT' ? customer?.name || 'Cliente da unidade' : 'Você (Pessoal)'}
            </Text>
          </View>
        </View>
      </LiquidGlassView>

      {/* Serviços Selecionados */}
      <LiquidGlassView
        variant="card"
        borderRadius={radius.lg}
        borderColor={colors.border.default}
        borderWidth={1}
        contentStyle={{ padding: spacing[4], gap: spacing[3] }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="h2" weight="bold" color={colors.text.primary}>
            Serviços ({selectedServices.length})
          </Text>
          <Button
            title="Alterar"
            variant="ghost"
            onPress={onEditServices}
            style={{ minHeight: 32, paddingHorizontal: spacing[2] }}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          {selectedServices.map((service) => (
            <View
              key={service.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 4,
                borderBottomWidth: 1,
                borderBottomColor: colors.border.default,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodySm" weight="medium" color={colors.text.primary}>
                  {service.title}
                </Text>
                <Text variant="caption" color={colors.text.muted}>
                  {formatDuration(service.durationInMinutes)}
                </Text>
              </View>

              <Text variant="bodySm" weight="bold" color={colors.text.primary}>
                {formatPrice(service.priceInCents)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totais */}
        <View style={{ gap: 4, paddingTop: spacing[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color={colors.text.muted}>
              Duração Total Estimada:
            </Text>
            <Text variant="bodySm" weight="medium" color={colors.text.primary}>
              {formatDuration(totalDurationInMinutes)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="body" weight="bold" color={colors.text.primary}>
              Valor Total Previsto:
            </Text>
            <Text variant="price" weight="bold" color={colors.brand.primary}>
              {formatPrice(quoteMismatch && authoritativeQuote ? authoritativeQuote.totalPriceInCents : totalPriceInCents)}
            </Text>
          </View>
        </View>
      </LiquidGlassView>

      {/* Regras de Cancelamento e Prazos Legais */}
      <View
        style={{
          backgroundColor: colors.surface.default,
          borderRadius: radius.md,
          padding: spacing[3],
          gap: spacing[2],
          borderLeftWidth: 3,
          borderLeftColor: isLessThanTwoHoursFromStart ? colors.feedback.warning : colors.brand.primary,
        }}
      >
        <Text variant="caption" weight="bold" color={colors.text.primary}>
          Política de Cancelamento e Alteração
        </Text>
        <Text variant="caption" color={colors.text.secondary} style={{ lineHeight: 18 }}>
          Cancelamento gratuito disponível até 2 horas antes do horário de início do atendimento.
        </Text>

        {isLessThanTwoHoursFromStart && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Ionicons name="information-circle" size={16} color={colors.feedback.warning} />
            <Text variant="caption" color={colors.feedback.warning} weight="medium" style={{ flex: 1 }}>
              Como o agendamento inicia em menos de 2 horas, o prazo pessoal para cancelamento sem restrições já expirou.
            </Text>
          </View>
        )}
      </View>

      {/* Ação de Confirmação */}
      <View style={{ gap: spacing[3], marginTop: spacing[2] }}>
        {!isAuthenticated && mode === 'PERSONAL' ? (
          <Button
            title="Entrar para Confirmar Agendamento"
            variant="primary"
            rightIcon={<Ionicons name="log-in-outline" size={18} color="#FFFFFF" />}
            onPress={handleLoginToConfirm}
            style={{ minHeight: 48, width: '100%' }}
          />
        ) : (
          <Button
            title={quoteMismatch ? 'Aceitar e Confirmar Novos Valores' : 'Confirmar Agendamento'}
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            rightIcon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
            onPress={onConfirm}
            style={{ minHeight: 48, width: '100%' }}
          />
        )}
      </View>
    </ScrollView>
  );
}
