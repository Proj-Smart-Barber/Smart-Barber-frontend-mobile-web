import { httpClient } from '../../../shared/api/http-client';
export async function listNotifications(params, options) {
    return httpClient.get('/api/notifications', {
        params: {
            cursor: params === null || params === void 0 ? void 0 : params.cursor,
            limit: params === null || params === void 0 ? void 0 : params.limit,
        },
        ...((options === null || options === void 0 ? void 0 : options.signal) ? { signal: options.signal } : {}),
    });
}
export async function markNotificationRead(notificationId) {
    return httpClient.patch(`/api/notifications/${notificationId}/read`);
}
