<template>
  <div class="waiting-room">
    <!-- Disconnected overlay -->
    <div v-if="isDisconnected" class="disconnected-overlay">
      <div class="disconnected-message">
        <span class="disconnected-icon">📡</span>
        <span>连接中断，正在重连...</span>
      </div>
    </div>

    <!-- Notebook paper background -->
    <div class="notebook-bg"></div>

    <!-- Floating decorations -->
    <div class="deco deco-1">📝</div>
    <div class="deco deco-2">🎮</div>
    <div class="deco deco-3">✨</div>

    <!-- Main content -->
    <div class="waiting-content">
      <!-- Header -->
      <header class="room-header">
        <div class="spiral"></div>
        <div class="header-main">
          <h1 class="title">等待室</h1>
          <div class="room-code-card">
            <span class="room-code-label">房间号</span>
            <div class="room-code-row">
              <span class="room-code">{{ roomId }}</span>
              <button @click="copyRoomCode" class="copy-btn" :class="{ copied: codeCopied }">
                <span v-if="!codeCopied">📋</span>
                <span v-else>✓</span>
              </button>
            </div>
            <button @click="shareRoom" class="share-btn">
              <span>🔗</span> 分享邀请链接
            </button>
          </div>
        </div>
      </header>

      <!-- Players list card -->
      <div class="players-card">
        <div class="card-header">
          <span class="card-icon">👥</span>
          <h2>玩家列表</h2>
          <span class="player-count-badge">{{ players.length }}人</span>
        </div>

        <transition-group name="player" tag="ul" class="player-list">
          <li
            v-for="(player, index) in players"
            :key="player.id"
            class="player-item"
            :class="{ 'is-leaving': player.isLeaving }"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="player-info">
              <span class="player-avatar">{{ getAvatarEmoji(index) }}</span>
              <span class="player-name">
                {{ player.name }}
                <span v-if="player.id === ownerId" class="owner-tag">👑 房主</span>
                <span v-if="player.id === playerId" class="you-tag">(你)</span>
              </span>
            </div>
            <div class="ready-indicator" :class="{ ready: player.ready }">
              <span class="ready-icon">{{ player.ready ? '✓' : '○' }}</span>
              <span class="ready-text">{{ player.ready ? '已准备' : '等待中' }}</span>
            </div>
          </li>
        </transition-group>
      </div>

      <!-- Actions -->
      <div class="actions-card">
        <button
          @click="toggleReady"
          class="action-btn ready-btn"
          :class="{ active: isReady }"
        >
          <span class="btn-icon">{{ isReady ? '✋' : '👍' }}</span>
          <span class="btn-text">{{ isReady ? '取消准备' : '准备开始' }}</span>
        </button>

        <button
          v-if="isOwner"
          @click="startGame"
          class="action-btn start-btn"
          :disabled="!canStart"
        >
          <span class="btn-icon">🚀</span>
          <span class="btn-text">开始游戏</span>
          <span class="btn-arrow">→</span>
        </button>
      </div>

      <!-- Hint messages -->
      <div class="hints">
        <transition name="hint-fade">
          <p v-if="!isOwner && players.length < 2" class="hint waiting">
            <span class="hint-icon">⏳</span>
            等待其他玩家加入...
          </p>
        </transition>
        <transition name="hint-fade">
          <p v-if="!isOwner && players.length >= 2 && !allReady" class="hint waiting">
            <span class="hint-icon">🤔</span>
            等待所有玩家准备...
          </p>
        </transition>
        <transition name="hint-fade">
          <p v-if="isOwner && !canStart && players.length >= 2" class="hint waiting">
            <span class="hint-icon">👀</span>
            等待玩家准备...
          </p>
        </transition>
        <transition name="hint-fade">
          <p v-if="isOwner && canStart" class="hint ready">
            <span class="hint-icon">🎉</span>
            所有玩家已准备，可以开始了！
          </p>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { socket } from '../socket/client.js';
import { showToast } from '../store/toastStore.js';

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;
const playerName = route.query.name || '';
const playerId = ref('');
const room = ref({ players: [] });
const ownerId = ref('');
const isDisconnected = ref(false);

const passedRoom = route.query.room ? JSON.parse(route.query.room) : null;
if (passedRoom) {
  room.value = passedRoom.room;
  playerId.value = passedRoom.playerId;
  ownerId.value = passedRoom.room.owner;
}

const codeCopied = ref(false);
const linkCopied = ref(false);

const isOwner = computed(() => playerId.value === ownerId.value);

const isReady = computed(() => {
  const me = room.value.players.find(p => p.id === playerId.value);
  return me ? me.ready : false;
});

