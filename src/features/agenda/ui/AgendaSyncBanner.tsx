import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Alert } from '@/shared/ui';
import { AgendaActionButton } from './AgendaActionButton';

interface AgendaSyncBannerProps {
  isErrorWithCachedData: boolean;
  errorTitle: string;
  errorDescription: string;
  isSlowSync: boolean;
  isDataStale: boolean;
  onRetry: () => void;
}

/**
 * Área de avisos da agenda: exibe no máximo um aviso por vez,
 * em ordem de prioridade (erro > lentidão > desatualização),
 * sem bloquear os dados em cache.
 */
export function AgendaSyncBanner({
  isErrorWithCachedData,
  errorTitle,
  errorDescription,
  isSlowSync,
  isDataStale,
  onRetry,
}: AgendaSyncBannerProps) {
  const { spacing } = useTheme();

  if (isErrorWithCachedData) {
    return (
      <View style={{ gap: spacing[2], width: '100%' }}>
        <Alert variant="error" title={errorTitle} message={errorDescription} />
        <AgendaActionButton
          tone="success"
          title="Tentar novamente"
          onPress={onRetry}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  if (isSlowSync) {
    return (
      <Alert
        variant="warning"
        title="Atualização demorando"
        message="A sincronização da agenda está lenta agora. Você está vendo a última versão carregada."
        style={{ marginBottom: 0 }}
      />
    );
  }

  if (isDataStale) {
    return (
      <View style={{ gap: spacing[2], width: '100%' }}>
        <Alert
          variant="info"
          title="Dados podem estar desatualizados"
          message="Faz alguns minutos sem sincronizar esta agenda. Confirme os horários ao decidir."
        />
        <AgendaActionButton
          tone="success"
          title="Atualizar agora"
          onPress={onRetry}
          style={{ alignSelf: 'flex-start' }}
        />
      </View>
    );
  }

  return null;
}
