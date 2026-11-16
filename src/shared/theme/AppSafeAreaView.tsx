import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useAppSafeArea } from './use-app-safe-area';

type Edge = 'top' | 'bottom' | 'left' | 'right';

/** Operational screens share the bounded insets used by the PWA navigation. */
export function AppSafeAreaView({
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  ...props
}: ViewProps & { edges?: Edge[] }) {
  const insets = useAppSafeArea();
  return <View {...props} style={[style, {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }]} />;
}
