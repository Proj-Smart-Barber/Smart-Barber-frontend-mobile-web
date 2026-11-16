import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Text } from './Text';
export function Alert({ variant = 'error', message, title, style }) {
    const { colors, radius, spacing } = useTheme();
    const config = variant === 'success' ? { icon: 'checkmark-circle', fg: colors.feedback.success, bg: colors.feedback.successBackground, border: colors.feedback.successBorder } : variant === 'warning' ? { icon: 'warning', fg: colors.feedback.warning, bg: colors.feedback.warningBackground, border: colors.feedback.warningBorder } : variant === 'info' ? { icon: 'information-circle', fg: colors.feedback.info, bg: colors.feedback.infoBackground, border: colors.feedback.infoBorder } : { icon: 'alert-circle', fg: colors.feedback.error, bg: colors.feedback.errorBackground, border: colors.feedback.errorBorder };
    return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[{ width: '100%', flexDirection: 'row', gap: spacing[2], padding: spacing[3], marginBottom: spacing[4], backgroundColor: config.bg, borderColor: config.border, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous' }, style]}><Ionicons name={config.icon} size={20} color={config.fg}/><View style={{ flex: 1, gap: spacing[1] }}>{title ? <Text variant="bodySm" weight="semibold" color={config.fg}>{title}</Text> : null}<Text variant="bodySm" color={colors.text.primary}>{message}</Text></View></View>;
}
