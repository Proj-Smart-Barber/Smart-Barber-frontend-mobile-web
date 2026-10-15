import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, PasswordInput, FormField, Text } from '@/shared/ui';
import { AuthLayout } from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';
import { validateNewPassword } from '@/features/auth/model/operational-context';

export default function ResetPasswordScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState<string>(params.token || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
    }
  }, [params.token]);

  const handleSubmit = async () => {
    if (!token.trim()) {
      setErrorMessage('Informe o token de recuperação.');
      return;
    }

    const validation = validateNewPassword(newPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Senha inválida.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('A confirmação da nova senha não coincide.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authApi.resetPassword({
        token: token.trim(),
        newPassword,
      });
      setSuccessMessage('Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Token inválido ou expirado. Solicite uma nova recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Nova Senha"
      subtitle="Defina sua nova senha de acesso segura."
    >
      <View style={styles.container}>
        {errorMessage ? (
          <View
            style={[
              styles.alertBox,
              { backgroundColor: colors.feedback.errorBackground, borderColor: colors.feedback.errorBorder },
            ]}
          >
            <Text variant="bodySm" color={colors.feedback.error}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {successMessage ? (
          <View
            style={[
              styles.alertBox,
              { backgroundColor: colors.feedback.successBackground, borderColor: colors.feedback.successBorder },
            ]}
          >
            <Text variant="bodySm" color={colors.feedback.success}>
              {successMessage}
            </Text>
          </View>
        ) : null}

        {!successMessage ? (
          <>
            <FormField label="Token de recuperação" required>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Cole o código recebido no e-mail"
                disabled={isLoading}
                leftIcon={<Ionicons name="key-outline" size={18} color={colors.brand.silver} />}
              />
            </FormField>

            <FormField label="Nova senha (mínimo 8 caracteres)" required>
              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="•••••••••••••••"
                disabled={isLoading}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.brand.silver} />}
              />
            </FormField>

            <FormField label="Confirme a nova senha" required>
              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="•••••••••••••••"
                disabled={isLoading}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.brand.silver} />}
              />
            </FormField>

            <Button
              title="Redefinir Senha"
              loadingTitle="Atualizando…"
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !token.trim() || !newPassword || !confirmPassword}
              onPress={handleSubmit}
              style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
            />
          </>
        ) : (
          <Button
            title="Ir para o Login"
            variant="primary"
            onPress={() => router.replace('/(auth)/login' as any)}
            style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
          />
        )}

        <View style={styles.footerRow}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/(auth)/login' as any)}
            hitSlop={8}
          >
            <Text variant="bodySm" color={colors.brand.primary} weight="semibold">
              Voltar ao Login
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  alertBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
