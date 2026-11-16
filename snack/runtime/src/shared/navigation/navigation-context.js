import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useReducedMotion } from '../theme';
import { getActiveDestinationFromPathname } from './navigation.helpers';
const NavigationContext = createContext(null);
export function NavigationProvider({ children }) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const drawerProgress = useRef(new Animated.Value(0)).current;
    const currentAnimation = useRef(null);
    const scrollCollapseProgress = useRef(new Animated.Value(0)).current;
    const previousScrollOffset = useRef(0);
    const isNavigationCollapsed = useRef(false);
    const reducedMotion = useReducedMotion();
    const pathname = usePathname();
    const activeDestination = useMemo(() => {
        return getActiveDestinationFromPathname(pathname);
    }, [pathname]);
    const animateNavigation = useCallback((collapsed) => {
        if (isNavigationCollapsed.current === collapsed)
            return;
        isNavigationCollapsed.current = collapsed;
        if (reducedMotion) {
            scrollCollapseProgress.setValue(collapsed ? 1 : 0);
            return;
        }
        Animated.spring(scrollCollapseProgress, {
            toValue: collapsed ? 1 : 0,
            damping: 20,
            stiffness: 220,
            mass: 0.7,
            useNativeDriver: true,
        }).start();
    }, [reducedMotion, scrollCollapseProgress]);
    const onContentScroll = useCallback((event) => {
        const nextOffset = Math.max(0, event.nativeEvent.contentOffset.y);
        const delta = nextOffset - previousScrollOffset.current;
        previousScrollOffset.current = nextOffset;
        if (nextOffset <= 12) {
            animateNavigation(false);
        }
        else if (delta >= 8) {
            animateNavigation(true);
        }
        else if (delta <= -8) {
            animateNavigation(false);
        }
    }, [animateNavigation]);
    useEffect(() => {
        previousScrollOffset.current = 0;
        isNavigationCollapsed.current = false;
        scrollCollapseProgress.setValue(0);
    }, [pathname, scrollCollapseProgress]);
    const drawerGeneration = useRef(0);
    const drawerTimerRef = useRef(null);
    const clearDrawerTimer = useCallback(() => {
        if (drawerTimerRef.current !== null) {
            clearTimeout(drawerTimerRef.current);
            drawerTimerRef.current = null;
        }
    }, []);
    useEffect(() => {
        return () => {
            var _a;
            drawerGeneration.current++;
            clearDrawerTimer();
            (_a = currentAnimation.current) === null || _a === void 0 ? void 0 : _a.stop();
        };
    }, [clearDrawerTimer]);
    const openDrawer = useCallback(() => {
        const epoch = ++drawerGeneration.current;
        clearDrawerTimer();
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
        drawerTimerRef.current = setTimeout(() => {
            if (drawerGeneration.current === epoch) {
                currentAnimation.current = null;
                drawerProgress.setValue(1);
            }
        }, 380);
        anim.start(() => {
            if (drawerGeneration.current === epoch) {
                clearDrawerTimer();
                currentAnimation.current = null;
                drawerProgress.setValue(1);
            }
        });
    }, [reducedMotion, drawerProgress, clearDrawerTimer]);
    const closeDrawer = useCallback(() => {
        const epoch = ++drawerGeneration.current;
        clearDrawerTimer();
        setIsDrawerOpen(false);
        if (currentAnimation.current) {
            currentAnimation.current.stop();
        }
        if (reducedMotion) {
            drawerProgress.setValue(0);
            setIsDrawerVisible(false);
            return;
        }
        const finalizeClose = () => {
            if (drawerGeneration.current !== epoch)
                return;
            clearDrawerTimer();
            currentAnimation.current = null;
            drawerProgress.setValue(0);
            setIsDrawerVisible(false);
        };
        const anim = Animated.timing(drawerProgress, {
            toValue: 0,
            duration: 200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
        });
        currentAnimation.current = anim;
        drawerTimerRef.current = setTimeout(finalizeClose, 320);
        anim.start(() => {
            finalizeClose();
        });
    }, [reducedMotion, drawerProgress, clearDrawerTimer]);
    const toggleDrawer = useCallback(() => {
        if (isDrawerOpen) {
            closeDrawer();
        }
        else {
            openDrawer();
        }
    }, [isDrawerOpen, openDrawer, closeDrawer]);
    const value = useMemo(() => ({
        isDrawerOpen,
        isDrawerVisible,
        drawerProgress,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        activeDestination,
        scrollCollapseProgress,
        onContentScroll,
    }), [
        isDrawerOpen,
        isDrawerVisible,
        drawerProgress,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        activeDestination,
        scrollCollapseProgress,
        onContentScroll,
    ]);
    return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation deve ser utilizado dentro de um NavigationProvider');
    }
    return context;
}
export function useOptionalNavigation() {
    return useContext(NavigationContext);
}
