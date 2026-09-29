import React from 'react';
import { View } from 'react-native';
import { BrandMark } from '../brand';
import { useTheme } from '../theme';
import { Spinner } from './Spinner';
import { Text } from './Text';

export interface BootstrapScreenProps {
  message?: string;
}

/**
 * Tela de Bootstrap e Transição de Abertura (P01).
 * Equaliza dimensões com a splash screen nativa (app.json imageWidth: 200 / glifo ~136px),
 * preservando o fundo idêntico (#0B0B0B escuro / #F7F5F3 claro) e informando o estado factual da inicialização.
 */
export function BootstrapScreen({
  message = 'Verificando sua sessão…',
}: BootstrapScreenProps) {
  const { colors, spacing, isDark } = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[6],
        padding: spacing[6],
        backgroundColor: colors.background.primary,
      }}
    >
      <BrandMark
        variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
        size={136}
        decorative={false}
      />
      <Spinner size="large" color={colors.brand.primary} />
      <Text
        variant="bodySm"
        align="center"
        color={colors.text.secondary}
        style={{ letterSpacing: 0.2 }}
      >
        {message}
      </Text>
    </View>
  );
}
