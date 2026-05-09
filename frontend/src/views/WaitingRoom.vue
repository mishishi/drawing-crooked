<template>
  <div class="waiting-room">
    <!-- Connection overlay -->
    <div v-if="connectionState !== 'connected'" class="connection-overlay">
      <div class="connection-message" :class="connectionState">
        <span v-if="connectionState === 'reconnecting'" class="connection-icon spinning">🔄</span>
        <span v-else class="connection-icon">📡</span>
        <span v-if="connectionState === 'reconnecting'" class="connection-text">正在重新连接...</span>
        <span v-else class="connection-text">连接已断开</span>
        <div v-if="connectionState === 'reconnecting'" class="reconnect-progress">
          <div class="reconnect-dot"></div>
          <div class="reconnect-dot"></div>
          <div class="reconnect-dot"></div>
        </div>
      </div>
    </div>

    <!-- Notebook paper background -->
    <div class="notebook-bg"></div>

    <!-- Intro card -->
    <div class="intro-card">
      <div class="intro-text">
        <span class="intro-icon">🎯</span>
        <span>游戏规则：每人画一句，链条越长越歪！</span>
      </div>
      <div class="intro-count">
        <span>👀 {{ players.length }}人已就位{{ players.length < 2 ? '，等待最后' + (2 - players.length) + '人...' : '!' }}</span>
      </div>
    </div>

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
            <!-- Share panel toggle -->
            <button @click="showSharePanel = !showSharePanel" class="share-btn">
              <span>🔗</span> 邀请朋友
            </button>
            <!-- Share panel dropdown -->
            <transition name="share-panel">
              <div v-if="showSharePanel" class="share-panel">
                <div class="share-panel-header">邀请好友加入</div>
                <div class="share-link-row">
                  <input readonly :value="shareUrl" class="share-link-input" />
                  <button @click="copyShareLink" class="copy-link-btn" :class="{ copied: linkCopied }">
                    {{ linkCopied ? '已复制' : '复制' }}
                  </button>
                </div>
                <div class="share-actions">
                  <button @click="shareViaSMS" class="share-action-btn sms">
                    <span class="action-icon">💬</span>
                    <span class="action-text">短信</span>
                  </button>
                  <button @click="shareViaQQ" class="share-action-btn qq">
                    <span class="action-icon">🐧</span>
                    <span class="action-text">QQ</span>
                  </button>
                  <button @click="shareViaWeChat" class="share-action-btn wechat">
                    <span class="action-icon">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </span>
                    <span class="action-text">复制链接</span>
                  </button>
                </div>
                <div class="share-hint">复制链接后发送给朋友即可加入</div>
              </div>
            </transition>
          </div>
          <div v-if="isRandomMode" class="random-story-badge">
            <span class="badge-icon">🎲</span>
            <span>随机故事模式</span>
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

        <div class="min-players-hint">
          <span class="hint-icon">💡</span>
          <span class="hint-text">至少需要2位玩家才能开始游戏</span>
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
              <span class="ready-icon">{{ player.ready ? '✓' : '⏱' }}</span>
              <span class="ready-text">{{ player.ready ? '已准备' : '等待中' }}</span>
            </div>
          </li>
          <li v-if="players.length === 0" key="empty" class="player-empty">
            <span class="empty-icon">🎭</span>
            <span class="empty-text">等待玩家加入...</span>
          </li>
        </transition-group>

        <div v-if="players.length > 5" class="scroll-hint">
          <span>向下滚动查看更多</span>
          <span class="scroll-arrow">↓</span>
        </div>
      </div>

      <!-- Unprepared players warning -->
      <div v-if="unpreparedPlayers.length > 0 && players.length >= 2" class="unprepared-card">
        <div class="unprepared-header">
          <span class="unprepared-icon">🎯</span>
          <span class="unprepared-title">等待以下玩家准备</span>
        </div>
        <div class="unprepared-list">
          <span
            v-for="player in unpreparedPlayers"
            :key="player.id"
            class="unprepared-badge"
          >
            {{ player.name }}
          </span>
        </div>
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
          :class="{ loading: isStarting }"
          :disabled="!canStart || isStarting"
        >
          <span class="btn-icon">{{ isStarting ? '↻' : '🚀' }}</span>
          <span class="btn-text">{{ isStarting ? '开始中...' : '开始游戏' }}</span>
          <span v-if="!isStarting" class="btn-arrow">→</span>
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
import { socket, connectionState } from '../socket/client.js';
import { showToast } from '../store/toastStore.js';

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;
const playerName = route.query.name || '';
const playerId = ref('');
const room = ref({ players: [] });
const ownerId = ref('');

const passedRoom = route.query.room ? JSON.parse(route.query.room) : null;
if (passedRoom) {
  room.value = passedRoom.room;
  playerId.value = passedRoom.playerId;
  ownerId.value = passedRoom.room.owner;
}

const codeCopied = ref(false);
const linkCopied = ref(false);
const isStarting = ref(false);
const showSharePanel = ref(false);

