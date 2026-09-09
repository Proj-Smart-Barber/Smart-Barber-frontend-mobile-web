import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayoutGroup() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="agenda" />
      <Stack.Screen name="availability" />
    </Stack>
  );
}
