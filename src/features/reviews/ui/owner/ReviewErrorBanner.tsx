import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';

interface ReviewErrorBannerProps {
  error: unknown;
  hasCachedData?: boolean;
  onRetry: () => void;
  onRelogin?: () => void;
}

function classifyError(error: unknown): {
  kind: 'unauthorized' | 'forbidden' | 'offline' | 'generic';
  title: string;
  description: string;
} {
  const errObj = error as { status?: number; isNetworkError?: boolean; message?: string } | null;
  const status = errObj?.status;
  const isNetwork =
    errObj?.isNetworkError === true ||
    status === 0 ||
    (typeof errObj?.message === 'string' &&
      /network|fetch|offline|internet/i.test(errObj.message));

  if (status === 401) {
    return {
      kind: 'unauthorized',
      title: 'Sessão expirada',
      description: 'Sua sessão expirou. Faça login novamente para visualizar os indicadores.',
    };
  }

  if (status === 403) {
    return {
      kind: 'forbidden',
      title: 'Acesso negado',
      description:
        'Apenas o proprietário ativo da unidade pode acessar os dados gerenciais de avaliações.',
    };
  }

  if (isNetwork) {
    return {
      kind: 'offline',
      title: 'Sem conexão com a internet',
      description: 'Não foi possível atualizar os dados no momento. Verifique sua conexão.',
    };
  }

  return {
    kind: 'generic',
    title: 'Erro ao carregar avaliações',
    description:
      errObj?.message || 'Não foi possível buscar os indicadores da unidade. Tente novamente.',
  };
}

export function ReviewErrorBanner({
  error,
  hasCachedData = false,
  onRetry,
  onRelogin,
}: ReviewErrorBannerProps) {
  const { colors, spacing, radius } = useTheme();
  const info = classifyError(error);

  const iconName =
    info.kind === 'offline'
      ? 'cloud-offline-outline'
      : info.kind === 'forbidden' || info.kind === 'unauthorized'
        ? 'lock-closed-outline'
        : 'alert-circle-outline';

  const toneColor =
    info.kind === 'offline' || info.kind === 'forbidden'
      ? colors.feedback.warning
      : colors.feedback.error;

  return (
    <LiquidGlassView
      variant="card"
      elevated
      style={{ borderRadius: radius.lg }}
      contentStyle={{ padding: spacing[4], gap: spacing[3] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Ionicons name={iconName} size={24} color={toneColor} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodySm" weight="bold" color={colors.text.primary}>
            {info.title}
          </Text>
          <Text variant="caption" color={colors.text.secondary}>
            {info.description}
          </Text>
          {hasCachedData ? (
            <Text variant="caption" color={colors.text.muted}>
              Exibindo os últimos dados salvos em cache.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {info.kind === 'unauthorized' && onRelogin ? (
          <Button title="Fazer login" variant="primary" onPress={onRelogin} />
        ) : null}
        {info.kind !== 'forbidden' ? (
          <Button title="Tentar novamente" variant="secondary" onPress={onRetry} />
        ) : null}
      </View>
    </LiquidGlassView>
  );
}
