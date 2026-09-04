import { ThemeColors } from '../semantic/colors';

/** Component tokens are derived only from semantic tokens. */
export function createComponentTokens(colors: ThemeColors) {
  return {
    button: {
      primary: { background: colors.brand.primary, pressed: colors.brand.primaryPressed, foreground: colors.text.inverse },
      destructive: { background: colors.feedback.destructive, pressed: colors.feedback.destructivePressed, foreground: colors.text.inverse },
      secondary: { background: colors.surface.elevated, pressed: colors.surface.selected, foreground: colors.text.primary },
      focus: colors.border.focus,
    },
    input: { background: colors.surface.input, focusedBackground: colors.surface.inputFocus, border: colors.border.default, focusedBorder: colors.border.focus, errorBorder: colors.border.error },
    card: { background: colors.background.card, elevated: colors.background.elevated, border: colors.border.subtle },
  } as const;
}
