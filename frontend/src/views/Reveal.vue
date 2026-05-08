<template>
  <div class="reveal">
    <h1 class="title">揭晓时刻</h1>

    <!-- Round navigation -->
    <nav v-if="resultsLoaded && roundCount > 1" class="round-nav">
      <button
        v-for="r in roundCount"
        :key="r"
        class="round-nav-btn"
        :class="{ active: currentRoundNav === r }"
        @click="scrollToRound(r)"
      >
        第{{ r }}轮
      </button>
    </nav>

    <div v-if="resultsLoaded" class="timeline" ref="timelineRef">
      <div
        v-for="round in roundGroups"
        :key="round.round"
        :id="`round-${round.round}`"
        class="round-section"
      >
        <div class="round-header">
          <span class="round-title">第 {{ round.round }} 轮</span>
          <span class="round-count">{{ round.drawings.length }}人参与</span>
        </div>

        <!-- Transformation chain visualization -->
        <div class="chain-container">
          <template v-for="(item, index) in round.drawings" :key="index">
            <!-- Player card -->
            <div class="chain-item" :class="{ 'is-mine': item.isMine }">
              <div class="chain-connector top" v-if="index === 0">
                <span class="original-label">原始句子</span>
              </div>
              <div class="chain-connector top" v-else>
                <span class="flow-arrow">⬇️</span>
              </div>

              <div class="item-header">
                <div class="player-badge" :class="{ 'mine-badge': item.isMine }">
                  <span class="player-emoji">{{ getPlayerEmoji(index) }}</span>
                  {{ item.playerName }}
                </div>
                <div class="order-num">#{{ index + 1 }}</div>
              </div>

              <!-- Input: What this player saw -->
              <div class="input-section">
                <div class="input-label">
                  <span class="label-icon">👀</span>
                  <span class="label-text">看到</span>
                </div>
                <div class="input-box">
                  {{ item.sentence || '无' }}
                </div>
              </div>

              <!-- Drawing -->
              <div class="drawing-card">
                <img :src="item.imageData" alt="Drawing" class="drawing-image" />
              </div>

              <!-- Output: What this player produced -->
              <div class="output-section" v-if="item.output">
                <div class="output-label">
                  <span class="label-icon">✍️</span>
                  <span class="label-text">写出</span>
                </div>
                <div class="output-box">
                  {{ item.output }}
                </div>
              </div>

              <div class="chain-connector bottom" v-if="index < round.drawings.length - 1">
                <span class="to-text">传给 {{ round.drawings[index + 1]?.playerName }}</span>
              </div>
            </div>

            <!-- Connector arrow between players -->
            <div v-if="index < round.drawings.length - 1" class="chain-arrow">
              <span class="arrow-icon">➡️</span>
            </div>
          </template>
        </div>
        <div v-if="canScrollChain" class="scroll-hint">
          <span>👆</span>
          <span class="hint-text">左右滑动查看更多</span>
        </div>
      </div>
    </div>

    <div v-else-if="errorMessage" class="error-state hand-drawn">
      <p class="error-icon">😕</p>
      <p class="error-text">{{ errorMessage }}</p>
      <button @click="retryLoading" class="hand-drawn-btn primary retry-btn">
        🔄 重试
      </button>
    </div>
    <div v-else class="loading hand-drawn">
      <p>加载中...</p>
    </div>

    <div class="actions">
      <button @click="playAgain" class="hand-drawn-btn primary">
        再来一局
      </button>
      <button @click="goHome" class="hand-drawn-btn secondary">
        返回首页
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { socket } from '../socket/client.js';
import { gameResults } from '../store/gameStore.js';

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;

const resultsLoaded = ref(false);
const playerName = ref('');
const myPlayerId = ref('');
const timelineRef = ref(null);
const currentRoundNav = ref(1);
let isScrollingFromNav = false;
let scrollTimeout = null;
const errorMessage = ref('');
let loadingTimeout = null;

function playAgain() {
  socket.emit('restart-game', { roomId });
}

function handleGameRestarted() {
  const storedName = localStorage.getItem('playerName') || '';
  router.push({ name: 'waiting', params: { roomId }, query: { name: storedName } });
}

function goHome() {
  socket.emit('leave-room', { roomId });
  router.push({ name: 'home' });
}

