import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Button, TextInput, FormField, Text } from '@/shared/ui';
import { AuthLayout } from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';

function removeTokenFromWebUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !/^https?:$/.test(window.location.protocol)) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('token')) return;
  url.searchParams.delete('token');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function VerifyEmailScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string;
    email?: string;
    sent?: string;
    sendFailed?: string;
  }>();

  const [token, setToken] = useState<string>(params.token ? String(params.token).trim() : '');
  const [email, setEmail] = useState<string>(params.email ? String(params.email).trim() : '');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Trava síncrona e rastreamento de geração para corrida de tokens e descarte de requisições antigas
  const activeAttemptIdRef = useRef<number>(0);
  const confirmingRef = useRef(false);
  const resendingRef = useRef(false);
  const currentAttemptingTokenRef = useRef<string | null>(null);
  const transientTokenRef = useRef<string | null>(null);
  const hasAttemptedTokenRef = useRef<string | null>(null);

  // Timer de cooldown visual de reenvio (60s)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleConfirm = async (tokenToUse: string) => {
    const cleanToken = tokenToUse.trim();
    if (!cleanToken) {
      setErrorMessage('Por favor, informe o token de confirmação.');
      return;
    }

    // Bloqueia cliques duplicados estritamente para o mesmo token em andamento
    if (confirmingRef.current && currentAttemptingTokenRef.current === cleanToken) {
      return;
    }

    const attemptId = ++activeAttemptIdRef.current;
    confirmingRef.current = true;
    currentAttemptingTokenRef.current = cleanToken;
    transientTokenRef.current = cleanToken;

    // Reinicializa estados anteriores para a nova tentativa
    setIsConfirmed(false);
    setConfirmedMessage(null);
    setErrorMessage(null);
    setIsConfirming(true);

    try {
      const res = await authApi.confirmEmailVerification(cleanToken);
      // Se uma nova tentativa foi iniciada enquanto esta estava em voo, descarta a resposta antiga
      if (activeAttemptIdRef.current !== attemptId) {
        return;
      }

      setIsConfirmed(true);
      setConfirmedMessage(
        res.alreadyVerified
          ? 'Este e-mail já estava confirmado! Você já pode entrar na sua conta.'
          : 'E-mail confirmado com sucesso! Você já pode fazer login.',
      );
      transientTokenRef.current = null;
      setToken('');
    } catch (err: any) {
      // Se uma nova tentativa foi iniciada enquanto esta estava em voo, descarta o erro antigo
      if (activeAttemptIdRef.current !== attemptId) {
        return;
      }

      const msg =
        err?.message ||
        'Token de verificação inválido ou expirado. Solicite um novo link abaixo.';
      setErrorMessage(msg);
      if (err?.status && err.status < 500 && err.status !== 429) {
        transientTokenRef.current = null;
      }
    } finally {
      if (activeAttemptIdRef.current === attemptId) {
        removeTokenFromWebUrl();
        confirmingRef.current = false;
        setIsConfirming(false);
      }
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendingRef.current || confirmingRef.current) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Informe seu e-mail para reenviar a verificação.');
      return;
    }

    resendingRef.current = true;
    setIsResending(true);
    setErrorMessage(null);
    setResendMessage(null);

    try {
      await authApi.sendEmailVerification(cleanEmail);
      setResendMessage(
        'E-mail de verificação enviado! Verifique sua caixa de entrada e pasta de spam.',
      );
      setResendCooldown(60);
      transientTokenRef.current = null;
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Falha ao reenviar e-mail de verificação. Tente novamente.',
      );
    } finally {
      resendingRef.current = false;
      setIsResending(false);
    }
  };

  useEffect(() => {
    const rawToken = typeof params.token === 'string' ? params.token.trim() : '';
    if (rawToken && rawToken !== hasAttemptedTokenRef.current) {
      hasAttemptedTokenRef.current = rawToken;
      setToken('');

      // Update this screen's search params without replacing/remounting it.
      const currentEmail = (typeof params.email === 'string' ? params.email : email).trim().toLowerCase();
      router.setParams({ token: undefined, email: currentEmail || undefined, sent: undefined, sendFailed: undefined });
      removeTokenFromWebUrl();

      void handleConfirm(rawToken);
    }
  }, [params.token]);

  // Mensagem inicial baseada nos query params do cadastro
  const initialBanner =
    !isConfirmed && !resendMessage
      ? params.sent === '1'
        ? 'Enviamos um link de confirmação para o seu e-mail. Verifique sua caixa de entrada.'
        : params.sendFailed === '1'
        ? 'Sua conta foi criada! No entanto, o envio do e-mail inicial falhou. Solicite o reenvio abaixo para receber seu link de ativação.'
        : null
      : null;

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
              {
                backgroundColor: colors.feedback.errorBackground,
                borderColor: colors.feedback.errorBorder,
              },
            ]}
          >
            <Text variant="bodySm" color={colors.feedback.error}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {errorMessage && transientTokenRef.current ? (
          <Button
            title="Tentar novamente"
            variant="outline"
            loading={isConfirming}
            disabled={isConfirming || isResending}
            onPress={() => handleConfirm(transientTokenRef.current!)}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {initialBanner ? (
          <View
            style={[
              styles.alertBox,
              {
                backgroundColor: colors.surface.badge,
                borderColor: colors.border.ghost,
              },
            ]}
          >
            <Text variant="bodySm" color={colors.text.secondary}>
              {initialBanner}
            </Text>
          </View>
        ) : null}

        {resendMessage ? (
          <View
            style={[
              styles.alertBox,
              {
                backgroundColor: colors.feedback.successBackground,
                borderColor: colors.feedback.successBorder,
              },
            ]}
          >
            <Text variant="bodySm" color={colors.feedback.success}>
              {resendMessage}
            </Text>
          </View>
        ) : null}

        {isConfirmed ? (
          <View>
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: colors.feedback.successBackground,
                  borderColor: colors.feedback.successBorder,
                },
              ]}
            >
              <Text variant="bodySm" color={colors.feedback.success}>
                {confirmedMessage}
              </Text>
            </View>

            <Button
              title="Ir para o Login"
              variant="primary"
              onPress={() => router.replace('/(auth)/login' as any)}
              style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
            />
          </View>
        ) : (
          <>
            <FormField label="Token de verificação">
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Cole o código recebido por e-mail"
                disabled={isConfirming || isResending}
                leftIcon={
                  <Ionicons
                    name="key-outline"
                    size={18}
                    color={colors.brand.silver}
                  />
                }
              />
            </FormField>

            <Button
              title="Confirmar E-mail"
              loadingTitle="Confirmando…"
              variant="primary"
              loading={isConfirming}
              disabled={isConfirming || isResending || !token.trim()}
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
                disabled={isConfirming || isResending}
                leftIcon={
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={colors.brand.silver}
                  />
                }
              />
            </FormField>

            <Button
              title={
                resendCooldown > 0
                  ? `Aguarde ${resendCooldown}s para reenviar`
                  : 'Reenviar Verificação'
              }
              loadingTitle="Reenviando…"
              variant="secondary"
              loading={isResending}
              disabled={
                isConfirming || isResending || !email.trim() || resendCooldown > 0
              }
              onPress={handleResend}
              style={{ marginTop: spacing.xs, marginBottom: spacing.xl }}
            />
          </>
        )}

        <View style={styles.footerRow}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/(auth)/login' as any)}
            hitSlop={8}
          >
            <Text
              variant="bodySm"
              color={colors.brand.primary}
              weight="semibold"
            >
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
