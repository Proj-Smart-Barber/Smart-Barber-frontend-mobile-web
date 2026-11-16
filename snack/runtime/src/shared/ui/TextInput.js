import React, { forwardRef, useState } from 'react';
import { Platform, TextInput as RNTextInput, View } from 'react-native';
import { useTheme } from '../theme';
export const TextInput = forwardRef(function TextInput({ error = false, disabled = false, leftIcon, rightIcon, containerStyle, inputStyle, style, onFocus, onBlur, placeholderTextColor, accessibilityState, ...rest }, ref) {
    const { colors, components, spacing, radius, typography } = useTheme();
    const [focused, setFocused] = useState(false);
    const isMultiline = Boolean(rest.multiline);
    const borderColor = error
        ? components.input.errorBorder
        : focused
            ? components.input.focusedBorder
            : components.input.border;
    const inputBackground = disabled
        ? colors.surface.disabled
        : focused
            ? components.input.focusedBackground
            : components.input.background;
    const webInputStyle = Platform.OS === 'web'
        ? {
            outlineStyle: 'solid',
            outlineWidth: 0,
            backgroundColor: 'transparent',
            caretColor: colors.text.primary,
        }
        : undefined;
    return (<View style={[
            {
                minHeight: isMultiline ? 96 : 52,
                flexDirection: 'row',
                alignItems: isMultiline ? 'flex-start' : 'center',
                width: '100%',
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: inputBackground,
                borderColor,
                borderWidth: focused || error ? 2 : 1,
                paddingHorizontal: spacing[3],
                paddingVertical: isMultiline ? 10 : 0,
                opacity: disabled ? 0.55 : 1,
            },
            containerStyle,
        ]}>
      {leftIcon ? (<View style={{
                marginRight: spacing[2],
                marginTop: isMultiline ? spacing[1] : 0,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
          {leftIcon}
        </View>) : null}
      <RNTextInput ref={ref} editable={!disabled} onFocus={(event) => {
            setFocused(true);
            onFocus === null || onFocus === void 0 ? void 0 : onFocus(event);
        }} onBlur={(event) => {
            setFocused(false);
            onBlur === null || onBlur === void 0 ? void 0 : onBlur(event);
        }} placeholderTextColor={placeholderTextColor !== null && placeholderTextColor !== void 0 ? placeholderTextColor : colors.text.muted} accessibilityState={{ disabled, ...accessibilityState }} accessibilityHint={error
            ? 'Campo com erro. Verifique a mensagem de validação.'
            : rest.accessibilityHint} {...rest} style={[
            {
                flex: 1,
                width: '100%',
                minHeight: isMultiline ? 76 : 50,
                paddingVertical: spacing[2],
                color: colors.text.primary,
                backgroundColor: 'transparent',
                ...(isMultiline ? { textAlignVertical: 'top' } : {}),
                ...typography.styles.body,
            },
            webInputStyle,
            inputStyle,
            style,
        ]}/>
      {rightIcon ? (<View style={{
                marginLeft: spacing[2],
                marginTop: isMultiline ? spacing[1] : 0,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
          {rightIcon}
        </View>) : null}
    </View>);
});
