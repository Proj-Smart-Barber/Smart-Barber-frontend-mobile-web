import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';

export interface SessionRecoveryScreenProps {
  onRetry: () => Promise<void> | void;
  onSwitchAccount: () => Promise<void> | void;
  isRetrying?: boolean;
  errorMessage?: string | null;
}

/**
 * Tela de Recuperação de Sessão (P01)
 * Apresentada quando ocorre falha temporária ao verificar a sessão (sem conexão ou 5xx).
 * Preserva o token do usuário e fornece opções honestas de recuperação sem jogá-lo silenciosamente no login.
 */
export function SessionRecoveryScreen({
  onRetry,
  onSwitchAccount,
  isRetrying = false,
  errorMessage,
}: SessionRecoveryScreenProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { formMaxWidth } = useAdaptiveLayout();

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          backgroundColor: colors.background.primary,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
        },
        webBackgroundStyle,
      ]}
    >
      <LiquidGlassView
        variant="form"
        elevated
        style={{
          width: '100%',
          maxWidth: formMaxWidth,
        }}
        contentStyle={{
          alignItems: 'center',
          gap: spacing[5],
          padding: spacing[6],
        }}
      >
        <BrandMark
          variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
          size={80}
          decorative={false}
        />

        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.full,
            backgroundColor: colors.feedback.warningBackground,
            borderWidth: 1,
            borderColor: colors.feedback.warningBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={26}
            color={colors.feedback.warning}
          />
        </View>

        <View style={{ gap: spacing[2], alignItems: 'center' }}>
          <Text
            variant="h2"
            weight="bold"
            align="center"
            color={colors.text.primary}
          >
            Não foi possível verificar sua sessão
          </Text>

          <Text
            variant="bodySm"
            align="center"
            color={colors.text.secondary}
            style={{ lineHeight: 20 }}
          >
            {errorMessage ||
              'Ocorreu uma instabilidade na conexão com os servidores do Smart Barber. Seus dados continuam salvos com segurança.'}
          </Text>
        </View>

        <View style={{ width: '100%', gap: spacing[3], marginTop: spacing[2] }}>
          <Button
            title="Tentar novamente"
            loadingTitle="Verificando…"
            variant="primary"
            loading={isRetrying}
            disabled={isRetrying}
            onPress={onRetry}
            style={{ width: '100%' }}
          />

          <Button
            title="Entrar com outra conta"
            variant="ghost"
            disabled={isRetrying}
            onPress={onSwitchAccount}
            style={{ width: '100%' }}
          />
        </View>
      </LiquidGlassView>
    </SafeAreaView>
  );
}
