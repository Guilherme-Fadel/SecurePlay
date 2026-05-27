import { useState, useEffect, useCallback } from 'react';
import { Notification, getNotification, markNotificationAsRead } from '@/services/notification';
import { getMe } from '@/services/me';
import { useSocket } from '@/hooks/useSocket';

export function useNotification() {
    const [notification, setNotification] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);

    const socket = useSocket(userId);

    useEffect(() => {
        getMe()
            .then((user) => {
                setUserId(user.userId);
                return getNotification(user.userId);
            })
            .then(setNotification)
            .catch(() => setNotification([]))
            .finally(() => setLoading(false));
    }, []);

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
        await markNotificationAsRead(id);
        setNotification((prev) =>
            prev.map((n) => (n.id === id ? { ...n, readed: true } : n))
        );
    }, []);

    const hasUnread = notification.some((n) => !n.readed);

    return { notification, loading, hasUnread, markAsRead };
}
