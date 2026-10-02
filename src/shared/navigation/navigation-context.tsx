import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useReducedMotion } from '@/shared/theme';
import { getActiveDestinationFromPathname } from './navigation.helpers';
import type { AppDestination, NavigationContextValue } from './navigation.types';

const NavigationContext = createContext<NavigationContextValue | null>(null);

export interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();

  const activeDestination = useMemo(() => {
    return getActiveDestinationFromPathname(pathname);
  }, [pathname]);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    setIsDrawerVisible(true);

    if (currentAnimation.current) {
      currentAnimation.current.stop();
    }

    if (reducedMotion) {
      drawerProgress.setValue(1);
      return;
    }

    const anim = Animated.timing(drawerProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    currentAnimation.current = anim;
    anim.start(() => {
      currentAnimation.current = null;
    });
  }, [reducedMotion, drawerProgress]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);

    if (currentAnimation.current) {
      currentAnimation.current.stop();
    }

    if (reducedMotion) {
      drawerProgress.setValue(0);
      setIsDrawerVisible(false);
      return;
    }

    const anim = Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    currentAnimation.current = anim;
    anim.start(({ finished }) => {
      currentAnimation.current = null;
      if (finished) {
        setIsDrawerVisible(false);
      }
    });
  }, [reducedMotion, drawerProgress]);

  const toggleDrawer = useCallback(() => {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isDrawerOpen, openDrawer, closeDrawer]);

  const value = useMemo<NavigationContextValue>(
    () => ({
      isDrawerOpen,
      isDrawerVisible,
      drawerProgress,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      activeDestination,
    }),
    [
      isDrawerOpen,
      isDrawerVisible,
      drawerProgress,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      activeDestination,
    ],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation deve ser utilizado dentro de um NavigationProvider');
  }
  return context;
}
