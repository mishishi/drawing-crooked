<template>
  <div class="reveal">
    <h1 class="title">揭晓时刻</h1>

    <!-- Leaderboard -->
    <div v-if="resultsLoaded && leaderboard.length > 1" class="leaderboard-card">
      <div class="leaderboard-header">
        <span class="leaderboard-icon">🏆</span>
        <span class="leaderboard-title">积分榜</span>
      </div>
      <div class="leaderboard-list">
        <div
          v-for="(entry, index) in leaderboard"
          :key="entry.id"
          class="leaderboard-item"
          :class="{
            'is-me': entry.id === myPlayerId,
            'top-3': index < 3
          }"
        >
          <div class="rank-badge" :class="`rank-${index + 1}`">
            <span v-if="index === 0">🥇</span>
            <span v-else-if="index === 1">🥈</span>
            <span v-else-if="index === 2">🥉</span>
            <span v-else class="rank-num">{{ index + 1 }}</span>
          </div>
          <span class="player-name">{{ entry.name }}</span>
          <span class="player-score">{{ entry.score }}分</span>
        </div>
      </div>
    </div>

    <!-- My score badge -->
    <div v-if="resultsLoaded && myScore > 0" class="score-badge">{{ myScore }}分</div>

    <!-- Round navigation -->
    <!-- Desktop: Button pills -->
    <nav v-if="!isMobile && resultsLoaded && roundCount > 1" class="round-nav">
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

    <!-- Mobile: Dropdown select -->
    <select v-else-if="resultsLoaded && roundCount > 1" class="round-dropdown" v-model="currentRoundNav" @change="scrollToRound(currentRoundNav)">
      <option v-for="r in roundCount" :key="r" :value="r">
        第{{ r }}轮
      </option>
    </select>

    <!-- ChainViewer for simplified chain visualization -->
    <div v-if="resultsLoaded" class="chain-viewer-section">
      <ChainViewer
        v-for="round in roundGroups"
        :key="`chain-${round.round}`"
        :chain="round.drawings"
      />
    </div>

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
        <div class="chain-container" :class="{ 'can-scroll': canScrollChain }">
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
              <div class="drawing-card" @click="openLightbox(item.imageData)">
                <img :src="item.imageData" alt="Drawing" class="drawing-image" />
                <div class="zoom-hint">🔍 点击放大</div>
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

    <!-- Image lightbox for zoom view -->
    <div v-if="lightboxVisible" class="lightbox" @click="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox">×</button>
      <img :src="lightboxImage" alt="放大查看" class="lightbox-image" @click.stop />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { socket } from '../socket/client.js';
import { gameResults } from '../store/gameStore.js';
import ChainViewer from '../components/ChainViewer.vue';

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;

const resultsLoaded = ref(false);
const playerName = ref('');
const myPlayerId = ref('');
const timelineRef = ref(null);
const currentRoundNav = ref(1);
const isMobile = computed(() => window.innerWidth < 480);
let isScrollingFromNav = false;
let scrollTimeout = null;
const errorMessage = ref('');
let loadingTimeout = null;

// Lightbox state
const lightboxVisible = ref(false);
const lightboxImage = ref('');

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

function openLightbox(imageData) {
  lightboxImage.value = imageData;
  lightboxVisible.value = true;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxVisible.value = false;
  lightboxImage.value = '';
  document.body.style.overflow = '';
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

const myScore = computed(() => {
  return gameResults.playerScores[myPlayerId.value] || 0;
});

// Leaderboard: extract player names from drawings and combine with scores
const leaderboard = computed(() => {
  const scores = gameResults.playerScores || {};
  const drawings = gameResults.drawings || [];

  // Extract unique players from drawings (each drawing has playerName and from/to)
  const playerMap = new Map();
  drawings.forEach(d => {
    if (d.from && d.playerName && !playerMap.has(d.from)) {
      playerMap.set(d.from, d.playerName);
    }
    if (d.to && d.toName && !playerMap.has(d.to)) {
      playerMap.set(d.to, d.toName);
    }
  });

  const entries = Object.entries(scores).map(([id, score]) => ({
    id,
    name: playerMap.get(id) || '未知玩家',
    score
  }));
  return entries.sort((a, b) => b.score - a.score);
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
    gameResults.playerScores = room.results.playerScores || {};
    gameResults.roundScoreData = room.results.roundScoreData || [];
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

.score-badge {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  color: var(--color-accent-yellow);
  background: var(--color-accent-purple);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  border: 3px solid var(--color-primary);
  box-shadow: 3px 3px 0 var(--color-primary);
}

/* Leaderboard */
.leaderboard-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: var(--radius-large);
  box-shadow: 5px 5px 0 var(--color-primary);
  overflow: hidden;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

.leaderboard-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #ffd700 0%, #ffb347 50%, #ffd700 100%);
  border-bottom: 3px solid var(--color-primary);
}

.leaderboard-icon {
  font-size: 1.5rem;
}

.leaderboard-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-primary);
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: 250px;
  overflow-y: auto;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8f8ff;
  border-radius: 10px;
  transition: all 0.2s;
}

.leaderboard-item.is-me {
  background: linear-gradient(135deg, #f0f0ff 0%, #e8e0ff 100%);
  border: 2px solid var(--color-accent-purple);
}

.leaderboard-item.top-3 {
  background: linear-gradient(135deg, #fffef0 0%, #fff8e0 100%);
}

.leaderboard-item.top-3.is-me {
  background: linear-gradient(135deg, #f0f0ff 0%, #ffe0ff 100%);
  border: 2px solid var(--color-accent-purple);
}

.rank-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%);
  box-shadow: 2px 2px 0 #b8860b;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%);
  box-shadow: 2px 2px 0 #808080;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #b8860b 100%);
  box-shadow: 2px 2px 0 #8b4513;
}

.rank-num {
  font-size: 0.9rem;
  font-weight: bold;
  color: #666;
}

.player-name {
  flex: 1;
  font-weight: bold;
  color: var(--color-primary);
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaderboard-item.is-me .player-name {
  color: var(--color-accent-purple);
}

.player-score {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-accent-red);
  background: white;
  padding: 4px 10px;
  border-radius: 12px;
  border: 2px solid var(--color-accent-red);
}

.chain-viewer-section {
  width: 100%;
  max-width: 800px;
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: var(--radius-large);
  box-shadow: 4px 4px 0 var(--color-primary);
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

.round-dropdown {
  padding: 10px 16px;
  font-size: 1rem;
  font-family: var(--font-body);
  font-weight: bold;
  border: 3px solid var(--color-primary);
  border-radius: 30px;
  background: white;
  color: var(--color-primary);
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--color-primary);
  appearance: none;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.round-dropdown:focus {
  outline: none;
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
  cursor: zoom-in;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.drawing-card:hover {
  transform: scale(1.02);
  box-shadow: 5px 5px 0 var(--color-primary);
}

.zoom-hint {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 10px;
  color: #888;
  background: rgba(255,255,255,0.8);
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.drawing-card:hover .zoom-hint {
  opacity: 1;
}

.drawing-image {
  width: 100%;
  max-height: 150px;
  object-fit: contain;
  border-radius: 6px;
}

/* Lightbox */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border: none;
  background: white;
  border-radius: 50%;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 3px 3px 0 var(--color-primary);
  transition: transform 0.1s;
}

.lightbox-close:hover {
  transform: scale(1.1);
}

.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 0 40px rgba(255,255,255,0.2);
  animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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