const shareUrl = computed(() => {
  return `${window.location.origin}/#/waiting/${roomId}?name=${encodeURIComponent(playerName)}`;
});

const isOwner = computed(() => playerId.value === ownerId.value);

const isReady = computed(() => {
  const me = room.value.players.find(p => p.id === playerId.value);
  return me ? me.ready : false;
});

const allReady = computed(() => {
  return room.value.players.length >= 2 && room.value.players.every(p => p.ready);
});

const unpreparedPlayers = computed(() => {
  return room.value.players.filter(p => !p.ready);
});

const canStart = computed(() => {
  return room.value.players.length >= 2 && room.value.players.every(p => p.ready);
});

const players = computed(() => room.value.players || []);

const isRandomMode = computed(() => room.value.selectedStory === null || room.value.selectedStory === undefined);

function getAvatarEmoji(index) {
  const avatars = ['🧑', '👩', '👨', '🧔', '👵', '👴', '🧑‍🎤', '👩‍🎨'];
  return avatars[index % avatars.length];
}

function toggleReady() {
  socket.emit('player-ready', { roomId });
}

function startGame() {
  isStarting.value = true;
  socket.emit('start-game', { roomId });
  setTimeout(() => { isStarting.value = false; }, 5000); // fallback reset
}

function copyRoomCode() {
  navigator.clipboard.writeText(roomId).then(() => {
    codeCopied.value = true;
    setTimeout(() => { codeCopied.value = false; }, 2000);
  }).catch(() => {
    showToast('复制失败，请手动复制房间号', 'error');
  });
}

function copyShareLink() {
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    linkCopied.value = true;
    showToast('链接已复制到剪贴板', 'success');
    setTimeout(() => { linkCopied.value = false; }, 2000);
  }).catch(() => {
    showToast('复制失败，请手动复制', 'error');
  });
}

function shareViaSMS() {
  const text = `来玩画传歪了！加入我的房间一起画：${shareUrl.value}`;
  window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
}

function shareViaQQ() {
  const text = `来玩画传歪了！加入我的房间一起画：${shareUrl.value}`;
  // QQ API requires callback, simplified approach
  window.open(`http://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl.value)}&desc=${encodeURIComponent(text)}`, '_blank');
}

function shareViaWeChat() {
  // Web API can't open WeChat directly, copy link instead
  copyShareLink();
  showToast('链接已复制，发送给朋友即可加入', 'info');
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
  isStarting.value = false;
  router.push({ name: 'play', params: { roomId: rid } });
};

const handleError = ({ message }) => {
  showToast(message, 'error');
  // Don't auto-navigate home - let user retry with their input preserved
};

const handleReconnect = () => {
  showToast('已重新连接', 'success');
  // Re-join the room to sync state
  socket.emit('join-room', { roomId, playerName });
};

// Browser history warning - prevent accidental navigation while in waiting room
function handleBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = '离开将断开与房间的连接。确定要离开吗？';
  return e.returnValue;
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);

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
  socket.on('connect', handleReconnect);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  socket.off('room-joined', handleRoomJoined);
  socket.off('room-update', handleRoomUpdate);
  socket.off('player-joined', handlePlayerJoined);
  socket.off('player-left', handlePlayerLeft);
  socket.off('player-status-changed', handlePlayerStatusChanged);
  socket.off('game-started', handleGameStarted);
  socket.off('error', handleError);
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

/* Intro card */
.intro-card {
  position: relative;
  z-index: 10;
  background: var(--bg-paper);
  border: 4px solid var(--color-accent-purple);
  border-radius: var(--radius-large);
  padding: 20px 24px;
  margin-bottom: 8px;
  text-align: center;
  box-shadow: 0 0 20px rgba(142, 68, 173, 0.15), 6px 6px 0 var(--color-accent-yellow);
  animation: cardFloat 4s ease-in-out infinite;
}

@keyframes cardFloat {
  0%, 100% {
    transform: translateY(0);
    box-shadow: 0 0 20px rgba(142, 68, 173, 0.15), 6px 6px 0 var(--color-accent-yellow);
  }
  50% {
    transform: translateY(-5px);
    box-shadow: 0 0 25px rgba(142, 68, 173, 0.2), 8px 8px 0 var(--color-accent-yellow);
  }
}

.intro-text {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 3px solid var(--color-accent-purple);
  border-radius: var(--radius-medium);
  padding: 10px 20px;
  margin-bottom: 12px;
  color: var(--color-accent-purple);
  font-weight: bold;
  font-size: 1rem;
  font-family: var(--font-body);
}

.intro-icon {
  font-size: 1.3rem;
}

.intro-count {
  color: var(--color-primary);
  font-size: 1.1rem;
  font-weight: 500;
}

/* Connection overlay */
.connection-overlay {
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
  backdrop-filter: blur(2px);
}

