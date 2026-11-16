import React from 'react';
import { Image, View, StyleSheet, } from 'react-native';
import { BrandMark } from '../brand';
import { useTheme, useReducedMotion } from '../theme';
/**
 * BrandLoadingIndicator
 *
 * Indicador de carregamento com monograma de marca para esperas bloqueantes apropriadas.
 * - Sem fundo próprio (background), placa preta/vermelha ou hacks de blend.
 * - Não acumula segundo spinner para a mesma operação.
 * - Desmontado imediatamente quando busy=false ou visible=false.
 * - Com movimento reduzido ativo ou sem animatedSource, exibe o BrandMark estático oficial do tema.
 */
export function BrandLoadingIndicator({ busy = true, visible = true, size = 64, animatedSource, accessibilityLabel = 'Carregando…', style, testID, }) {
    const { isDark } = useTheme();
    const reducedMotion = useReducedMotion();
    const [hasError, setHasError] = React.useState(false);
    if (!busy || !visible) {
        return null;
    }
    const shouldUseStaticFallback = reducedMotion || !animatedSource || hasError;
    return (<View testID={testID} accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityState={{ busy: true }} style={[
            styles.container,
            {
                width: size,
                height: size,
            },
            style,
        ]}>
      {shouldUseStaticFallback ? (<BrandMark variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} size={size} decorative={false} accessibilityLabel={accessibilityLabel}/>) : (<Image source={animatedSource} accessibilityRole="image" accessibilityLabel={accessibilityLabel} resizeMode="contain" onError={() => setHasError(true)} style={{ width: size, height: size }}/>)}
    </View>);
}
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
});
