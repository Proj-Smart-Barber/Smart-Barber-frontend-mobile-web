import React from 'react';
import { Stack } from 'expo-router';
import { ClientNavigationShell } from '@/shared/navigation/ClientNavigationShell';

export default function ClientLayoutGroup() {
  return (
    <ClientNavigationShell>
      <Stack
        screenOptions={{
          headerShown: false,
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
