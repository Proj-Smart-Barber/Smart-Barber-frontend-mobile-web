import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotificationFeedEngine,
  buildNotificationQueryKey,
  type NotificationTransport,
} from '../model/notification-engine';
import type { NotificationDto } from '../api/notifications.dto';

describe('Task N1/N2 — Central de Notificações e Leitura Persistida', () => {
  let transport: NotificationTransport;
  let engine: NotificationFeedEngine;

  beforeEach(() => {
    transport = {
      listNotifications: vi.fn(),
      markNotificationRead: vi.fn(),
    };
    engine = new NotificationFeedEngine(transport);
  });

  it('unread_count_is_not_page_count: unreadCount vem do servidor e independe do número de itens na página', async () => {
    const fakeItems: NotificationDto[] = [
      {
        id: 'notif-1',
        type: 'INVITATION',
        title: 'Convite',
        message: 'Você recebeu um convite',
        scheduledAt: new Date().toISOString(),
        readAt: null,
      },
    ];

    vi.mocked(transport.listNotifications).mockResolvedValue({
      notifications: fakeItems,
      nextCursor: 'notif-1',
      unreadCount: 42, // Total remoto não lido maior que os itens da página
    });

    const feed = await engine.loadFeed({ limit: 1 });

    expect(feed.notifications).toHaveLength(1);
    expect(feed.unreadCount).toBe(42);
    expect(feed.unreadCount).not.toBe(feed.notifications.length);
  });

  it('open_list_does_not_mark_read: carregar a lista não chama markNotificationRead', async () => {
    vi.mocked(transport.listNotifications).mockResolvedValue({
      notifications: [],
      nextCursor: null,
      unreadCount: 0,
    });

    await engine.loadFeed();

    expect(transport.listNotifications).toHaveBeenCalledTimes(1);
    expect(transport.markNotificationRead).not.toHaveBeenCalled();
  });

  it('repeat_read_preserves_first_timestamp: notificação já lida preserva a primeira data sem reenvio', async () => {
    const originalDate = '2026-10-10T08:00:00.000Z';
    const readItem: NotificationDto = {
      id: 'notif-already-read',
      type: 'INVITATION',
      title: 'Aviso',
      message: 'Mensagem',
      scheduledAt: new Date().toISOString(),
      readAt: originalDate,
    };

    const result = await engine.markAsRead(readItem);

    expect(result.readAt).toBe(originalDate);
    expect(transport.markNotificationRead).not.toHaveBeenCalled();
  });

  it('open_details_marks_read_once: notificação não lida chama markNotificationRead e retorna timestamp', async () => {
    const unreadItem: NotificationDto = {
      id: 'notif-unread',
      type: 'INVITATION',
      title: 'Aviso',
      message: 'Mensagem',
      scheduledAt: new Date().toISOString(),
      readAt: null,
    };

    const serverTimestamp = '2026-10-11T12:30:00.000Z';
    vi.mocked(transport.markNotificationRead).mockResolvedValue({
      notification: {
        id: 'notif-unread',
        readAt: serverTimestamp,
      },
    });

    const result = await engine.markAsRead(unreadItem);

    expect(transport.markNotificationRead).toHaveBeenCalledWith('notif-unread');
    expect(result.readAt).toBe(serverTimestamp);
  });

  it('read_failure_does_not_hide_accepted_invitation: falha de leitura preserva os dados da notificação', async () => {
    const unreadItem: NotificationDto = {
      id: 'notif-invitation',
      type: 'INVITATION',
      title: 'Convite Aceito',
      message: 'Convite para Barba',
      referenceType: 'INVITATION',
      referenceId: 'inv-456',
      scheduledAt: new Date().toISOString(),
      readAt: null,
    };

    vi.mocked(transport.markNotificationRead).mockRejectedValue(new Error('500 Internal Server Error'));

    const result = await engine.markAsRead(unreadItem);

    expect(result.id).toBe('notif-invitation');
    expect(result.referenceId).toBe('inv-456');
  });

  it('query_key_is_user_scoped: query key isola cache por userId', () => {
    const keyUser1 = buildNotificationQueryKey('user-1', 'cursor-abc');
    const keyUser2 = buildNotificationQueryKey('user-2', 'cursor-abc');

    expect(keyUser1[1]).toBe('user-1');
    expect(keyUser2[1]).toBe('user-2');
    expect(keyUser1).not.toEqual(keyUser2);
  });
});