const allReady = computed(() => {
  return room.value.players.length >= 2 && room.value.players.every(p => p.ready);
});

const canStart = computed(() => {
  return room.value.players.length >= 2 && room.value.players.every(p => p.ready);
});

const players = computed(() => room.value.players || []);

function getAvatarEmoji(index) {
  const avatars = ['🧑', '👩', '👨', '🧔', '👵', '👴', '🧑‍🎤', '👩‍🎨'];
  return avatars[index % avatars.length];
}

function toggleReady() {
  socket.emit('player-ready', { roomId });
}

function startGame() {
  socket.emit('start-game', { roomId });
}

function copyRoomCode() {
  navigator.clipboard.writeText(roomId).then(() => {
    codeCopied.value = true;
    setTimeout(() => { codeCopied.value = false; }, 2000);
  });
}

function shareRoom() {
  const shareUrl = `${window.location.origin}/#/waiting/${roomId}?name=${encodeURIComponent(playerName)}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    linkCopied.value = true;
    setTimeout(() => { linkCopied.value = false; }, 2000);
  }).catch(() => {
    showToast('复制链接失败，请手动复制', 'error');
  });
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
  // Mark player as leaving for animation, then remove after delay
  const leavingPlayer = room.value.players.find(p => p.id === pid);
  if (leavingPlayer) {
    leavingPlayer.isLeaving = true;
    setTimeout(() => {
      room.value.players = room.value.players.filter(p => p.id !== pid);
    }, 300);
  }
};

const handlePlayerStatusChanged = ({ playerId: pid, ready }) => {
  const player = room.value.players.find(p => p.id === pid);
  if (player) player.ready = ready;
};

const handleRoomUpdate = ({ room: r }) => {
  room.value = r;
  ownerId.value = r.owner;
};

const handleGameStarted = ({ roomId: rid }) => {
  router.push({ name: 'play', params: { roomId: rid } });
};

const handleError = ({ message }) => {
  showToast(message, 'error');
  // Don't auto-navigate home - let user retry with their input preserved
};

const handleDisconnect = () => {
  isDisconnected.value = true;
  showToast('网络连接已断开，正在重连...', 'error');
};

const handleReconnect = () => {
  isDisconnected.value = false;
  showToast('已重新连接', 'success');
  // Re-join the room to sync state
  socket.emit('join-room', { roomId, playerName });
};

onMounted(() => {
  if (!passedRoom) {
    socket.emit('join-room', { roomId, playerName });
  }

  socket.on('room-joined', handleRoomJoined);
  socket.on('room-update', handleRoomUpdate);
  socket.on('player-joined', handlePlayerJoined);
  socket.on('player-left', handlePlayerLeft);
  socket.on('player-status-changed', handlePlayerStatusChanged);
  socket.on('game-started', handleGameStarted);
  socket.on('error', handleError);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect', handleReconnect);
});

onUnmounted(() => {
  socket.off('room-joined', handleRoomJoined);
  socket.off('room-update', handleRoomUpdate);
  socket.off('player-joined', handlePlayerJoined);
  socket.off('player-left', handlePlayerLeft);
  socket.off('player-status-changed', handlePlayerStatusChanged);
  socket.off('game-started', handleGameStarted);
  socket.off('error', handleError);
  socket.off('disconnect', handleDisconnect);
  socket.off('connect', handleReconnect);
});
</script>

<style scoped>
.waiting-room {
  position: relative;
  min-height: 100vh;
  padding: 20px;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      transparent,
      transparent 39px,
      #e8d4c4 39px,
      #e8d4c4 40px
    ),
    linear-gradient(90deg, transparent 59px, #ffcccc 59px, #ffcccc 61px, transparent 61px),
    var(--bg-paper);
}

/* Decorations */
.deco {
  position: fixed;
  font-size: 36px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 1;
}

.deco-1 {
  top: 10%;
  right: 8%;
  animation: float1 4s ease-in-out infinite;
}

.deco-2 {
  bottom: 15%;
  left: 5%;
  animation: float2 5s ease-in-out infinite;
}

.deco-3 {
  top: 50%;
  right: 5%;
  animation: float3 4s ease-in-out infinite 0.5s;
}

@keyframes float1 {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-15px) rotate(5deg); }
}

@keyframes float2 {
  0%, 100% { transform: translateY(0) rotate(5deg); }
  50% { transform: translateY(-20px) rotate(-5deg); }
}

@keyframes float3 {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(8deg); }
}

/* Disconnected overlay */
.disconnected-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.disconnected-message {
  background: white;
  padding: 20px 32px;
  border-radius: 16px;
  border: 4px solid var(--color-accent-red);
  box-shadow: 6px 6px 0 var(--color-accent-red);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-accent-red);
}

.disconnected-icon {
  font-size: 1.5rem;
}

/* Content */
.waiting-content {
  position: relative;
  z-index: 10;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.room-header {
  display: flex;
  align-items: center;
  gap: 16px;
  animation: slideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spiral {
  width: 36px;
  height: 50px;
  background: repeating-linear-gradient(
    to bottom,
    #666 0px,
    #666 5px,
    transparent 5px,
    transparent 14px
  );
  border-radius: 4px;
}

.header-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  padding: 12px 20px;
  border: 3px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-primary);
}

.title {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--color-accent-purple);
  margin: 0;
  transform: rotate(-2deg);
  text-shadow: 2px 2px 0 var(--color-accent-yellow);
}

.room-code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: var(--bg-paper);
  padding: 8px 16px;
  border: 2px solid var(--color-primary);
  border-radius: 10px;
  transform: rotate(2deg);
}

.room-code-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
}

.room-code-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-code {
  font-size: 1.4rem;
  font-weight: bold;
  font-family: monospace;
  color: var(--color-accent-red);
  letter-spacing: 3px;
}

.copy-btn {
  background: white;
  border: 2px solid var(--color-primary);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--color-accent-yellow);
}

.copy-btn.copied {
  background: #e8f5e9;
  border-color: #4caf50;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-accent-purple);
  color: white;
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.share-btn:hover {
  transform: translateY(-2px);
  box-shadow: 2px 2px 0 var(--color-primary);
}

/* Players card */
.players-card {
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 5px 5px 0 var(--color-primary);
  overflow: hidden;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff 0%, #f8f8ff 100%);
  border-bottom: 2px solid var(--color-primary);
}

.card-icon {
  font-size: 1.4rem;
}

.card-header h2 {
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-primary);
}

.player-count-badge {
  background: var(--color-accent-purple);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: bold;
}

.player-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px dashed #ddd;
  animation: itemSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.player-item:last-child {
  border-bottom: none;
}

@keyframes itemSlide {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Player leave transition */
.player-enter-active {
  animation: itemSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.player-leave-active {
  animation: itemLeave 0.3s ease-out forwards;
}

.player-item.is-leaving {
  animation: itemLeave 0.3s ease-out forwards;
}

@keyframes itemLeave {
  to {
    opacity: 0;
    transform: translateX(20px) scale(0.9);
  }
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-avatar {
  font-size: 1.5rem;
}

.player-name {
  font-weight: bold;
  color: var(--color-primary);
  font-size: 1rem;
}

.owner-tag {
  font-size: 0.75rem;
  background: var(--color-accent-yellow);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

.you-tag {
  font-size: 0.75rem;
  color: #888;
  margin-left: 4px;
}

.ready-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #f0f0f0;
  border: 2px solid #ddd;
  transition: all 0.3s;
}

.ready-indicator.ready {
  background: #e8f5e9;
  border-color: #4caf50;
}

.ready-icon {
  font-size: 1rem;
}

.ready-text {
  font-size: 0.85rem;
  color: #888;
}

.ready-indicator.ready .ready-text {
  color: #4caf50;
  font-weight: bold;
}

/* Actions */
.actions-card {
  display: flex;
  gap: 12px;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 20px;
  font-size: 1.1rem;
  font-weight: bold;
  font-family: var(--font-display);
  border: 4px solid var(--color-primary);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-primary);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.action-btn:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--color-primary);
}

.action-btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-primary);
}

.ready-btn {
  background: var(--color-accent-purple);
  color: white;
}

.ready-btn.active {
  background: var(--color-accent-yellow);
  color: var(--color-primary);
}

.start-btn {
  background: var(--color-accent-red);
  color: white;
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 4px 4px 0 var(--color-primary);
}

.btn-icon {
  font-size: 1.3rem;
}

.btn-arrow {
  font-size: 1.2rem;
  opacity: 0.8;
}

/* Hints */
.hints {
  text-align: center;
  min-height: 40px;
}

.hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 0.95rem;
}

.hint.waiting {
  background: white;
  color: #666;
  border: 2px solid #ddd;
}

.hint.ready {
  background: #e8f5e9;
  color: #4caf50;
  border: 2px solid #4caf50;
}

.hint-icon {
  font-size: 1.1rem;
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: all 0.3s;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 500px) {
  .header-main {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .room-code-card {
    transform: none;
  }

  .actions-card {
    flex-direction: column;
  }
}
</style>
