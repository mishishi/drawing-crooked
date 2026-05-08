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
  room.totalRounds = room.players.length;
  room.currentRound = 1;
  room.currentPlayerIndex = 0;
  room.sentences = assignSentences(room.players);
  room.drawings = [];

  // Send each player their sentence
  room.players.forEach(p => {
    io.to(p.id).emit('your-sentence', { sentence: room.sentences[p.id] });
  });

  // Notify first player to start
  const firstPlayer = room.players[0];
  io.to(firstPlayer.id).emit('your-turn', { round: 1 });

  return room;
}

export function submitDrawing(roomId, playerId, imageData) {
  const room = getRoom(roomId);
  if (!room) return null;

  // Save drawing
  room.drawings.push({
    from: playerId,
    imageData: imageData,
    round: room.currentRound,
    playerIndex: room.currentPlayerIndex
  });

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
    io.to(nextPlayer.id).emit('your-turn', {
      round: room.currentRound,
      previousDrawing: getLastDrawing(room)
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

  // Notify first player of new round
  const firstPlayer = room.players[0];
  io.to(firstPlayer.id).emit('new-round', {
    round: room.currentRound,
    totalRounds: room.totalRounds
  });
  // Send previous round's last drawing to first player
  io.to(firstPlayer.id).emit('your-turn', {
    round: room.currentRound,
    previousDrawing: lastDrawing
  });

  // Notify others they're waiting
  room.players.slice(1).forEach(p => {
    io.to(p.id).emit('new-round', {
      round: room.currentRound,
      totalRounds: room.totalRounds
    });
  });

  return { type: 'new-round', room };
}

export function endGame(roomId, io) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.status = 'ended';
  io.to(roomId).emit('game-ended', { roomId });

  return room;
}
