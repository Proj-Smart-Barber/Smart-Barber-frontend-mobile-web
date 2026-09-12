import { Alert, Platform } from 'react-native';

interface ConfirmDestructiveActionOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

/**
 * Confirmação para ações irreversíveis da Agenda.
 *
 * No nativo usa `Alert.alert` com botão destrutivo; na Web o `Alert` do
 * react-native-web não exibe diálogo, então usamos `window.confirm`.
 */
export function confirmDestructiveAction({
  title,
  message,
  confirmLabel,
  cancelLabel,
}: ConfirmDestructiveActionOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(false);
    }

    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
