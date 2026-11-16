export function buildNotificationQueryKey(userId, cursor) {
    return ['notifications', userId || 'anonymous', { cursor: cursor || null }];
}
export class NotificationFeedEngine {
    constructor(transport) {
        this.transport = transport;
    }
    async loadFeed(params) {
        // Carregar a lista NUNCA marca notificações como lidas automaticamente
        return this.transport.listNotifications(params);
    }
    async markAsRead(notification) {
        var _a;
        // Se já estiver lida com timestamp existente, preserva sem alterar
        if (notification.readAt) {
            return notification;
        }
        try {
            const res = await this.transport.markNotificationRead(notification.id);
            return {
                ...notification,
                readAt: (_a = res.notification.readAt) !== null && _a !== void 0 ? _a : new Date().toISOString(),
            };
        }
        catch (err) {
            // Falha na leitura não deve ocultar o item nem corromper seus dados
            return notification;
        }
    }
}
