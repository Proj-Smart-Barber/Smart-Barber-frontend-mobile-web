import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markNotificationRead } from '../api/notifications.api';
import { buildNotificationQueryKey } from './notification-engine';
export { buildNotificationQueryKey };
export function useNotificationsFeed(userId, params) {
    return useQuery({
        queryKey: buildNotificationQueryKey(userId, params === null || params === void 0 ? void 0 : params.cursor),
        queryFn: ({ signal }) => listNotifications(params, { signal }),
        enabled: Boolean(userId),
    });
}
export function useMarkNotificationRead(userId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (notificationId) => markNotificationRead(notificationId),
        onSuccess: (result, notificationId) => {
            var _a, _b;
            const userKey = userId || 'anonymous';
            const readAtIso = (_b = (_a = result === null || result === void 0 ? void 0 : result.notification) === null || _a === void 0 ? void 0 : _a.readAt) !== null && _b !== void 0 ? _b : new Date().toISOString();
            queryClient.setQueriesData({ queryKey: ['notifications', userKey] }, (oldData) => {
                var _a;
                if (!oldData || !Array.isArray(oldData.notifications))
                    return oldData;
                let wasUnread = false;
                const updatedNotifications = oldData.notifications.map((item) => {
                    var _a;
                    if (item.id === notificationId) {
                        if (!item.readAt)
                            wasUnread = true;
                        return { ...item, readAt: (_a = item.readAt) !== null && _a !== void 0 ? _a : readAtIso };
                    }
                    return item;
                });
                if (!wasUnread)
                    return oldData;
                return {
                    ...oldData,
                    notifications: updatedNotifications,
                    unreadCount: Math.max(0, ((_a = oldData.unreadCount) !== null && _a !== void 0 ? _a : 1) - 1),
                };
            });
            // Revalida em background o feed daquele usuário específico
            queryClient.invalidateQueries({
                queryKey: ['notifications', userKey],
            });
        },
    });
}
