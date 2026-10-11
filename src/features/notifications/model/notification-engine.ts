import type { NotificationDto, FetchNotificationsResponse, MarkReadResponse } from '../api/notifications.dto';

export interface NotificationTransport {
  listNotifications(params?: { cursor?: string; limit?: number }): Promise<FetchNotificationsResponse>;
  markNotificationRead(notificationId: string): Promise<MarkReadResponse>;
}

export function buildNotificationQueryKey(userId: string | null | undefined, cursor?: string) {
  return ['notifications', userId || 'anonymous', { cursor: cursor || null }] as const;
}

export class NotificationFeedEngine {
  constructor(private transport: NotificationTransport) {}

  async loadFeed(params?: { cursor?: string; limit?: number }): Promise<FetchNotificationsResponse> {
    // Carregar a lista NUNCA marca notificações como lidas automaticamente
    return this.transport.listNotifications(params);
  }

  async markAsRead(notification: NotificationDto): Promise<NotificationDto> {
    // Se já estiver lida com timestamp existente, preserva sem alterar
    if (notification.readAt) {
      return notification;
    }

    try {
      const res = await this.transport.markNotificationRead(notification.id);
      return {
        ...notification,
        readAt: res.notification.readAt ?? new Date().toISOString(),
      };
    } catch (err) {
      // Falha na leitura não deve ocultar o item nem corromper seus dados
      return notification;
    }
  }
}
