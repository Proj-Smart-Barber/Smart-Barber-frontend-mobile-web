import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
/** 'menu' não descarta o rascunho (a tela permanece na pilha), mas exige confirmação por ser ponto de saída. */
export function confirmScheduleDiscard(action, intent = 'discard') {
    if (intent === 'menu') {
        if (Platform.OS === 'web') {
            if (window.confirm('Você tem alterações não salvas na sua jornada. Abrir o menu?'))
                action();
        }
        else
            Alert.alert('Alterações não salvas', 'Sua edição da jornada continua nesta tela se você voltar.', [
                { text: 'Continuar editando', style: 'cancel' },
                { text: 'Abrir menu', onPress: action },
            ]);
        return;
    }
    if (Platform.OS === 'web') {
        if (window.confirm('Descartar as alterações não salvas da sua jornada?'))
            action();
    }
    else
        Alert.alert('Descartar alterações?', 'Sua edição da jornada será perdida.', [
            { text: 'Continuar editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: action },
        ]);
}
export function useUnsavedScheduleGuard(dirty, busy) {
    const navigation = useNavigation();
    const allowed = useRef(false);
    useEffect(() => {
        allowed.current = false;
        return navigation.addListener('beforeRemove', (event) => {
            if (allowed.current || (!dirty && !busy))
                return;
            event.preventDefault();
            if (busy)
                return;
            confirmScheduleDiscard(() => {
                allowed.current = true;
                navigation.dispatch(event.data.action);
            });
        });
    }, [navigation, dirty, busy]);
    useEffect(() => {
        if (Platform.OS !== 'web' || (!dirty && !busy))
            return;
        const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty, busy]);
}
