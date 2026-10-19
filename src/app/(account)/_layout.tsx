import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/shared/theme';

export default function AccountLayoutGroup() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notifications/[notificationId]" />
      <Stack.Screen name="invitations" />
      <Stack.Screen name="bookings/[bookingId]" />
    </Stack>
  );
}
