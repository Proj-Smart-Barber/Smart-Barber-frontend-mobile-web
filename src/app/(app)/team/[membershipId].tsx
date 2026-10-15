import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TeamMemberDetailView } from '@/features/team/ui/TeamMemberDetailView';

export default function TeamMemberScreen() {
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();

  if (!membershipId || typeof membershipId !== 'string') {
    return null;
  }

  return <TeamMemberDetailView membershipId={membershipId} />;
}
