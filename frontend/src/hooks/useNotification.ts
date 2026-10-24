import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Notification,
    getNotification,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '@/services/notification';
import { useSocket } from '@/hooks/useSocket';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useNotification() {
    const [notification, setNotification] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const revision = useRef(0);
    const { user, loading: userLoading } = useCurrentUser();
    const userId = user?.userId ?? null;

    const socket = useSocket(userId);

    useEffect(() => {
        if (userLoading) return;
        if (!userId) {
            setNotification([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        let pending = false;
        let refreshAgain = false;
        const refresh = async () => {
            if (document.visibilityState === 'hidden' || !navigator.onLine) return;
            if (pending) { refreshAgain = true; return; }
            pending = true;
            const version = revision.current;
            try {
                const items = await getNotification(userId);
                if (!cancelled && version === revision.current) setNotification(items);
            } catch {
                // Preserve the last known notifications during a transient failure.
            } finally {
                pending = false;
                if (!cancelled) {
                    setLoading(false);
                    if (refreshAgain || version !== revision.current) {
                        refreshAgain = false;
                        void refresh();
                    }
                }
            }
        };
        const handleNewNotification = (data: Notification) => {
            revision.current += 1;
            setNotification((prev) => [data, ...prev.filter((item) => item.id !== data.id)]);
        };
        setLoading(true);
        void refresh();
        socket?.on('new-notification', handleNewNotification);
        socket?.on('connect', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        document.addEventListener('visibilitychange', refresh);
        const timer = window.setInterval(refresh, 60_000);
        return () => {
            cancelled = true;
            socket?.off('new-notification', handleNewNotification);
            socket?.off('connect', refresh);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('online', refresh);
            document.removeEventListener('visibilitychange', refresh);
            window.clearInterval(timer);
        };
    }, [socket, userId, userLoading]);

    const markAsRead = useCallback(async (id: number) => {
        if (!Number.isFinite(id)) return;
        await markNotificationAsRead(id);
        revision.current += 1;
        setNotification((prev) =>
            prev.map((n) => (n.id === id ? { ...n, readed: true } : n))
        );
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        await markAllNotificationsAsRead(userId);
        revision.current += 1;
        setNotification((prev) => prev.map((item) => ({ ...item, readed: true })));
    }, [userId]);

    const hasUnread = notification.some((n) => !n.readed);
    const unreadCount = notification.filter((n) => !n.readed).length;

    return { notification, loading, hasUnread, unreadCount, markAsRead, markAllAsRead };
}
