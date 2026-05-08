import { rooms, createRoom, getRoom, addPlayer, removePlayer, transferOwner } from '../rooms.js';

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-room', ({ playerName }) => {
      const roomId = generateRoomId();
      const room = createRoom(roomId, socket.id, playerName);
      socket.join(roomId);
      socket.emit('room-joined', { room, playerId: socket.id });
    });

    socket.on('join-room', ({ roomId, playerName }) => {
      const room = getRoom(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      addPlayer(roomId, playerName, socket.id);
      socket.join(roomId);
      io.to(roomId).emit('player-joined', { player: { id: socket.id, name: playerName } });
      socket.emit('room-joined', { room, playerId: socket.id });
    });

    socket.on('leave-room', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) return;
      removePlayer(roomId, socket.id);
      socket.leave(roomId);
      io.to(roomId).emit('player-left', { playerId: socket.id });
    });

    socket.on('player-ready', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) return;
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.ready = !player.ready;
        io.to(roomId).emit('player-status-changed', {
          playerId: socket.id,
          ready: player.ready
        });
      }
    });

    socket.on('start-game', ({ roomId }) => {
      // stub only - full implementation in Task 4
      const room = getRoom(roomId);
      if (!room || room.owner !== socket.id) return;
      room.status = 'playing';
      io.to(roomId).emit('game-started', { roomId });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Clean up rooms where player was
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.some(p => p.id === socket.id)) {
          removePlayer(roomId, socket.id);
          io.to(roomId).emit('player-left', { playerId: socket.id });
          if (room.players.length === 0) {
            rooms.delete(roomId);
          }
        }
      }
    });
  });
}
