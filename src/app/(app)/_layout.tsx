import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { NavigationShell } from '@/shared/navigation';

export default function AppLayoutGroup() {
  const { colors } = useTheme();

  return (
    <NavigationShell>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background.primary,
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="agenda" />
        <Stack.Screen name="atendimentos" />
        <Stack.Screen name="availability" />
        <Stack.Screen name="my-schedule" />
        <Stack.Screen name="services" />
        <Stack.Screen name="team" />
        <Stack.Screen name="team/[membershipId]" />
        <Stack.Screen name="barbershop-setup" />
        <Stack.Screen name="settings" />
      </Stack>
    </NavigationShell>
  );
}
