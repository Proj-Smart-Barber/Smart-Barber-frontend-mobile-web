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
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const {
    control,
    errors,
    isSubmitting,
    submitError,
    isEmailNotVerified,
    getEnteredEmail,
    onSubmit,
  } = useLoginViewModel();

  return (
    <View style={styles.container}>
      <AuthError message={submitError} />

      {isEmailNotVerified ? (
        <View
          style={[
            styles.emailNotVerifiedCard,
            {
              backgroundColor: colors.surface.badge,
              borderColor: colors.brand.primary,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Ionicons
              name="mail-unread-outline"
              size={18}
              color={colors.brand.primary}
              style={{ marginRight: 8 }}
            />
            <Text variant="caption" weight="semibold" style={{ color: colors.brand.primary }}>
              Confirmação pendente
            </Text>
          </View>
          <Text variant="caption" style={{ color: colors.brand.silver, marginBottom: spacing.sm, lineHeight: 18 }}>
            Sua conta requer confirmação de e-mail para acesso. Verifique sua caixa de entrada ou solicite um novo link.
          </Text>
          <Button
            title="Confirmar ou reenviar e-mail"
            variant="secondary"
            onPress={() => {
              const entered = getEnteredEmail()?.trim().toLowerCase() || '';
              router.push(`/(auth)/verify-email?email=${encodeURIComponent(entered)}` as any);
            }}
          />
        </View>
      ) : null}

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
              placeholder="ex: seu.email@exemplo.com"
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

      <View style={{ alignItems: 'flex-end', marginBottom: spacing.sm, marginTop: -spacing.xs }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Esqueceu sua senha?"
          onPress={() => router.push('/(auth)/password-recovery' as any)}
          disabled={isSubmitting}
          hitSlop={8}
        >
          <Text variant="caption" color={colors.brand.primary} weight="medium">
            Esqueceu sua senha?
          </Text>
        </Pressable>
      </View>

      <Button
        title="Entrar"
        loadingTitle="Entrando…"
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
        onPress={onSubmit}
        style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
      />

      <View style={styles.footerContainer}>
        <View style={styles.footerRow}>
          <Text variant="bodySm" color={colors.brand.silver}>
            Não possui uma conta?{' '}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Navegar para criação de conta de cliente"
            onPress={() => router.push('/(auth)/register?intent=client' as any)}
            disabled={isSubmitting}
            hitSlop={8}
          >
            <Text
              variant="bodySm"
              weight="semibold"
              color={colors.brand.primary}
              style={{ letterSpacing: 0.2 }}
            >
              Criar conta de cliente
            </Text>
          </Pressable>
        </View>

        <View style={[styles.footerRow, { marginTop: spacing.sm }]}>
          <Text variant="caption" color={colors.brand.silver}>
            É proprietário de barbearia?{' '}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Navegar para criação de conta de barbearia"
            onPress={() => router.push('/(auth)/register?intent=owner' as any)}
            disabled={isSubmitting}
            hitSlop={8}
          >
            <Text
              variant="caption"
              weight="semibold"
              color={colors.brand.primary}
              style={{ letterSpacing: 0.2 }}
            >
              Cadastrar Barbearia
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emailNotVerifiedCard: {
    borderWidth: 1,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
