import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../auth';
import { serverClock } from '../../bookings';
import { discoveryApi } from '../api/discovery.api';
export const NEXT_BOOKING_QUERY_KEY = ['bookings', 'me', 'upcoming'];
export function buildNextBookingQueryKey(actorId) {
    return ['bookings', 'me', 'upcoming', actorId !== null && actorId !== void 0 ? actorId : 'anon'];
}
export function useNextBooking() {
    var _a, _b, _c;
    const { token, identity, status } = useSession();
    const actorId = (_a = identity === null || identity === void 0 ? void 0 : identity.id) !== null && _a !== void 0 ? _a : null;
    const isAuthenticated = status === 'authenticated' && Boolean(actorId) && Boolean(token);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: buildNextBookingQueryKey(actorId),
        queryFn: async () => {
            const expectedGeneration = serverClock.getGeneration();
            const result = await discoveryApi.fetchUpcomingBooking(token);
            if (result.serverTime) {
                serverClock.syncWithServer(result.serverTime, { expectedGeneration });
            }
            return result;
        },
        enabled: isAuthenticated,
        staleTime: 30 * 1000, // 30 segundos
        gcTime: 2 * 60 * 1000,
        retry: 1,
    });
    return {
        booking: (_b = data === null || data === void 0 ? void 0 : data.booking) !== null && _b !== void 0 ? _b : null,
        serverTime: (_c = data === null || data === void 0 ? void 0 : data.serverTime) !== null && _c !== void 0 ? _c : null,
        isLoading: isLoading && isAuthenticated,
        isError,
        error: error,
        refetch,
    };
}
export function useInvalidateNextBooking() {
    const queryClient = useQueryClient();
    return () => {
        void queryClient.invalidateQueries({ queryKey: NEXT_BOOKING_QUERY_KEY });
    };
}
