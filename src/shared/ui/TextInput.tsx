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

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    error = false,
    disabled = false,
    leftIcon,
    rightIcon,
    containerStyle,
    inputStyle,
    style,
    onFocus,
    onBlur,
    placeholderTextColor,
    accessibilityState,
    ...rest
  },
  ref
) {
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

  const webInputStyle: WebTextInputStyle | undefined =
    Platform.OS === 'web'
      ? {
          outlineStyle: 'solid',
          outlineWidth: 0,
          backgroundColor: 'transparent',
          caretColor: colors.text.primary,
        }
      : undefined;

  return (
    <View
      style={[
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
      ]}
    >
      {leftIcon ? (
        <View
          style={{
            marginRight: spacing[2],
            marginTop: isMultiline ? spacing[1] : 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {leftIcon}
        </View>
      ) : null}
      <RNTextInput
        ref={ref}
        editable={!disabled}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={placeholderTextColor ?? colors.text.muted}
        accessibilityState={{ disabled, ...accessibilityState }}
        accessibilityHint={
          error
            ? 'Campo com erro. Verifique a mensagem de validação.'
            : rest.accessibilityHint
        }
        {...rest}
        style={[
          {
            flex: 1,
            width: '100%',
            minHeight: isMultiline ? 76 : 50,
            paddingVertical: spacing[2],
            color: colors.text.primary,
            ...(isMultiline ? { textAlignVertical: 'top' as const } : {}),
            ...typography.styles.body,
          },
          webInputStyle,
          inputStyle,
          style,
        ]}
      />
      {rightIcon ? (
        <View
          style={{
            marginLeft: spacing[2],
            marginTop: isMultiline ? spacing[1] : 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {rightIcon}
        </View>
      ) : null}
    </View>
  );
});
