import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { ClientNavigationShell } from '@/shared/navigation/ClientNavigationShell';

export default function ClientLayoutGroup() {
  const { colors } = useTheme();

  return (
    <ClientNavigationShell>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background.primary,
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
      </Stack>
    </ClientNavigationShell>
  );
}
