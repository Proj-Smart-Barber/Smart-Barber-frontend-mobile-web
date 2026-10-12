import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Text, Button } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { findOwnAttempt, closeOwnAttempt } from '@/shared/operations/operation-attempt.api';

export interface BookingRecoveryProps {
  requestId: string;
  onResolvedNotApplied: () => void;
  onResolvedApplied?: () => void;
}

export function BookingRecovery({
  requestId,
  onResolvedNotApplied,
  onResolvedApplied,
}: BookingRecoveryProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCheckOperation = async () => {
    setIsChecking(true);
    setFeedback(null);

    try {
      // 1. Consulta o estado autoritativo da tentativa
      const result = await findOwnAttempt(requestId);

      if (result.state === 'APPLIED') {
        setFeedback('O agendamento foi confirmado pelo servidor! Você pode visualizá-lo em seus agendamentos.');
        onResolvedApplied?.();
      } else if (result.state === 'NOT_APPLIED') {
        // Fecha formalmente a tentativa para liberar nova revisão
        await closeOwnAttempt(requestId);
        setFeedback('A tentativa anterior não foi processada. Você pode revisar e confirmar novamente.');
        onResolvedNotApplied();
      } else {
        setFeedback(
          'A operação permanece em processamento ou aguardando confirmação da rede. Por favor, consulte seus agendamentos antes de tentar novamente.'
        );
      }
    } catch {
      setFeedback('Não foi possível verificar a operação no momento. Tente novamente em instantes.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[6] }}>
      <LiquidGlassView
        variant="card"
        elevated
        borderRadius={radius.xl}
        borderColor={colors.feedback.warning}
        borderWidth={1}
        contentStyle={{
          alignItems: 'center',
          padding: spacing[5],
          gap: spacing[3],
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.full,
            backgroundColor: colors.surface.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="help-circle-outline" size={36} color={colors.feedback.warning} />
        </View>

        <Text variant="h2" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
          Resultado Indefinido
        </Text>

        <Text variant="caption" color={colors.text.secondary} style={{ textAlign: 'center', lineHeight: 20 }}>
          Houve uma oscilação na resposta após o envio. Para evitar agendamentos duplicados, verifique o status autoritativo da operação antes de prosseguir.
        </Text>

        <View
          style={{
            width: '100%',
            backgroundColor: colors.surface.default,
            borderRadius: radius.md,
            padding: spacing[3],
            gap: 4,
          }}
        >
          <Text variant="caption" weight="bold" color={colors.text.primary}>
            Importante:
          </Text>
          <Text variant="caption" color={colors.text.muted} style={{ lineHeight: 18 }}>
            Verificar ou fechar uma tentativa já aplicada pelo servidor NÃO cancela o seu agendamento.
          </Text>
        </View>

        {feedback && (
          <View
            style={{
              width: '100%',
              backgroundColor: colors.background.card,
              borderRadius: radius.md,
              padding: spacing[3],
              borderLeftWidth: 3,
              borderLeftColor: colors.brand.primary,
            }}
          >
            <Text variant="bodySm" color={colors.text.primary}>
              {feedback}
            </Text>
          </View>
        )}

        <View style={{ width: '100%', gap: spacing[2], marginTop: spacing[3] }}>
          <Button
            title="Verificar operação anterior"
            variant="primary"
            loading={isChecking}
            disabled={isChecking}
            rightIcon={<Ionicons name="refresh-outline" size={18} color="#FFFFFF" />}
            onPress={handleCheckOperation}
            style={{ minHeight: 48, width: '100%' }}
          />

          <Button
            title="Ver Meus Agendamentos"
            variant="ghost"
            onPress={() => router.replace('/(client)/bookings' as any)}
            style={{ minHeight: 48, width: '100%' }}
          />
        </View>
      </LiquidGlassView>
    </ScrollView>
  );
}
