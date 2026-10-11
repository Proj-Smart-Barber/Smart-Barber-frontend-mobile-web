import { httpClient } from '../../../shared/api/http-client';
import type {
  ListNotificationsParams,
  FetchNotificationsResponse,
  MarkReadResponse,
} from './notifications.dto';

export async function listNotifications(
  params?: ListNotificationsParams
): Promise<FetchNotificationsResponse> {
  return httpClient.get<FetchNotificationsResponse>('/api/notifications', {
    params: {
      cursor: params?.cursor,
      limit: params?.limit,
    },
  });
}

export async function markNotificationRead(
  notificationId: string
): Promise<MarkReadResponse> {
  return httpClient.patch<MarkReadResponse>(
    `/api/notifications/${notificationId}/read`
  );
}
