import { useState, useEffect, useCallback } from 'react';
import { Notification, getNotification, markNotificationAsRead } from '@/services/notification';
import { getMe } from '@/services/me';

const POLL_INTERVAL = 10000;

export function useNotification() {
    const [notification, setNotification] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);

    const fetchNotifications = useCallback(async (uid: number) => {
        try {
            const data = await getNotification(uid);
            setNotification(data);
        } catch {
        }
    }, []);

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
        if (!userId) return;
        const interval = setInterval(() => fetchNotifications(userId), POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [userId, fetchNotifications]);

    const markAsRead = useCallback(async (id: number) => {
        await markNotificationAsRead(id);
        setNotification((prev) =>
            prev.map((n) => (n.id === id ? { ...n, readed: true } : n))
        );
    }, []);

    const hasUnread = notification.some((n) => !n.readed);

    return { notification, loading, hasUnread, markAsRead };
}
