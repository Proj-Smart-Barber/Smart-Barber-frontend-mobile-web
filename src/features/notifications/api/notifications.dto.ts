export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: string | null;
  readAt?: string | null;
  scheduledAt: string;
  createdAt?: string | null;
}

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
}

export interface FetchNotificationsResponse {
  notifications: NotificationDto[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface MarkReadResponse {
  notification: {
    id: string;
    readAt: string | null;
  };
}