function scrollToRound(round) {
  // Prevent rapid successive scroll triggers
  if (scrollTimeout) return;

  currentRoundNav.value = round;
  const el = document.getElementById(`round-${round}`);
  if (el) {
    isScrollingFromNav = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Clear the flag after scrolling completes
    scrollTimeout = setTimeout(() => {
      isScrollingFromNav = false;
      scrollTimeout = null;
    }, 600);
  }
}

// Group drawings by round
const roundGroups = computed(() => {
  const drawings = gameResults.drawings || [];
  const groups = {};

  for (const drawing of drawings) {
    const round = drawing.round || 1;
    if (!groups[round]) {
      groups[round] = { round, drawings: [] };
    }
    groups[round].drawings.push({
      ...drawing,
      isMine: drawing.from === myPlayerId.value || drawing.to === myPlayerId.value
    });
  }

  return Object.values(groups).sort((a, b) => a.round - b.round);
});

const roundCount = computed(() => roundGroups.value.length);

const canScrollChain = computed(() => {
  const container = timelineRef.value?.querySelector('.chain-container');
  return container ? container.scrollWidth > container.clientWidth : false;
});

function getPlayerEmoji(index) {
  const emojis = ['🎨', '🖌️', '🖊️', '✏️', '🖌️', '🎭'];
  return emojis[index % emojis.length];
}

function handleRoomJoined({ room, playerId }) {
  if (loadingTimeout) clearTimeout(loadingTimeout);
  if (room && room.status === 'ended' && room.results) {
    gameResults.drawings = room.results.drawings || [];
    gameResults.sentences = room.results.sentences || {};
  }
  if (playerId) {
    myPlayerId.value = playerId;
  }
  errorMessage.value = '';
  resultsLoaded.value = true;
}

function handleError({ message }) {
  errorMessage.value = message || '发生未知错误';
  resultsLoaded.value = true; // Stop loading spinner
}

function retryLoading() {
  errorMessage.value = '';
  resultsLoaded.value = false;
  if (loadingTimeout) clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => {
    if (!resultsLoaded.value) {
      errorMessage.value = '加载超时，请检查网络连接';
      resultsLoaded.value = true;
    }
  }, 5000);
  socket.emit('join-room', { roomId, playerName: playerName.value });
}

onMounted(() => {
  playerName.value = localStorage.getItem('playerName') || '';
  myPlayerId.value = localStorage.getItem('myPlayerId') || '';

  if (gameResults.drawings && gameResults.drawings.length > 0) {
    resultsLoaded.value = true;
  } else {
    socket.emit('join-room', { roomId, playerName: playerName.value });
    loadingTimeout = setTimeout(() => {
      if (!resultsLoaded.value) {
        errorMessage.value = '加载超时，请检查网络连接';
        resultsLoaded.value = true;
      }
    }, 5000);
  }

  socket.on('room-joined', handleRoomJoined);
  socket.on('game-restarted', handleGameRestarted);
  socket.on('error', handleError);
});

onUnmounted(() => {
  if (loadingTimeout) clearTimeout(loadingTimeout);
  socket.off('room-joined', handleRoomJoined);
  socket.off('game-restarted', handleGameRestarted);
  socket.off('error', handleError);
});
</script>

<style scoped>
.reveal {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
  gap: 20px;
}

.title {
  font-family: var(--font-display);
  font-size: 3rem;
  color: var(--color-accent-purple);
  transform: rotate(-2deg);
  text-shadow: 3px 3px 0 var(--color-accent-yellow);
  margin: 0;
}

/* Round navigation */
.round-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 12px 20px;
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: 30px;
  box-shadow: 4px 4px 0 var(--color-primary);
}

.round-nav-btn {
  padding: 8px 16px;
  border: 2px solid #ddd;
  border-radius: 20px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  font-family: var(--font-body);
  color: var(--color-primary);
  transition: all 0.2s;
}

.round-nav-btn:hover {
  background: var(--color-accent-yellow);
  border-color: var(--color-primary);
}

.round-nav-btn.active {
  background: var(--color-accent-purple);
  color: white;
  border-color: var(--color-accent-purple);
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
  max-width: 600px;
  max-height: 65vh;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-paper);
  border-radius: 16px;
  border: 3px solid var(--color-primary);
}

.round-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.round-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 2px dashed #ccc;
}

.round-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--color-accent-purple);
  background: var(--color-accent-yellow);
  padding: 4px 16px;
  border-radius: 20px;
  border: 2px solid var(--color-primary);
  transform: rotate(-1deg);
}

