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
    queryFn: () => listNotifications(params),
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      // Invalida o feed daquele usuário específico
      queryClient.invalidateQueries({
        queryKey: ['notifications', userId || 'anonymous'],
      });
    },
  });
}
