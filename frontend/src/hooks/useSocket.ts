import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_ORIGIN, SOCKET_PATH } from '@/services/api-config';

export function useSocket(userId: number | null): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(SOCKET_ORIGIN, {
      path: SOCKET_PATH,
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    // Keep the instance across reconnects so consumers can resynchronize on connect.
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [userId]);

  return socket;
}
