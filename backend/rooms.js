// 房间状态 in-memory 存储
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sentences = require('./sentences.json');

export const rooms = new Map();

export function createRoom(roomId, ownerId, ownerName, selectedStory = null) {
  // 确保selectedStory是字符串或null，不要undefined
  const story = (selectedStory === undefined) ? null : selectedStory;
  console.log('[createRoom] called with:', { roomId, ownerId, ownerName, selectedStory: story, typeof: typeof story });
  const room = {
    roomId,
    players: [{ id: ownerId, name: ownerName, ready: false }],
    owner: ownerId,
    status: 'waiting',
    selectedStory: story,
    currentRound: 0,
    totalRounds: 0,
    sentences: {},
    drawings: [],
    currentPlayerIndex: 0,
    playerScores: {}, // { playerId: totalScore }
    roundScores: []   // [{ round, scores }]
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
  // Preserve selectedStory when resetting
  const preservedStory = room.selectedStory;
  room.status = 'waiting';
  room.currentRound = 0;
  room.totalRounds = 0;
  room.sentences = {};
  room.drawings = [];
  room.currentPlayerIndex = 0;
  room.playerScores = {};
  room.roundScores = [];
  // Restore selectedStory after reset
  room.selectedStory = preservedStory;
  // Reset player ready states
  room.players.forEach(p => {
    p.ready = false;
  });
  console.log('[resetRoomForNewGame] preserved selectedStory:', room.selectedStory);
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
  room.totalRounds = 3; // 3 rounds
  room.currentRound = 1;
  room.currentPlayerIndex = 0;
  room.drawings = [];

  // Use selected story if available, otherwise use random sentences
  console.log('[startGame] ========== STARTING GAME ==========');
  console.log('[startGame] roomId:', roomId);
  console.log('[startGame] selectedStory:', room.selectedStory, '(type:', typeof room.selectedStory, ', isFalsy:', !room.selectedStory, ')');
  console.log('[startGame] players:', room.players.map(p => ({ name: p.name, id: p.id })));

  // Determine which sentence to use
  let sentenceToUse = null;
  if (room.selectedStory && typeof room.selectedStory === 'string' && room.selectedStory.trim().length > 0) {
    sentenceToUse = room.selectedStory.trim();
    console.log('[startGame] USING selectedStory:', sentenceToUse);
  } else {
    console.log('[startGame] BUG: selectedStory is invalid, checking room.sentences...');
    console.log('[startGame] room.sentences:', room.sentences);
    sentenceToUse = Object.values(room.sentences)[0] || null;
    if (sentenceToUse) {
      console.log('[startGame] Recovered sentence from room.sentences:', sentenceToUse);
    }
  }

  // Assign sentences to all players
  if (sentenceToUse) {
    room.players.forEach(p => {
      room.sentences[p.id] = sentenceToUse;
    });
  } else {
    console.log('[startGame] CRITICAL BUG: No sentence available, using random!');
    room.sentences = assignSentences(room.players);
  }

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

export function skipTurn(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return null;

  // Determine what sentence this drawer saw
  const sentence = room.drawings.length === 0
    ? room.sentences[playerId]
    : room.sentences[room.drawings[room.drawings.length - 1].from];

  // Determine who this drawing goes to (next player)
  const toPlayer = room.players[(room.currentPlayerIndex + 1) % room.players.length];

  // Add a placeholder drawing indicating skip
  room.drawings.push({
    from: playerId,
    sentence: sentence,
    to: toPlayer.id,
    imageData: null, // null indicates skipped
    round: room.currentRound,
    playerIndex: room.currentPlayerIndex,
    skipped: true
  });

  // Apply penalty
  room.playerScores[playerId] = (room.playerScores[playerId] || 0) - 5;

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

  // Do NOT reassign sentences - chain must continue with original story
  // Just clear drawings for new round
  room.drawings = [];

  // Send each player their original sentence
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
