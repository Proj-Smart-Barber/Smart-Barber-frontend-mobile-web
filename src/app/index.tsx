import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { BootstrapScreen } from '@/shared/ui';

export default function Index() {
  return <BootstrapScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
