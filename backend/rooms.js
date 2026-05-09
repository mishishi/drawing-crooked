// 房间状态 in-memory 存储
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sentences = require('./sentences.json');

export const rooms = new Map();

export function createRoom(roomId, ownerId, ownerName) {
  const room = {
    roomId,
    players: [{ id: ownerId, name: ownerName, ready: false }],
    owner: ownerId,
    status: 'waiting',
    currentRound: 0,
    totalRounds: 0,
    sentences: {},
    drawings: [],
    currentPlayerIndex: 0
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function addPlayer(roomId, playerName, playerId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = { id: playerId, name: playerName, ready: false };
  room.players.push(player);
  return player;
}

export function removePlayer(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  const index = room.players.findIndex(p => p.id === playerId);
  if (index === -1) return false;
  room.players.splice(index, 1);
  if (room.owner === playerId) {
    transferOwner(roomId);
  }
  return true;
}

export function transferOwner(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.players.length === 0) return null;
  room.owner = room.players[0].id;
  return room.owner;
}

export function resetRoomForNewGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = 'waiting';
  room.currentRound = 0;
  room.totalRounds = 0;
  room.sentences = {};
  room.drawings = [];
  room.currentPlayerIndex = 0;
  // Reset player ready states
  room.players.forEach(p => {
    p.ready = false;
  });
  return room;
}

export function getRandomSentence(usedIds = []) {
  const available = sentences.filter(s => !usedIds.includes(s.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// Assign unique sentences to all players in the room
export function assignSentences(players) {
  const usedIds = [];
  const sentencesMap = {};
  for (const player of players) {
    const sentence = getRandomSentence(usedIds);
    if (sentence) {
      sentencesMap[player.id] = sentence.text;
      usedIds.push(sentence.id);
    }
  }
  return sentencesMap;
}

export function startGame(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.status = 'playing';
  room.totalRounds = 1; // One round: each player draws once in sequence
  room.currentRound = 1;
  room.currentPlayerIndex = 0;
  room.sentences = assignSentences(room.players);
  room.drawings = [];

  // Send each player their sentence
  room.players.forEach(p => {
    console.log(`[startGame] emitting your-sentence to ${p.name} (${p.id}):`, room.sentences[p.id]);
    io.to(p.id).emit('your-sentence', { sentence: room.sentences[p.id] });
  });

  // Notify all players whose turn it is
  const firstPlayer = room.players[0];
  room.players.forEach((p, index) => {
    console.log(`[startGame] emitting your-turn to ${p.name} (${p.id}), isMyTurn: ${index === 0}`);
    io.to(p.id).emit('your-turn', {
      round: 1,
      totalRounds: room.totalRounds,
      currentPlayerName: firstPlayer.name,
      previousDrawing: null,
      isMyTurn: index === 0
    });
  });

  return room;
}

export function submitDrawing(roomId, playerId, imageData) {
  const room = getRoom(roomId);
  if (!room) return null;
  if (room.players[room.currentPlayerIndex].id !== playerId) {
    console.log('[submitDrawing] rejected:', { currentPlayerIndex: room.currentPlayerIndex, currentPlayerId: room.players[room.currentPlayerIndex]?.id, submittedBy: playerId });
    return null; // Not this player's turn
  }

  // Determine what sentence this drawer SAW (for first drawing, it's their own sentence)
  const sentence = room.drawings.length === 0
    ? room.sentences[playerId]
    : room.sentences[room.drawings[room.drawings.length - 1].from];
  // Determine who this drawing goes to (next player)
  const toPlayer = room.players[(room.currentPlayerIndex + 1) % room.players.length];

  // Save drawing
  room.drawings.push({
    from: playerId,
    sentence: sentence,
    to: toPlayer.id,
    imageData: imageData,
    round: room.currentRound,
    playerIndex: room.currentPlayerIndex
  });

  console.log('[submitDrawing] saved drawing for round', room.currentRound, 'playerIndex:', room.currentPlayerIndex, 'total drawings:', room.drawings.length);
  return room;
}

export function advanceToNextPlayer(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.currentPlayerIndex++;

  if (room.currentPlayerIndex >= room.players.length) {
    // Round complete
    if (room.currentRound >= room.totalRounds) {
      // Game over - actually call endGame
      endGame(roomId, io);
      return { type: 'end-game', room };
    } else {
      // Start next round
      room.currentRound++;
      room.currentPlayerIndex = 0;
      return startNewRound(roomId, io);
    }
  } else {
    const nextPlayer = room.players[room.currentPlayerIndex];
    const prevDrawing = getLastDrawing(room);
    console.log(`[advanceToNextPlayer] nextPlayer: ${nextPlayer.name}, prevDrawing: ${prevDrawing ? 'exists' : 'null'}, drawings count: ${room.drawings.length}`);
    // Notify ALL players whose turn it is
    room.players.forEach((p, index) => {
      io.to(p.id).emit('your-turn', {
        round: room.currentRound,
        totalRounds: room.totalRounds,
        previousDrawing: index === room.currentPlayerIndex ? prevDrawing : null,
        currentPlayerName: nextPlayer.name,
        isMyTurn: index === room.currentPlayerIndex
      });
    });
    return { type: 'next-player', room };
  }
}

export function getLastDrawing(room) {
  // Get the most recent drawing from previous player
  if (room.drawings.length === 0) return null;
  const lastDrawing = room.drawings[room.drawings.length - 1];
  return lastDrawing.imageData;
}

export function startNewRound(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return null;

  // Get last drawing from previous round BEFORE clearing
  const lastDrawing = getLastDrawing(room);

  // Reassign sentences for new round
  room.sentences = assignSentences(room.players);
  room.drawings = [];

  // Send each player their new sentence
  room.players.forEach(p => {
    io.to(p.id).emit('your-sentence', { sentence: room.sentences[p.id] });
  });

  // Notify all players whose turn it is
  const firstPlayer = room.players[0];
  room.players.forEach((p, index) => {
    io.to(p.id).emit('new-round', {
      round: room.currentRound,
      totalRounds: room.totalRounds
    });
    io.to(p.id).emit('your-turn', {
      round: room.currentRound,
      totalRounds: room.totalRounds,
      previousDrawing: index === 0 ? lastDrawing : null,
      currentPlayerName: firstPlayer.name,
      isMyTurn: index === 0
    });
  });

  return { type: 'new-round', room };
}

export function endGame(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.status = 'ended';

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

  io.to(roomId).emit('game-ended', {
    roomId,
    results: {
      drawings: drawingsWithNames,
      sentences: room.sentences
    }
  });

  return room;
}
