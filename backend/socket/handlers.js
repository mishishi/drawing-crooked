import { rooms, createRoom, getRoom, addPlayer, removePlayer, transferOwner, startGame, submitDrawing, skipTurn, advanceToNextPlayer, endGame, resetRoomForNewGame, getLastDrawing } from '../rooms.js';

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

    socket.on('create-room', ({ playerName, story }) => {
      // Guard: prevent duplicate room creation from same socket
      if (socket.data.hasRoom) return;
      socket.data.hasRoom = true;

      // Validate story parameter
      const validatedStory = (story && typeof story === 'string' && story.trim().length > 0) ? story.trim() : null;
      console.log('[create-room] received:', { playerName, story, validatedStory, socketId: socket.id });
      const roomId = generateRoomId();
      const room = createRoom(roomId, socket.id, playerName, validatedStory);
      console.log('[create-room] room created, selectedStory in room:', room.selectedStory);
      socket.join(roomId);
      socket.emit('room-joined', { room, playerId: socket.id, mySentence: room.selectedStory });
    });

    socket.on('join-room', ({ roomId, playerName }) => {
      const room = getRoom(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found' });

      // Check if player already exists in room (e.g., navigating from WaitingRoom)
      const existingPlayer = room.players.find(p => p.id === socket.id);
      if (!existingPlayer) {
        const player = addPlayer(roomId, playerName, socket.id);
        if (!player) return socket.emit('error', { message: 'Failed to join room' });
        io.to(roomId).emit('player-joined', { player: { id: socket.id, name: playerName } });
      }

      socket.join(roomId);

      // If room is ended, include results for reveal page
      if (room.status === 'ended') {
        // Add player names to drawings
        const drawingsWithNames = room.drawings.map(drawing => {
          const player = room.players.find(p => p.id === drawing.from);
          const toPlayer = room.players.find(p => p.id === drawing.to);
          return {
            ...drawing,
            playerName: player ? player.name : '未知玩家',
            toName: toPlayer ? toPlayer.name : '未知'
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
          playerId: socket.id,
          mySentence: room.sentences?.[socket.id] || null
        });
      } else {
        const mySentenceText = room.sentences ? room.sentences[socket.id] : null;
        console.log('[join-room] sending room-joined, socket.id:', socket.id, 'mySentence:', mySentenceText, 'sentences:', room.sentences);
        socket.emit('room-joined', {
          room,
          playerId: socket.id,
          mySentence: mySentenceText
        });

        // If game is in progress, resend your-turn to this player
        if (room.status === 'playing') {
          const currentPlayer = room.players[room.currentPlayerIndex];
          const prevDrawing = room.drawings.length > 0 ? room.drawings[room.drawings.length - 1].imageData : null;
          console.log('[join-room] game in progress, sending your-turn to:', socket.id, 'isMyTurn:', currentPlayer?.id === socket.id);
          socket.emit('your-turn', {
            round: room.currentRound,
            totalRounds: room.totalRounds,
            currentPlayerName: currentPlayer?.name || '',
            previousDrawing: currentPlayer?.id === socket.id ? prevDrawing : null,
            isMyTurn: currentPlayer?.id === socket.id
          });
        }
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
      console.log('[start-game] received, checking room:', { roomId, roomExists: !!room, owner: room?.owner, socketOwner: socket.id, selectedStory: room?.selectedStory });
      if (!room || room.owner !== socket.id) {
        console.log('[start-game] rejected:', { roomExists: !!room, isOwner: room?.owner === socket.id, socketId: socket.id });
        return;
      }
      console.log('[start-game] selectedStory before startGame:', room.selectedStory);
      startGame(roomId, io);
      io.to(roomId).emit('game-started', { roomId });
    });

    socket.on('restart-game', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) return;
      console.log('[restart-game] room:', roomId);
      resetRoomForNewGame(roomId);
      io.to(roomId).emit('game-restarted', { roomId });
    });

    socket.on('draw-stroke', ({ roomId, imageData }) => {
      const room = getRoom(roomId);
      if (!room) return;
      socket.broadcast.to(roomId).emit('drawing-update', { imageData });
    });

    socket.on('submit-drawing', ({ roomId, imageData }) => {
      console.log('[submit-drawing] received from:', socket.id, 'roomId:', roomId, 'imageData length:', imageData?.length || 0);
      const room = getRoom(roomId);
      if (!room) {
        console.log('[submit-drawing] room not found:', roomId);
        return;
      }

      const currentPlayer = room.players[room.currentPlayerIndex];
      console.log('[submit-drawing] processing', { roomId, socketId: socket.id, currentPlayerId: currentPlayer?.id, currentPlayerIndex: room.currentPlayerIndex, isMyTurn: currentPlayer?.id === socket.id });

      // Save the drawing - return value must be checked
      const result = submitDrawing(roomId, socket.id, imageData);
      if (!result) {
        console.log('[submit-drawing] rejected - not this player\'s turn');
        return;  // Invalid submission, don't advance
      }

      console.log('[submit-drawing] accepted, advancing to next player');

      // Advance to next player
      const advanceResult = advanceToNextPlayer(roomId, io);
      if (advanceResult && advanceResult.type === 'end-game') {
        console.log('[submit-drawing] game has ended');
        // Game has ended
      }
    });

    socket.on('skip-turn', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) return;

      const currentPlayer = room.players[room.currentPlayerIndex];
      if (currentPlayer?.id !== socket.id) return;

      const result = skipTurn(roomId, socket.id);
      if (!result) return;

      io.to(roomId).emit('turn-skipped', {
        playerId: socket.id,
        playerName: currentPlayer.name,
        penalty: 5
      });

      // Advance to next player
      advanceToNextPlayer(roomId, io);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Clean up rooms where player was
      for (const [roomId, room] of rooms.entries()) {
        if (room.players.some(p => p.id === socket.id)) {
          const disconnectedIndex = room.players.findIndex(p => p.id === socket.id);
          const wasCurrentPlayer = room.status === 'playing' && disconnectedIndex === room.currentPlayerIndex;
          removePlayer(roomId, socket.id);
          io.to(roomId).emit('player-left', { playerId: socket.id });

          // If game is in progress and disconnected player was current player, give turn to next player
          if (wasCurrentPlayer) {
            console.log('[disconnect] current player left, transferring turn to next');
            const disconnectedPlayerName = room.players[disconnectedIndex]?.name || '一位玩家';
            if (room.players.length > 0) {
              // After removal, the next player slides into the current index
              // Ensure index is valid
              if (room.currentPlayerIndex >= room.players.length) {
                room.currentPlayerIndex = 0;
              }
              const nextPlayer = room.players[room.currentPlayerIndex];
              const prevDrawing = getLastDrawing(room);
              // Notify all players about the skip
              io.to(roomId).emit('turn-skipped', {
                skippedPlayerName: disconnectedPlayerName,
                newCurrentPlayerName: nextPlayer ? nextPlayer.name : ''
              });
              // Notify all players whose turn it is now
              room.players.forEach((p, index) => {
                io.to(p.id).emit('your-turn', {
                  round: room.currentRound,
                  totalRounds: room.totalRounds,
                  previousDrawing: index === room.currentPlayerIndex ? prevDrawing : null,
                  currentPlayerName: nextPlayer ? nextPlayer.name : '',
                  isMyTurn: index === room.currentPlayerIndex
                });
              });
            } else {
              // No players left
              rooms.delete(roomId);
            }
          } else if (room.status === 'playing' && disconnectedIndex < room.currentPlayerIndex) {
            // Shift currentPlayerIndex down since we removed a player before the current one
            room.currentPlayerIndex--;
          }

          if (room.players.length === 0) {
            rooms.delete(roomId);
          }
        }
      }
    });
  });
}
