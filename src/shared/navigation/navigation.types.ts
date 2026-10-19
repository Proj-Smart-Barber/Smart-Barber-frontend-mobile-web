
import { Animated } from 'react-native';

export type AppDestination =
  | 'home'
  | 'agenda'
  | 'atendimentos'
  | 'my-schedule'
  | 'availability'
  | 'services'
  | 'settings'
  | 'team';


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
  scrollCollapseProgress: Animated.Value;
  onContentScroll: (event: {
    nativeEvent: {
      contentOffset: {
        y: number;
      };
    };
  }) => void;
}
