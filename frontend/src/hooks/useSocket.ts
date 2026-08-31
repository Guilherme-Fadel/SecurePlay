import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useSocket(userId: number | null): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Conectado:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Desconectado:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Erro de conexão:', err.message);
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [userId]);

  return socket;
}
