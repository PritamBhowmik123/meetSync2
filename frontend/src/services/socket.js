import { io } from 'socket.io-client';

// If in development and using Vite proxy or direct host
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 
  (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin);

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

