import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { useSession } from '@/features/auth';
import { ModerationQueueView } from '@/features/reviews';

export default function PlatformHomeScreen() {
  const { colors, spacing } = useTheme();
  const { identity, signOut } = useSession();
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background.primary, padding: spacing.xl },
      ]}
    >
      <View style={{ width: '100%', maxWidth: 720 }}>
        <Text variant="h2" color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
          Painel de Plataforma
        </Text>
        <Text variant="body" color={colors.text.secondary} style={{ marginBottom: spacing.lg }}>
          Operador: {identity?.name || 'Administrador'} ({identity?.email || ''})
        </Text>

        {/* Fila de Moderação de Avaliações */}
        <View style={{ marginBottom: spacing.xl }}>
          <ModerationQueueView />
        </View>

        <View style={{ gap: spacing.md, width: '100%', maxWidth: 200 }}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 48,
  },
});
