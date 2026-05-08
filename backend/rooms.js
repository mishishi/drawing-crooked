// 房间状态 in-memory 存储
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

export function getRandomSentence(usedIds) {
  // 简单随机，MVP 后期优化
}
