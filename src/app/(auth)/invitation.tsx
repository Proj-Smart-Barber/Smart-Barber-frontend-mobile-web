import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../shared/theme';
import { Text, Button, Card, Spinner } from '../../shared/ui';
import { useSession } from '../../features/auth';

export default function InvitationResolveScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const authLoading = status === 'bootstrapping' || status === 'authenticating';
  const searchParams = useLocalSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Extrai token do fragmento URL (web) ou de params
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const match = hash.match(/token=([^&]+)/);
      if (match && match[1]) {
        setToken(decodeURIComponent(match[1]));
        return;
      }
    }

    if (searchParams.token && typeof searchParams.token === 'string') {
      setToken(searchParams.token);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/(app)/invitations' as any);
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Card style={styles.card}>
        <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700', textAlign: 'center' }}>
          Convite Profissional
        </Text>
        <Text variant="body" style={{ color: colors.text.secondary, textAlign: 'center', marginTop: 12 }}>
          Você recebeu um convite para atuar como profissional parceiro na Smart Barber.
        </Text>

        <View style={styles.infoBox}>
          <Text variant="caption" style={{ color: colors.text.muted, textAlign: 'center' }}>
            Para aceitar ou recusar, entre com a sua conta. Se ainda não possui conta, ative seu acesso com o link enviado no e-mail.
          </Text>
        </View>

        <Button
          title="Fazer Login para Responder"
          variant="primary"
          style={{ marginTop: 24 }}
          onPress={() => router.push('/(auth)/login' as any)}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
