import { io } from 'socket.io-client';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (isLocalhost ? 'http://localhost:5000' : window.location.origin);

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