.round-count {
  font-size: 12px;
  color: #888;
}

/* Chain visualization */
.chain-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  overflow-x: auto;
  padding: 10px 0;
  position: relative;
}

.chain-container::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 60px;
  background: linear-gradient(90deg, transparent, var(--bg-paper) 80%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.chain-container.can-scroll::after {
  opacity: 1;
}

.scroll-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  font-size: 0.85rem;
  color: #888;
}

.hint-text {
  font-weight: bold;
}

.chain-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  max-width: 220px;
  padding: 16px 12px;
  background: white;
  border-radius: 16px;
  border: 3px solid #ddd;
  transition: all 0.3s;
  position: relative;
}

.chain-item.is-mine {
  border-color: var(--color-accent-purple);
  box-shadow: 5px 5px 0 var(--color-accent-purple);
  background: linear-gradient(135deg, #fff 0%, #f8f5ff 100%);
}

.chain-arrow {
  display: flex;
  align-items: center;
  padding-top: 60px;
  flex-shrink: 0;
}

.arrow-icon {
  font-size: 2rem;
  animation: pulseArrow 1.5s ease-in-out infinite;
}

@keyframes pulseArrow {
  0%, 100% { transform: translateX(0); opacity: 0.6; }
  50% { transform: translateX(5px); opacity: 1; }
}

.chain-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 28px;
}

.chain-connector.top {
  margin-bottom: 4px;
}

.chain-connector.bottom {
  margin-top: 8px;
}

.original-label {
  font-size: 10px;
  font-weight: bold;
  color: white;
  background: var(--color-accent-red);
  padding: 3px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.flow-arrow {
  font-size: 16px;
  opacity: 0.5;
}

.to-text {
  font-size: 10px;
  color: var(--color-accent-purple);
  background: #f0f0ff;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px dashed var(--color-accent-purple);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.player-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: bold;
  color: var(--color-primary);
  padding: 4px 10px;
  border-radius: 12px;
  border: 2px solid var(--color-primary);
}

.mine-badge {
  background: var(--color-accent-yellow);
  color: var(--color-accent-purple);
  border-color: var(--color-accent-purple);
}

.player-emoji {
  font-size: 14px;
}

.order-num {
  font-size: 11px;
  color: #888;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 6px;
}

.input-section, .output-section {
  width: 100%;
  text-align: center;
}

.input-label, .output-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 4px;
}

.input-label .label-icon {
  font-size: 12px;
}

.output-label .label-icon {
  font-size: 12px;
}

.label-text {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-box, .output-box {
  background: #f8f8ff;
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid #ddd;
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--color-primary);
  font-family: var(--font-display);
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.output-box {
  background: #fff8f0;
  border-color: var(--color-accent-orange);
  color: var(--color-accent-red);
}

.drawing-card {
  background: white;
  padding: 8px;
  border-radius: 10px;
  border: 3px solid var(--color-primary);
  box-shadow: 3px 3px 0 var(--color-primary);
  width: 100%;
}

.drawing-image {
  width: 100%;
  max-height: 150px;
  object-fit: contain;
  border-radius: 6px;
}

.sentence-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 4px;
}

.label-icon {
  font-size: 14px;
}

.label-text {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.sentence-box .sentence {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-accent-purple);
  font-family: var(--font-display);
}

.to-badge {
  font-size: 12px;
  color: var(--color-accent-purple);
  background: white;
  padding: 4px 10px;
  border-radius: 10px;
  border: 2px dashed var(--color-accent-purple);
}

.loading {
  background: white;
  padding: 32px 48px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 48px;
  background: white;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
}

.error-icon {
  font-size: 3rem;
  margin: 0;
}

.error-text {
  color: var(--color-accent-red);
  font-weight: bold;
  margin: 0;
}

.retry-btn {
  margin-top: 8px;
}

.actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

.hand-drawn-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  font-size: 1.1rem;
  font-weight: bold;
  font-family: var(--font-display);
  border: 4px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-primary);
  cursor: pointer;
  transition: all 0.15s;
}

.hand-drawn-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--color-primary);
}

.hand-drawn-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-primary);
}

.primary {
  background: var(--color-accent-purple);
  color: white;
}

.secondary {
  background: var(--color-primary);
  color: white;
}

@media (max-width: 600px) {
  .timeline {
    padding: 12px;
  }

  .round-nav {
    padding: 8px 12px;
  }

  .round-nav-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
