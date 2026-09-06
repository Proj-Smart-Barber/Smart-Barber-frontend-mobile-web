import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, PasswordInput, FormField, Text, Alert } from '@/shared/ui';
import { useResetPasswordViewModel } from '../model/use-reset-password-view-model';
import { AuthError } from './AuthError';

interface ResetPasswordFormProps {
  initialToken?: string;
}

export function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
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
  } = useResetPasswordViewModel({ defaultToken: initialToken });

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <Alert
          title="Senha alterada com sucesso!"
          message={
            successMessage ||
            'Sua nova senha foi gravada com sucesso. Você já pode fazer login com suas novas credenciais.'
          }
          variant="success"
          style={{ marginBottom: spacing.lg }}
        />

        <Button
          title="Fazer Login"
          variant="primary"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuthError message={submitError} />

      <Controller
        control={control}
        name="token"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="Código ou Token de Recuperação"
            required
            error={errors.token?.message}
          >
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Cole o token recebido no e-mail"
              autoCapitalize="none"
              autoCorrect={false}
              error={Boolean(errors.token)}
              disabled={isSubmitting || Boolean(initialToken)}
              leftIcon={
                <Ionicons
                  name="key-outline"
                  size={18}
                  color={colors.brand.silver}
                />
              }
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="Nova Senha"
            required
            error={errors.password?.message}
          >
            <PasswordInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Mínimo 6 caracteres"
              error={Boolean(errors.password)}
              disabled={isSubmitting}
              leftIcon={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.brand.silver}
                />
              }
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="Confirmação da Nova Senha"
            required
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Repita a nova senha"
              error={Boolean(errors.confirmPassword)}
              disabled={isSubmitting}
              onSubmitEditing={() => onSubmit()}
              returnKeyType="done"
              leftIcon={
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.brand.silver}
                />
              }
            />
          </FormField>
        )}
      />

      <Button
        title="Redefinir Senha"
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
        onPress={onSubmit}
        style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
      />

      <View style={styles.footerRow}>
        <Text variant="bodySm" color={colors.brand.silver}>
          Lembrou sua senha antiga?{' '}
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
