import { Animated } from 'react-native';

export type AppDestination = 'home' | 'agenda' | 'availability' | 'services';

export interface NavigationItem {
  id: AppDestination;
  title: string;
  route: string;
  iconName: string;
  activeIconName: string;
  badgeCount?: number;
}

export interface NavigationContextValue {
  isDrawerOpen: boolean;
  isDrawerVisible: boolean;
  drawerProgress: Animated.Value;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  activeDestination: AppDestination;
}
