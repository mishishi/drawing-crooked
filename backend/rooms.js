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
