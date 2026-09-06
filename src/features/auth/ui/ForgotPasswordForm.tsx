import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, FormField, Text, Alert } from '@/shared/ui';
import { useForgotPasswordViewModel } from '../model/use-forgot-password-view-model';
import { AuthError } from './AuthError';

export function ForgotPasswordForm() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const {
    control,
    errors,
    isSubmitting,
    submitError,
    isSuccess,
    successMessage,
    onSubmit,
    resetFlow,
  } = useForgotPasswordViewModel();

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <Alert
          title="Verifique seu e-mail"
          message={
            successMessage ||
            'Enviamos as instruções de recuperação para o seu e-mail. Acesse o link recebido para criar uma nova senha.'
          }
          variant="success"
          style={{ marginBottom: spacing.lg }}
        />

        <Button
          title="Ir para o Login"
          variant="primary"
          onPress={() => router.push('/(auth)/login')}
          style={{ marginBottom: spacing.md }}
        />

        <Button
          title="Enviar para outro e-mail"
          variant="ghost"
          onPress={resetFlow}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuthError message={submitError} />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="E-mail cadastrado"
            required
            error={errors.email?.message}
          >
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="seu-email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={Boolean(errors.email)}
              disabled={isSubmitting}
              onSubmitEditing={() => onSubmit()}
              returnKeyType="done"
              leftIcon={
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.brand.silver}
                />
              }
            />
          </FormField>
        )}
      />

      <Button
        title="Enviar instruções"
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
        onPress={onSubmit}
        style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
      />

      <View style={styles.footerRow}>
        <Text variant="bodySm" color={colors.brand.silver}>
          Lembrou sua senha?{' '}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Voltar para a tela de login"
          onPress={() => router.push('/(auth)/login')}
          disabled={isSubmitting}
          hitSlop={8}
        >
          <Text
            variant="bodySm"
            weight="semibold"
            color={colors.brand.primary}
            style={{ letterSpacing: 0.2 }}
          >
            Fazer login
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
