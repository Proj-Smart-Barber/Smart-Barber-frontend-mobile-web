import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { useSession } from '@/features/auth';

export default function ClientHomeScreen() {
  const { colors, spacing } = useTheme();
  const { identity, signOut } = useSession();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, padding: spacing.xl }]}>
      <Text variant="h2" color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
        Olá, {identity?.name || 'Cliente'}
      </Text>
      <Text variant="body" color={colors.text.secondary} style={{ marginBottom: spacing.xl }}>
        Bem-vindo ao Smart Barber. Aqui você gerencia seus agendamentos e conta.
      </Text>

      <View style={{ gap: spacing.md, width: '100%', maxWidth: 400 }}>
        <Button
          title="Meus Agendamentos"
          variant="primary"
          onPress={() => router.push('/(client)/bookings' as any)}
        />
        <Button
          title="Minhas Notificações"
          variant="secondary"
          onPress={() => router.push('/(app)/notifications' as any)}
        />
        <Button
          title="Sair da Conta"
          variant="ghost"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login' as any);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
