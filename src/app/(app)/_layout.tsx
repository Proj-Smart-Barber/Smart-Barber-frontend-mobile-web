import React from 'react';
import { Stack } from 'expo-router';
import { NavigationShell } from '@/shared/navigation';

export default function AppLayoutGroup() {
  return (
    <NavigationShell>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="agenda" />
        <Stack.Screen name="availability" />
        <Stack.Screen name="services" />
        <Stack.Screen name="barbershop-setup" />
      </Stack>
    </NavigationShell>
  );
}