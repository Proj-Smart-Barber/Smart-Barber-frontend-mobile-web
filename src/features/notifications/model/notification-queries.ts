import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listNotifications, markNotificationRead } from '../api/notifications.api';
import { buildNotificationQueryKey } from './notification-engine';
import type { ListNotificationsParams, FetchNotificationsResponse } from '../api/notifications.dto';

export { buildNotificationQueryKey };

export function useNotificationsFeed(
  userId: string | null | undefined,
  params?: ListNotificationsParams
) {
  return useQuery<FetchNotificationsResponse>({
    queryKey: buildNotificationQueryKey(userId, params?.cursor),
    queryFn: ({ signal }) => listNotifications(params, { signal }),
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: (result, notificationId) => {
      const userKey = userId || 'anonymous';
      const readAtIso = result?.notification?.readAt ?? new Date().toISOString();

      queryClient.setQueriesData<FetchNotificationsResponse>(
        { queryKey: ['notifications', userKey] },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData.notifications)) return oldData;
          let wasUnread = false;
          const updatedNotifications = oldData.notifications.map((item) => {
            if (item.id === notificationId) {
              if (!item.readAt) wasUnread = true;
              return { ...item, readAt: item.readAt ?? readAtIso };
            }
            return item;
          });
          if (!wasUnread) return oldData;
          return {
            ...oldData,
            notifications: updatedNotifications,
            unreadCount: Math.max(0, (oldData.unreadCount ?? 1) - 1),
          };
        }
      );

      // Revalida em background o feed daquele usuário específico
      queryClient.invalidateQueries({
        queryKey: ['notifications', userKey],
      });
    },
  });
}
