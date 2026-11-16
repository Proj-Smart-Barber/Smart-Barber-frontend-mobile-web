import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getBookingAvailability } from '../api/bookings.api';
import { serverClock } from '../lib/server-clock';
import { bookingQueryKeys } from './booking-query-keys';
export function useBookingAvailability(shopId, params, active) {
    var _a, _b;
    const [, tick] = useState(0);
    const [pollJitter] = useState(() => Math.floor(Math.random() * 1500));
    const [isResuming, setIsResuming] = useState(false);
    const query = useQuery({
        queryKey: bookingQueryKeys.availability(shopId, params),
        queryFn: ({ signal }) => getBookingAvailability(shopId, params, signal),
        enabled: Boolean(active && shopId && params.date && params.serviceIds.length && params.barbermanId),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: 'always',
        refetchInterval: (q) => {
            if (!active)
                return false;
            if (AppState.currentState && AppState.currentState !== 'active')
                return false;
            if (typeof document !== 'undefined' && document.hidden)
                return false;
            if (typeof navigator !== 'undefined' && navigator.onLine === false)
                return false;
            if (q.state.status === 'error')
                return Math.min(60000, 30000 * Math.max(1, q.state.fetchFailureCount)) + pollJitter;
            return 15000 + pollJitter;
        },
        refetchIntervalInBackground: false,
        retry: false,
    });
    const { refetch } = query;
    useEffect(() => {
        if (!active)
            return;
        let mounted = true;
        const timer = setInterval(() => tick(value => value + 1), 1000);
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') {
                setIsResuming(true);
                tick(value => value + 1);
                void refetch().finally(() => { if (mounted)
                    setIsResuming(false); });
            }
        });
        return () => { mounted = false; clearInterval(timer); subscription.remove(); };
    }, [active, refetch]);
    const serverNow = isResuming ? null : serverClock.now();
    const slots = query.isError || serverNow === null ? [] : ((_b = (_a = query.data) === null || _a === void 0 ? void 0 : _a.slots) !== null && _b !== void 0 ? _b : []).filter(slot => Date.parse(slot.start) > serverNow && Date.parse(slot.end) > Date.parse(slot.start));
    return { ...query, slots, serverNow, isRevalidating: isResuming || query.isFetching };
}
