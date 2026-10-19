import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';

/** 'menu' não descarta o rascunho (a tela permanece na pilha), mas exige confirmação por ser ponto de saída. */
export function confirmScheduleDiscard(action: () => void, intent: 'discard' | 'menu' = 'discard') {
  if (intent === 'menu') {
    if (Platform.OS === 'web') {
      if (window.confirm('Você tem alterações não salvas na sua jornada. Abrir o menu?')) action();
    } else Alert.alert('Alterações não salvas', 'Sua edição da jornada continua nesta tela se você voltar.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Abrir menu', onPress: action },
    ]);
    return;
  }
  if (Platform.OS === 'web') {
    if (window.confirm('Descartar as alterações não salvas da sua jornada?')) action();
  } else Alert.alert('Descartar alterações?', 'Sua edição da jornada será perdida.', [
    { text: 'Continuar editando', style: 'cancel' },
    { text: 'Descartar', style: 'destructive', onPress: action },
  ]);
}

export function useUnsavedScheduleGuard(dirty: boolean, busy: boolean) {
  const navigation = useNavigation();
  usePreventRemove(dirty || busy, ({ data }) => {
    if (busy) return;
    confirmScheduleDiscard(() => navigation.dispatch(data.action));
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || (!dirty && !busy)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
}
