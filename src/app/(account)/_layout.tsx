import React from 'react';
import { Stack } from 'expo-router';

export default function AccountLayoutGroup() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notifications/[notificationId]" />
      <Stack.Screen name="invitations" />
    </Stack>
  );
}
