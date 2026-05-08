import { getRoom } from '../rooms.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-room', ({ playerName }) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // ... create room logic
      socket.emit('room-joined', { roomId, playerId: socket.id });
    });

    socket.on('join-room', ({ roomId, playerName }) => {
      // ... join room logic
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
