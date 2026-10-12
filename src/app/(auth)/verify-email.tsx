import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, FormField, Text } from '@/shared/ui';
import { AuthLayout } from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';

export default function VerifyEmailScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();

  const [token, setToken] = useState<string>(params.token || '');
  const [email, setEmail] = useState<string>(params.email || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) {
      setErrorMessage('Por favor, informe o token de confirmação.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await authApi.confirmEmailVerification(tokenToUse.trim());
      setSuccessMessage(
        res.alreadyVerified
          ? 'Este e-mail já estava confirmado! Você já pode entrar.'
          : 'E-mail confirmado com sucesso! Você já pode fazer login.',
      );
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Token de verificação inválido ou expirado. Solicite um novo link.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para reenviar a verificação.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await authApi.sendEmailVerification(email.trim());
      setSuccessMessage('E-mail de verificação reenviado com sucesso! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao reenviar e-mail de verificação.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      void handleConfirm(params.token);
    }
  }, [params.token]);

  return (
    <AuthLayout
      title="Confirmação de E-mail"
      subtitle="Confirme seu endereço de e-mail para ativar sua conta."
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
            <FormField label="Token de verificação">
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Cole o código recebido por e-mail"
                disabled={isLoading}
                leftIcon={<Ionicons name="key-outline" size={18} color={colors.brand.silver} />}
              />
            </FormField>

            <Button
              title="Confirmar E-mail"
              loadingTitle="Confirmando…"
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !token.trim()}
              onPress={() => handleConfirm(token)}
              style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
            />

            <FormField label="Não recebeu o código? Reenviar por e-mail">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seu.email@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isLoading}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.brand.silver} />}
              />
            </FormField>

            <Button
              title="Reenviar Verificação"
              variant="secondary"
              loading={isLoading}
              disabled={isLoading || !email.trim()}
              onPress={handleResend}
              style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}
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
