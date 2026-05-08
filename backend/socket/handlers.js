import { rooms, createRoom, getRoom, addPlayer, removePlayer, transferOwner, startGame, submitDrawing, advanceToNextPlayer, endGame } from '../rooms.js';

function generateRoomId() {
  let roomId;
  do {
    roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(roomId));
  return roomId;
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
      const player = addPlayer(roomId, playerName, socket.id);
      if (!player) return socket.emit('error', { message: 'Failed to join room' });
      socket.join(roomId);
      io.to(roomId).emit('player-joined', { player: { id: socket.id, name: playerName } });

      // If room is ended, include results for reveal page
      if (room.status === 'ended') {
        // Add player names to drawings
        const drawingsWithNames = room.drawings.map(drawing => {
          const player = room.players.find(p => p.id === drawing.from);
          return {
            ...drawing,
            playerName: player ? player.name : '未知玩家'
          };
        });

        socket.emit('room-joined', {
          room: {
            ...room,
            results: {
              drawings: drawingsWithNames,
              sentences: room.sentences
            }
          },
          playerId: socket.id
        });
      } else {
        socket.emit('room-joined', { room, playerId: socket.id });
      }
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
      const room = getRoom(roomId);
      if (!room || room.owner !== socket.id) return;
      startGame(roomId, io);
      io.to(roomId).emit('game-started', { roomId });
    });

    socket.on('draw-stroke', ({ roomId, imageData }) => {
      const room = getRoom(roomId);
      if (!room) return;
      socket.broadcast.to(roomId).emit('drawing-update', { imageData });
    });

    socket.on('submit-drawing', ({ roomId, imageData }) => {
      const room = getRoom(roomId);
      if (!room) return;

      // Save the drawing - return value must be checked
      const result = submitDrawing(roomId, socket.id, imageData);
      if (!result) return;  // Invalid submission, don't advance

      // Advance to next player
      const advanceResult = advanceToNextPlayer(roomId, io);
      if (advanceResult && advanceResult.type === 'end-game') {
        // Game has ended
      }
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
