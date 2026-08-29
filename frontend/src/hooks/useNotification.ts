import { useState, useEffect, useCallback } from 'react';
import { Notification, getNotification, markNotificationAsRead } from '@/services/notification';
import { useSocket } from '@/hooks/useSocket';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useNotification() {
    const [notification, setNotification] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
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

        setLoading(true);
        getNotification(userId)
            .then(setNotification)
            .catch(() => setNotification([]))
            .finally(() => setLoading(false));
    }, [userId, userLoading]);

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (data: Notification) => {
            setNotification((prev) => [data, ...prev]);
        };

        socket.on('new-notification', handleNewNotification);

        return () => {
            socket.off('new-notification', handleNewNotification);
        };
    }, [socket]);

    const markAsRead = useCallback(async (id: number) => {
        if (!Number.isFinite(id)) return;
        await markNotificationAsRead(id);
        setNotification((prev) =>
            prev.map((n) => (n.id === id ? { ...n, readed: true } : n))
        );
    }, []);

    const hasUnread = notification.some((n) => !n.readed);

    return { notification, loading, hasUnread, markAsRead };
}
