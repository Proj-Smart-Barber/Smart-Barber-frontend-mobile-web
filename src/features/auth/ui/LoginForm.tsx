import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, PasswordInput, FormField, Text } from '@/shared/ui';
import { useLoginViewModel } from '../model/use-login-view-model';
import { AuthError } from './AuthError';

export function LoginForm() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { control, errors, isSubmitting, submitError, onSubmit } = useLoginViewModel();

  return (
    <View style={styles.container}>
      <AuthError message={submitError} />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="E-mail de acesso"
            required
            error={errors.email?.message}
          >
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="ex: owner@smartbarber.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={Boolean(errors.email)}
              disabled={isSubmitting}
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.brand.silver} />}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="Senha secreta"
            required
            error={errors.password?.message}
          >
            <PasswordInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="••••••••"
              autoComplete="password"
              error={Boolean(errors.password)}
              disabled={isSubmitting}
              onSubmitEditing={() => onSubmit()}
              returnKeyType="done"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.brand.silver} />}
            />
          </FormField>
        )}
      />

      <Button
        title="Entrar"
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
        onPress={onSubmit}
        style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
      />

      <View style={styles.footerRow}>
        <Text variant="bodySm" color={colors.brand.silver}>
          Ainda não é cadastrado?{' '}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Navegar para criação de conta de barbearia"
          onPress={() => router.push('/(auth)/register')}
          disabled={isSubmitting}
          hitSlop={8}
        >
          <Text
            variant="bodySm"
            weight="semibold"
            color={colors.brand.primary}
            style={{ letterSpacing: 0.2 }}
          >
            Cadastrar Barbearia
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
