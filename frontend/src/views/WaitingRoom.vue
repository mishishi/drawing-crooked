<template>
  <div class="waiting-room">
    <div class="room-header">
      <h1 class="title">等待室</h1>
      <div class="room-id-box">
        <span class="label">房间号</span>
        <span class="room-id">{{ roomId }}</span>
      </div>
    </div>

    <div class="players-section">
      <h2>玩家列表</h2>
      <ul class="player-list">
        <li v-for="player in players" :key="player.id" class="player-item">
          <span class="player-name">
            {{ player.name }}
            <span v-if="player.id === ownerId" class="owner-badge">房主</span>
          </span>
          <span :class="['ready-status', { ready: player.ready }]">
            {{ player.ready ? '已准备' : '未准备' }}
          </span>
        </li>
      </ul>
    </div>

    <div class="actions">
      <button
        @click="toggleReady"
        :class="['hand-drawn-btn', isReady ? 'cancel' : 'primary']"
      >
        {{ isReady ? '取消准备' : '准备' }}
      </button>
      <button
        v-if="isOwner"
        @click="startGame"
        class="hand-drawn-btn start"
        :disabled="!canStart"
      >
        开始游戏
      </button>
    </div>

    <p v-if="!isOwner && players.length < 2" class="hint">
      等待房主开始游戏...
    </p>
    <p v-if="!isOwner && players.length >= 2" class="hint">
      等待所有玩家准备...
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { socket } from '../socket/client.js';

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;
const playerName = route.query.name || '';
const playerId = ref('');
const room = ref({ players: [] });
const ownerId = ref('');

const isOwner = computed(() => playerId.value === ownerId.value);

const isReady = computed(() => {
  const me = room.value.players.find(p => p.id === playerId.value);
  return me ? me.ready : false;
});

const canStart = computed(() => {
  return room.value.players.length >= 2 && room.value.players.every(p => p.ready);
});

const players = computed(() => room.value.players || []);

function toggleReady() {
  socket.emit('player-ready', { roomId });
}

function startGame() {
  socket.emit('start-game', { roomId });
}

const handleRoomJoined = ({ room: r, playerId: pid }) => {
  room.value = r;
  playerId.value = pid;
  ownerId.value = r.owner;
};

const handlePlayerJoined = ({ player }) => {
  if (!room.value.players.find(p => p.id === player.id)) {
    room.value.players.push(player);
  }
};

const handlePlayerLeft = ({ playerId: pid }) => {
  room.value.players = room.value.players.filter(p => p.id !== pid);
};

const handlePlayerStatusChanged = ({ playerId: pid, ready }) => {
  const player = room.value.players.find(p => p.id === pid);
  if (player) player.ready = ready;
};

const handleGameStarted = ({ roomId: rid }) => {
  router.push({ name: 'play', params: { roomId: rid } });
};

const handleError = ({ message }) => {
  alert(message);
  router.push({ name: 'home' });
};

onMounted(() => {
  socket.emit('join-room', { roomId, playerName });

  socket.on('room-joined', handleRoomJoined);
  socket.on('player-joined', handlePlayerJoined);
  socket.on('player-left', handlePlayerLeft);
  socket.on('player-status-changed', handlePlayerStatusChanged);
  socket.on('game-started', handleGameStarted);
  socket.on('error', handleError);
});

onUnmounted(() => {
  socket.off('room-joined', handleRoomJoined);
  socket.off('player-joined', handlePlayerJoined);
  socket.off('player-left', handlePlayerLeft);
  socket.off('player-status-changed', handlePlayerStatusChanged);
  socket.off('game-started', handleGameStarted);
  socket.off('error', handleError);
});
</script>

<style scoped>
.waiting-room {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 24px;
  padding: 24px;
}

.room-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.title {
  font-family: var(--font-display);
  font-size: 3rem;
  color: var(--color-accent-purple);
  transform: rotate(-2deg);
  text-shadow: 3px 3px 0 var(--color-accent-yellow);
}

.room-id-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  padding: 16px 32px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
}

.room-id-box .label {
  font-size: 14px;
  color: #666;
}

.room-id-box .room-id {
  font-size: 2rem;
  font-weight: bold;
  font-family: monospace;
  color: var(--color-accent-red);
  letter-spacing: 4px;
}

.players-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  width: 100%;
  max-width: 400px;
}

.players-section h2 {
  font-size: 1.2rem;
  margin-bottom: 16px;
  text-align: center;
  color: var(--color-primary);
}

.player-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-paper);
  border-radius: 8px;
  border: 2px solid var(--color-primary);
}

.player-name {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.owner-badge {
  font-size: 12px;
  background: var(--color-accent-yellow);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-primary);
}

.ready-status {
  font-size: 14px;
  color: #999;
}

.ready-status.ready {
  color: var(--color-accent-purple);
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 16px;
}

.primary {
  background: var(--color-accent-purple);
  color: white;
}

.cancel {
  background: var(--color-accent-yellow);
  color: var(--color-primary);
}

.start {
  background: var(--color-accent-red);
  color: white;
}

.start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  font-size: 14px;
  color: #666;
}
</style>
