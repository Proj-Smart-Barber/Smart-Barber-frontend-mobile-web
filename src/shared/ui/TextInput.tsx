import React, { forwardRef, useState } from 'react';
import { Platform, StyleProp, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export interface TextInputProps extends RNTextInputProps {
  error?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

type WebTextInputStyle = TextStyle & {
  WebkitTextFillColor?: string;
  caretColor?: string;
};

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ error = false, disabled = false, leftIcon, rightIcon, containerStyle, inputStyle, onFocus, onBlur, placeholderTextColor, accessibilityState, ...rest }, ref) {
  const { colors, components, spacing, radius, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? components.input.errorBorder : focused ? components.input.focusedBorder : components.input.border;
  const inputBackground = disabled ? colors.surface.disabled : focused ? components.input.focusedBackground : components.input.background;
  const webInputStyle: WebTextInputStyle | undefined = Platform.OS === 'web'
    ? {
        outlineStyle: 'solid',
        outlineWidth: 0,
        // Browsers apply a light autofill paint to saved credentials. The inset shadow
        // keeps that browser-only state on the same semantic surface as the field.
        backgroundColor: 'transparent',
        boxShadow: `0 0 0 1000px ${inputBackground} inset`,
        WebkitTextFillColor: colors.text.primary,
        caretColor: colors.text.primary,
      }
    : undefined;
  return (
    <View style={[{ minHeight: 52, flexDirection: 'row', alignItems: 'center', width: '100%', borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: inputBackground, borderColor, borderWidth: focused || error ? 2 : 1, paddingHorizontal: spacing[3], opacity: disabled ? 0.55 : 1 }, containerStyle]}>
      {leftIcon ? <View style={{ marginRight: spacing[2], alignItems: 'center', justifyContent: 'center' }}>{leftIcon}</View> : null}
      <RNTextInput
        ref={ref}
        editable={!disabled}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        placeholderTextColor={placeholderTextColor ?? colors.text.muted}
        accessibilityState={{ disabled, ...accessibilityState }}
        accessibilityHint={error ? 'Campo com erro. Verifique a mensagem de validação.' : rest.accessibilityHint}
        style={[{ flex: 1, minHeight: 50, paddingVertical: spacing[2], color: colors.text.primary, ...typography.styles.body }, webInputStyle, inputStyle]}
        {...rest}
      />
      {rightIcon ? <View style={{ marginLeft: spacing[2], alignItems: 'center', justifyContent: 'center' }}>{rightIcon}</View> : null}
    </View>
  );
});
