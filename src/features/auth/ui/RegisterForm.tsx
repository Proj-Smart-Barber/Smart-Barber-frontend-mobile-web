import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, PasswordInput, FormField, Text } from '@/shared/ui';
import { useRegisterViewModel } from '../model/use-register-view-model';
import { formatCpf } from '../model/register.schema';
import { AuthError } from './AuthError';

export function RegisterForm() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { control, errors, isSubmitting, submitError, onSubmit } = useRegisterViewModel();

  return (
    <View style={styles.container}>
      <AuthError message={submitError} />

      {/* Card informativo de perfil Gestor VIP / OWNER */}
      <View
        style={[
          styles.ownerBadgeCard,
          {
            backgroundColor: colors.surface.badge,
            borderColor: colors.border.ghost,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.brand.primary} style={{ marginRight: 8 }} />
          <Text variant="badge" style={{ color: colors.brand.primary, letterSpacing: 0.8 }}>
            PERFIL PROPRIETÁRIO / GESTOR
          </Text>
        </View>
        <Text variant="caption" style={{ color: colors.brand.silver, marginTop: 4, lineHeight: 18 }}>
          Sua conta será criada com soberania operacional completa para cadastrar barbearia, equipe e catálogo.
        </Text>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="Nome completo"
            required
            error={errors.name?.message}
          >
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="ex: Carlos Silva"
              autoCapitalize="words"
              autoComplete="name"
              error={Boolean(errors.name)}
              disabled={isSubmitting}
              leftIcon={<Ionicons name="person-outline" size={18} color={colors.brand.silver} />}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="cpf"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="CPF (apenas números)"
            required
            error={errors.cpf?.message}
          >
            <TextInput
              value={value}
              onChangeText={(text) => onChange(formatCpf(text))}
              onBlur={onBlur}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              maxLength={14}
              error={Boolean(errors.cpf)}
              disabled={isSubmitting}
              leftIcon={<Ionicons name="card-outline" size={18} color={colors.brand.silver} />}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="E-mail corporativo"
            required
            error={errors.email?.message}
          >
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="ex: contato@barbearia.com"
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
            label="Senha de segurança"
            required
            error={errors.password?.message}
          >
            <PasswordInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="No mínimo 6 caracteres"
              autoComplete="new-password"
              error={Boolean(errors.password)}
              disabled={isSubmitting}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.brand.silver} />}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="passwordConfirmation"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormField
            label="Confirmar senha"
            required
            error={errors.passwordConfirmation?.message}
          >
            <PasswordInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Repita a senha digitada"
              autoComplete="new-password"
              error={Boolean(errors.passwordConfirmation)}
              disabled={isSubmitting}
              onSubmitEditing={() => onSubmit()}
              returnKeyType="done"
              leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.brand.silver} />}
            />
          </FormField>
        )}
      />

      <Button
        title="Criar conta e entrar"
        variant="primary"
        loading={isSubmitting}
        disabled={isSubmitting}
        onPress={onSubmit}
        style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
      />

      <View style={styles.footerRow}>
        <Text variant="bodySm" style={{ color: colors.brand.silver }}>
          Já possui cadastro ativo?{' '}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Navegar para o login"
          onPress={() => router.push('/(auth)/login')}
          disabled={isSubmitting}
          hitSlop={8}
        >
          <Text variant="bodySm" weight="bold" style={{ color: colors.brand.primary }}>
            Entrar
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
  ownerBadgeCard: {
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
