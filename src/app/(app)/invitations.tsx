import React from 'react';
import { Redirect } from 'expo-router';

export default function AppInvitationsRedirect() {
  return <Redirect href={'/(account)/invitations' as any} />;
}
