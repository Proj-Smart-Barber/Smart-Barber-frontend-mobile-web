import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, FormField, Text } from '@/shared/ui';
import { AuthLayout } from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';

export default function PasswordRecoveryScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail de acesso cadastrado.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authApi.sendPasswordRecovery(email.trim());
      setSuccessMessage(
        'Se o e-mail informado estiver cadastrado, um link de redefinição de senha foi enviado.',
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperação de Senha"
      subtitle="Informe seu e-mail para receber as instruções de recuperação."
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
            <FormField label="E-mail cadastrado" required>
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
              title="Enviar Link de Recuperação"
              loadingTitle="Enviando…"
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !email.trim()}
              onPress={handleSubmit}
              style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
            />
          </>
        ) : (
          <Button
            title="Tenho o código: Redefinir Senha"
            variant="primary"
            onPress={() => router.push('/(auth)/reset-password' as any)}
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
