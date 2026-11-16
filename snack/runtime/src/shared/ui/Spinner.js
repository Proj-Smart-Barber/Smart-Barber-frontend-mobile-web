import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
export function Spinner({ color, size = 'small', style, ...rest }) {
    const { colors } = useTheme();
    return (<View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color || colors.brand.primary} {...rest}/>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
