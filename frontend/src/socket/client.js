import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

export { socket };
