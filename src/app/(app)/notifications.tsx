import React from 'react';
import { Redirect } from 'expo-router';

export default function AppNotificationsRedirect() {
  return <Redirect href={'/(account)/notifications' as any} />;
}