.connection-message {
  background: white;
  padding: 24px 36px;
  border-radius: 16px;
  border: 4px solid var(--color-accent-red);
  box-shadow: 6px 6px 0 var(--color-accent-red);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-accent-red);
  min-width: 200px;
}

.connection-message.reconnecting {
  border-color: var(--color-accent-yellow);
  color: var(--color-primary);
}

.connection-icon {
  font-size: 2rem;
}

.connection-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reconnect-progress {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.reconnect-dot {
  width: 8px;
  height: 8px;
  background: var(--color-accent-yellow);
  border-radius: 50%;
  animation: dotBounce 1.4s ease-in-out infinite;
}

.reconnect-dot:nth-child(1) { animation-delay: 0s; }
.reconnect-dot:nth-child(2) { animation-delay: 0.2s; }
.reconnect-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
  40% { transform: scale(1.3); opacity: 1; }
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
  font-size: var(--text-h1);
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
  font-size: var(--text-small);
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
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Share panel */
.share-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: 12px;
  padding: 16px;
  min-width: 280px;
  box-shadow: 5px 5px 0 var(--color-primary);
  z-index: 100;
}

.share-panel-header {
  font-weight: bold;
  font-size: 0.95rem;
  color: var(--color-primary);
  margin-bottom: 12px;
  text-align: center;
  border-bottom: 2px dashed #ddd;
  padding-bottom: 8px;
}

.share-link-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.share-link-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  font-size: 0.8rem;
  font-family: monospace;
  color: #666;
  background: #f8f8f8;
}

.copy-link-btn {
  padding: 8px 16px;
  background: var(--color-accent-purple);
  color: white;
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.copy-link-btn:hover {
  background: var(--color-primary);
}

.copy-link-btn.copied {
  background: #4caf50;
  border-color: #4caf50;
}

.share-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.share-action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: 2px solid var(--color-primary);
  border-radius: 10px;
  font-weight: bold;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.share-action-btn:hover {
  transform: translateY(-2px);
}

.share-action-btn.sms {
  background: #f0f0f0;
  color: #333;
}

.share-action-btn.sms:hover {
  background: #e0e0e0;
}

.share-action-btn.qq {
  background: #12b7f5;
  color: white;
}

.share-action-btn.qq:hover {
  background: #0da0e8;
}

.share-action-btn.wechat {
  background: var(--color-accent-purple);
  color: white;
}

.share-action-btn.wechat:hover {
  background: var(--color-accent-purple);
  opacity: 0.85;
}

.action-icon {
  font-size: 1.3rem;
}

.action-text {
  font-size: 0.7rem;
}

.share-hint {
  text-align: center;
  font-size: 0.75rem;
  color: #888;
}

/* Share panel transition */
.share-panel-enter-active {
  animation: sharePanelIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.share-panel-leave-active {
  animation: sharePanelOut 0.2s ease-out;
}

@keyframes sharePanelIn {
  from {
    opacity: 0;
    transform: translateX(-50%) scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}

@keyframes sharePanelOut {
  to {
    opacity: 0;
    transform: translateX(-50%) scale(0.9) translateY(-10px);
  }
}

/* Random story badge */
.random-story-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
  animation: badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.badge-icon {
  font-size: 1rem;
  animation: shake 0.5s ease-in-out infinite;
}

@keyframes badgePop {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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
  font-size: var(--text-body);
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

.min-players-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--space-2) var(--space-4);
  background: var(--color-info-bg);
  border-top: 1px dashed var(--color-gray-border);
  border-bottom: 1px dashed var(--color-gray-border);
  color: var(--color-gray-dark);
  font-size: var(--text-small);
}

.min-players-hint .hint-icon {
  font-size: 0.9rem;
}

.player-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
  position: relative;
}

.player-list::-webkit-scrollbar {
  width: 8px;
}

.player-list::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.player-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.player-list::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px dashed #ddd;
  animation: itemSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: background-color 0.2s, transform 0.2s;
}

.player-item:hover {
  background-color: #f8f8ff;
  transform: translateX(4px);
}

.player-item:last-child {
  border-bottom: none;
}

.player-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 20px;
  color: #888;
}

.empty-icon {
  font-size: 2rem;
  opacity: 0.6;
}

.empty-text {
  font-size: 0.9rem;
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

/* Scroll hint */
.scroll-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  font-size: 0.8rem;
  color: #888;
  background: linear-gradient(transparent, rgba(255,255,255,0.8));
}

.scroll-arrow {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

/* Unprepared players warning */
.unprepared-card {
  background: white;
  border: 3px solid var(--color-accent-yellow);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 4px 4px 0 var(--color-accent-yellow);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
}

.unprepared-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.unprepared-icon {
  font-size: 1.2rem;
}

.unprepared-title {
  font-size: 0.9rem;
  color: #666;
  font-weight: bold;
}

.unprepared-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.unprepared-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #fff3cd;
  border: 2px solid var(--color-accent-yellow);
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #856404;
  animation: itemSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
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

.start-btn.loading .btn-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
