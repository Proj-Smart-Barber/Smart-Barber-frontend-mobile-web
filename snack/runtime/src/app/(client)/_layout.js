import React, { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { Animated } from 'react-native';
import { useScreenTransition } from '../../shared/ui/use-screen-transition';
import { useTheme } from '../../shared/theme';
import { useSession } from '../../features/auth';
import { ClientExperienceProvider, useClientExperienceContext, useClientLocationOnboarding, LocationOnboardingModal, BookingStartSheet, } from '../../features/discovery';
import { ClientNavigationShell } from '../../shared/navigation/ClientNavigationShell';
import { useNavigation } from '../../shared/navigation/navigation-context';
function ClientLocationOnboardingCoordinator({ actorId, onBlockedChange, }) {
    const { isDrawerOpen } = useNavigation();
    const { bookingStart, publishLocationOnboarding } = useClientExperienceContext();
    const enabled = !isDrawerOpen && !bookingStart;
    const { stage, requestPhase, canAskAgain, isPositionSlow, continueRequest, retryPosition, recoverPermission, dismissIntro, } = useClientLocationOnboarding({
        actorId,
        enabled,
    });
    useEffect(() => {
        publishLocationOnboarding({
            stage,
            canAskAgain,
            recoverPermission,
            retryPosition,
        });
        return () => {
            publishLocationOnboarding(null);
        };
    }, [stage, canAskAgain, recoverPermission, retryPosition, publishLocationOnboarding]);
    const isModalOpen = stage === 'intro' || stage === 'requesting';
    useEffect(() => {
        onBlockedChange(isModalOpen);
        return () => {
            onBlockedChange(false);
        };
    }, [isModalOpen, onBlockedChange]);
    return (<LocationOnboardingModal visible={isModalOpen} stage={stage} requestPhase={requestPhase} isPositionSlow={isPositionSlow} onContinue={continueRequest} onClose={dismissIntro}/>);
}
export function ClientLayoutContent() {
    var _a;
    const routeOpacity = useScreenTransition(usePathname());
    const { colors } = useTheme();
    const { identity } = useSession();
    const { bookingStart, requestBooking, closeBooking } = useClientExperienceContext();
    const [isOnboardingBlocked, setIsOnboardingBlocked] = useState(false);
    return (<ClientNavigationShell onRequestBooking={requestBooking} interactionBlocked={Boolean(bookingStart) || isOnboardingBlocked}>
      <Animated.View style={{ flex: 1, minHeight: 0, opacity: routeOpacity }}>
      <Stack screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: {
                backgroundColor: colors.background.primary,
            },
        }}>
        <Stack.Screen name="index" dangerouslySingular/>
        <Stack.Screen name="explore" dangerouslySingular/>
        <Stack.Screen name="bookings" dangerouslySingular/>
        <Stack.Screen name="notifications" dangerouslySingular/>
        <Stack.Screen name="profile" dangerouslySingular/>
      </Stack>
      </Animated.View>

      <ClientLocationOnboardingCoordinator actorId={(_a = identity === null || identity === void 0 ? void 0 : identity.id) !== null && _a !== void 0 ? _a : null} onBlockedChange={setIsOnboardingBlocked}/>

      <BookingStartSheet start={bookingStart} onClose={closeBooking}/>
    </ClientNavigationShell>);
}
export default function ClientLayoutGroup() {
    var _a;
    const { identity } = useSession();
    return (<ClientExperienceProvider actorId={(_a = identity === null || identity === void 0 ? void 0 : identity.id) !== null && _a !== void 0 ? _a : null}>
      <ClientLayoutContent />
    </ClientExperienceProvider>);
}
