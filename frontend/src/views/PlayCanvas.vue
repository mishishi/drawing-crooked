<template>
  <div class="play-canvas">
    <!-- Notebook paper background lines -->
    <div class="notebook-bg"></div>

    <!-- Header with spiral binding decoration -->
    <header class="game-header">
      <div class="spiral"></div>
      <div class="header-content">
        <!-- Round info - pencil annotation style -->
        <div class="round-badge">
          <span class="round-label">回合</span>
          <span class="round-num">{{ currentRound }}/{{ totalRounds }}</span>
        </div>
        <!-- Turn order indicator for non-current players -->
        <div v-if="!isMyTurn" class="turn-order-badge">
          <span class="turn-order-icon">📋</span>
          <span class="turn-order-text">第 {{ myPositionInQueue }} 位</span>
          <span class="turn-order-hint">· 还剩 {{ playersAheadInQueue }} 人</span>
        </div>
        <div class="player-count">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          {{ players.length }}人
        </div>
      </div>
    </header>

    <!-- Main game area -->
    <main class="game-main">
      <!-- Time warning banner -->
      <div v-if="isMyTurn && timeLeft <= 5" class="time-warning">
        <span class="warning-icon">⏰</span>
        <span class="warning-text">时间快到了！</span>
      </div>

      <!-- Reconnection banner -->
      <div v-if="connectionState !== 'connected'" class="reconnect-banner">
        <span v-if="connectionState === 'reconnecting'">🔄 重新连接中...</span>
        <span v-else>⚠️ 连接已断开</span>
      </div>

      <!-- Turn indicator banner -->
      <div v-if="!isMyTurn" class="turn-banner waiting">
        <div class="turn-indicator"></div>
        <span class="turn-text">{{ currentPlayerName }} 正在画...</span>
      </div>

      <div v-else class="turn-banner drawing" :class="{ 'just-started': turnJustStarted }">
        <div class="turn-indicator"></div>
        <span class="turn-text">轮到你了！快画吧～</span>
      </div>

      <!-- Mobile turn reminder - extra prominent for mobile users -->
      <div v-if="!isMyTurn && isMobile" class="mobile-turn-reminder">
        <div class="reminder-icon">🎨</div>
        <div class="reminder-text">
          <span class="reminder-title">等待 {{ currentPlayerName }} 画完</span>
          <span class="reminder-subtitle">轮到你时会有提示</span>
        </div>
      </div>

      <!-- Sentence card - speech bubble style -->
      <div class="sentence-card" :class="{ myTurn: isMyTurn }">
        <div class="speech-bubble">
          <span class="bubble-label">
            <template v-if="isMyTurn">
              <span v-if="previousDrawing" class="label-interpret">🎨 画出来</span>
              <span v-else class="label-original">🎯 原句</span>
            </template>
            <template v-else>等待中...</template>
          </span>
          <span class="bubble-text">
            <template v-if="isMyTurn && previousDrawing">
              上一位画的是什么？把它画出来！
            </template>
            <template v-else>
              {{ sentence || '等待中...' }}
            </template>
          </span>
        </div>
        <div class="bubble-tail"></div>
      </div>

      <!-- Timer - sketchy clock style -->
      <div v-if="isMyTurn" class="timer-wrapper">
        <svg class="timer-clock" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" class="clock-face"/>
          <circle cx="50" cy="50" r="40" class="clock-inner"/>
          <!-- Clock hands -->
          <line x1="50" y1="50" x2="50" y2="20" class="clock-hand" :class="{ warning: timeLeft <= 10 }"/>
          <line x1="50" y1="50" x2="50" y2="35" class="clock-hand minute-hand" :class="{ warning: timeLeft <= 5 }"/>
          <circle cx="50" cy="50" r="4" class="clock-center"/>
          <!-- Tick marks -->
          <g class="tick-marks">
            <line v-for="i in 12" :key="i" x1="50" y1="8" x2="50" y2="14"
              :transform="`rotate(${i * 30} 50 50)`" class="tick"/>
          </g>
        </svg>
        <span class="timer-digit" :class="{ warning: timeLeft <= 10 && timeLeft > 5, critical: timeLeft <= 5 }">{{ timeLeft }}</span>
      </div>

      <!-- Interpretation bubble - shows what player is interpreting -->
      <div v-if="isMyTurn && previousDrawing" class="interpretation-bubble">
        <div class="bubble-header">
          <span class="bubble-icon">💭</span>
          <span class="bubble-title">你在画什么？</span>
        </div>
        <div class="bubble-content">
          <div class="prev-drawing-mini">
            <img :src="previousDrawing" alt="Previous drawing" />
          </div>
          <div class="bubble-hint">
            <span class="hint-arrow">👆</span>
            <span>参考上面的画</span>
            <span class="hint-arrow">👆</span>
          </div>
        </div>
      </div>

      <!-- Viewing area for non-current players (real-time view of current player's drawing) -->
      <div v-if="!isMyTurn" class="viewing-canvas-area">
        <div class="viewing-label">
          <span class="viewing-icon">👀</span>
          <span>{{ currentPlayerName }} 正在画...</span>
        </div>
        <div class="viewing-canvas-frame">
          <canvas ref="viewingCanvasRef" class="viewing-canvas"></canvas>
        </div>
      </div>

      <!-- Canvas area for current player -->
      <div v-if="isMyTurn" class="canvas-area">
        <div class="canvas-frame">
          <GameCanvas
            ref="gameCanvasRef"
            :strokeColor="currentColor"
            :strokeWidth="currentSize"
            :isEraser="currentTool === 'eraser'"
            @strokeEnd="handleStrokeEnd"
          />
        </div>
        <div class="canvas-deco deco-left"></div>
        <div class="canvas-deco deco-right"></div>
      </div>

      <!-- Toolbar -->
      <div v-if="isMyTurn" class="toolbar-area">
        <Toolbar
          v-model:tool="currentTool"
          v-model:color="currentColor"
          v-model:size="currentSize"
          :undo-count="undoCount"
          @undo="undoCanvas"
        />
        <div class="canvas-actions">
          <button @click="clearCanvas" class="action-btn clear-btn">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"></path>
            </svg>
            清空
          </button>
          <button @click="confirmSkip" class="action-btn skip-btn">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
            跳过 (-5分)
          </button>
          <button @click="submitDrawing" class="action-btn submit-btn">
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            画完了！
          </button>
        </div>
      </div>
    </main>

    <!-- Decorative doodles -->
    <div class="doodle doodle-1">✏️</div>
    <div class="doodle doodle-2">🎨</div>
    <div class="doodle doodle-3">✨</div>

  </div>

  <!-- Custom Confirm Modal -->
  <ConfirmModal
    ref="confirmModalRef"
    title="跳过回合"
    message="确定要跳过回合吗？将扣除5分！"
    confirmText="确定跳过"
    cancelText="继续画"
    confirmClass="danger"
    icon="⚠️"
  />

  <!-- Submit Confirm Modal -->
  <ConfirmModal
    ref="submitConfirmModalRef"
    title="提交画作"
    message="确定要提交这幅画吗？提交后无法修改。"
    confirmText="确定提交"
    cancelText="继续画"
    confirmClass="primary"
    icon="🎨"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GameCanvas from '../components/GameCanvas.vue';
import Toolbar from '../components/Toolbar.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import { socket, connectionState } from '../socket/client.js';
import { setGameResults, clearGameResults } from '../store/gameStore.js';
import { showToast } from '../store/toastStore.js';

// Audio context for timer beeps (lazy init)
let audioContext = null;

function playBeep(frequency = 800, duration = 100) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    // Silently fail if audio not supported
  }
}

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;

// Core game state
const sentence = ref('');
const isMyTurn = ref(false);
const turnJustStarted = ref(false);
const currentRound = ref(1);
const totalRounds = ref(1);
const currentPlayerName = ref('');
const previousDrawing = ref(null);
const timeLeft = ref(30);
const timerInterval = ref(null);
const timeWarningShown = ref(false);

// Canvas state
const gameCanvasRef = ref(null);
const viewingCanvasRef = ref(null);
const confirmModalRef = ref(null);
const submitConfirmModalRef = ref(null);
const currentTool = ref('pen');
const currentColor = ref('#000000');
const currentSize = ref(8);

// Player state
const players = ref([]);
let myPlayerId = '';
const playerName = route.query.name || localStorage.getItem('playerName') || '';

// Mobile detection
const windowWidth = ref(window.innerWidth);
function handleResize() {
  windowWidth.value = window.innerWidth;
}
onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => window.removeEventListener('resize', handleResize));
const isMobile = computed(() => windowWidth.value < 600);

// Computed
const currentPlayerPosition = computed(() => {
  if (!currentPlayerName.value) return 1;
  const idx = players.value.findIndex(p => p.name === currentPlayerName.value);
  return idx === -1 ? 1 : idx + 1;
});

// User's position in the turn queue
const myPositionInQueue = computed(() => {
  if (!myPlayerId || !currentPlayerName.value) return 1;
  const currentIdx = players.value.findIndex(p => p.name === currentPlayerName.value);
  const myIdx = players.value.findIndex(p => p.id === myPlayerId);
  if (currentIdx === -1 || myIdx === -1) return 1;

  // Calculate how many players ahead of me (not including current)
  let ahead = (myIdx - currentIdx - 1 + players.value.length) % players.value.length;
  return ahead + 2; // +1 for "next is #1", +1 because we're counting from 1
});

const playersAheadInQueue = computed(() => {
  if (!myPlayerId || !currentPlayerName.value) return players.value.length - 1;
  const currentIdx = players.value.findIndex(p => p.name === currentPlayerName.value);
  const myIdx = players.value.findIndex(p => p.id === myPlayerId);
  if (currentIdx === -1 || myIdx === -1) return players.value.length - 1;

  // Count players between current (exclusive) and me (exclusive)
  let ahead = (myIdx - currentIdx - 1 + players.value.length) % players.value.length;
  return ahead;
});

// Undo count from canvas
const undoCount = computed(() => {
  return gameCanvasRef.value?.undoCount ?? 0;
});

// Watch for turn changes to trigger flash effect
watch(isMyTurn, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Just became my turn - trigger flash
    turnJustStarted.value = true;
    setTimeout(() => {
      turnJustStarted.value = false;
    }, 1000);
  }
});

// Timer functions
function startTimer() {
  console.log('[startTimer] starting timer');
  stopTimer();
  timeLeft.value = 30;
  timeWarningShown.value = false;
  timerInterval.value = setInterval(() => {
    console.log('[timer] tick, timeLeft:', timeLeft.value);
    timeLeft.value--;
    if (timeLeft.value === 5) {
      playBeep(800, 150); // Higher beep at 5 seconds
    } else if (timeLeft.value === 3) {
      playBeep(600, 150); // Lower beep at 3 seconds
    } else if (timeLeft.value === 1) {
      playBeep(400, 200); // Even lower at 1 second
    } else if (timeLeft.value === 0) {
      playBeep(300, 500); // Final long beep at 0
    }
    if (timeLeft.value <= 5 && !timeWarningShown.value) {
      // Show strong warning but don't auto-submit yet
      timeWarningShown.value = true;
    }
    if (timeLeft.value <= 0) {
      stopTimer();
      showToast('时间到！自动提交您的画作', 'info');
      if (!gameCanvasRef.value) {
        showToast('画布未就绪，自动提交失败', 'error');
        return;
      }
      const imageData = gameCanvasRef.value.getImageData();
      if (!imageData) {
        showToast('获取画布数据失败，自动提交失败', 'error');
        return;
      }
      doSubmitDrawing(imageData);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval.value) {
    console.log('[stopTimer] clearing interval');
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

// Handle stroke end - broadcast to others
function handleStrokeEnd({ imageData }) {
  socket.emit('draw-stroke', { roomId, imageData });
}

// Submit drawing with confirmation
async function submitDrawing() {
  console.log('[submitDrawing] called, isMyTurn:', isMyTurn.value);
  console.log('[submitDrawing] gameCanvasRef:', gameCanvasRef.value);

  // Validate canvas is ready
  if (!gameCanvasRef.value) {
    showToast('画布未就绪，请稍候', 'error');
    return;
  }

  const imageData = gameCanvasRef.value.getImageData();
  if (!imageData) {
    showToast('获取画布数据失败，请重试', 'error');
    return;
  }

  // Show confirmation modal
  const confirmed = await submitConfirmModalRef.value?.show();
  if (!confirmed) {
    return; // User cancelled
  }

  stopTimer();
  doSubmitDrawing(imageData);
}

function doSubmitDrawing(imageData) {
  console.log('[doSubmitDrawing] emitting submit-drawing, imageData length:', imageData.length, 'roomId:', roomId);
  socket.emit('submit-drawing', { roomId, imageData });
}

function clearCanvas() {
  gameCanvasRef.value?.clearCanvas();
}

function undoCanvas() {
  gameCanvasRef.value?.undo();
}

async function confirmSkip() {
  const confirmed = await confirmModalRef.value?.show();
  if (confirmed) {
    socket.emit('skip-turn', { roomId });
  }
}

// Socket event handlers
function handleYourSentence({ sentence: s }) {
  sentence.value = s;
}

function handleYourTurn({ round, previousDrawing: prevDrawing, currentPlayerName: name, isMyTurn: myTurn, totalRounds: total }) {
  console.log('[your-turn] received:', { round, currentPlayerName: name, isMyTurn: myTurn, totalRounds: total, prevDrawing: !!prevDrawing });
  currentRound.value = round;
  if (total) totalRounds.value = total;
  currentPlayerName.value = name || '';
  previousDrawing.value = prevDrawing || null;

  isMyTurn.value = myTurn;

  if (myTurn) {
    // My turn - clear my canvas (and show prev drawing as reference via interpretation bubble)
    if (gameCanvasRef.value) {
      gameCanvasRef.value.clearCanvas();
    }
    startTimer();
  } else {
    // Not my turn - stop timer, show viewing canvas with prev drawing
    stopTimer();
    // Draw the previous drawing on viewing canvas so everyone can see
    if (prevDrawing && viewingCanvasRef.value) {
      drawToViewingCanvas(prevDrawing);
    }
  }
}

function drawToViewingCanvas(imageData) {
  const canvas = viewingCanvasRef.value;
  if (!canvas || !imageData) return;

  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = imageData;
}

function handleNewRound({ round, totalRounds: total }) {
  currentRound.value = round;
  totalRounds.value = total;
  showToast(`第 ${round} 轮开始！`, 'info');
}

function handleDrawingUpdate({ imageData }) {
  // Update the viewing canvas so everyone can see current player's drawing in real-time
  previousDrawing.value = imageData;
  if (viewingCanvasRef.value && !isMyTurn.value) {
    drawToViewingCanvas(imageData);
  }
}

function handleGameEnded({ roomId: rid, results }) {
  stopTimer();
  if (results) {
    setGameResults(results);
  }
  router.push({ name: 'reveal', params: { roomId: rid } });
}

function handleGameStarted({ roomId: rid }) {
  clearGameResults();
  sentence.value = ''; // Clear any stale sentence
  router.push({ name: 'play', params: { roomId: rid } });
}

function handleRoomJoined({ room: r, playerId: pid, mySentence }) {
  console.log('[room-joined] received:', { status: r.status, hasMySentence: !!mySentence, mySentence, sentencesKeys: Object.keys(r.sentences || {}) });
  myPlayerId = pid;
  players.value = r.players || [];

  // Set sentence immediately from room-joined event, OR from room.sentences directly
  const sentenceFromRoom = r.sentences?.[pid];
  if (mySentence) {
    console.log('[room-joined] setting sentence from mySentence:', mySentence);
    sentence.value = mySentence;
  } else if (sentenceFromRoom) {
    console.log('[room-joined] setting sentence from room.sentences:', sentenceFromRoom);
    sentence.value = sentenceFromRoom;
  } else {
    console.log('[room-joined] no sentence available, will wait for your-sentence');
  }

  if (r.status === 'ended') {
    router.push({ name: 'reveal', params: { roomId: r.roomId } });
  } else if (r.status === 'playing') {
    // Game is in progress - set initial state
    const currentPlayer = r.players[r.currentPlayerIndex];
    currentPlayerName.value = currentPlayer ? currentPlayer.name : '';
    isMyTurn.value = currentPlayer && currentPlayer.id === myPlayerId;
  }
}

function handleRoomUpdate({ room: r }) {
  console.log('[room-update] received:', { status: r.status });
  players.value = r.players || [];

  if (r.status === 'playing') {
    const currentPlayer = r.players[r.currentPlayerIndex];
    currentPlayerName.value = currentPlayer ? currentPlayer.name : '';
    isMyTurn.value = currentPlayer && currentPlayer.id === myPlayerId;
  }
}

function handlePlayerJoined({ player }) {
  if (!players.value.find(p => p.id === player.id)) {
    players.value.push(player);
  }
}

function handlePlayerLeft({ playerId: pid }) {
  players.value = players.value.filter(p => p.id !== pid);
}

function handleTurnSkipped({ skippedPlayerName, newCurrentPlayerName, playerId, playerName, penalty }) {
  if (playerName && penalty !== undefined) {
    // Manual skip with penalty
    showToast(`${playerName} 跳过了回合 (-${penalty}分)`, 'info');
  } else if (skippedPlayerName && newCurrentPlayerName) {
    // Disconnect skip
    showToast(`${skippedPlayerName} 掉线了，轮到 ${newCurrentPlayerName}`, 'info');
  }
}

// Reconnect handler - saved as reference for proper cleanup
function handleReconnect() {
  console.log('[PlayCanvas] reconnected, rejoining room');
  socket.emit('join-room', { roomId, playerName });
}

onMounted(() => {
  // Register socket handlers FIRST
  socket.on('room-joined', handleRoomJoined);
  socket.on('room-update', handleRoomUpdate);
  socket.on('player-joined', handlePlayerJoined);
  socket.on('player-left', handlePlayerLeft);
  socket.on('your-sentence', handleYourSentence);
  socket.on('your-turn', handleYourTurn);
  socket.on('new-round', handleNewRound);
  socket.on('drawing-update', handleDrawingUpdate);
  socket.on('game-ended', handleGameEnded);
  socket.on('game-started', handleGameStarted);
  socket.on('turn-skipped', handleTurnSkipped);
  socket.on('reconnect', handleReconnect);

  // Debug: log socket connection state
  console.log('[PlayCanvas onMounted] socket.connected:', socket.connected, 'socket.id:', socket.id);

  // Connect if not connected and emit join-room when connected
  if (!socket.connected) {
    console.log('[PlayCanvas] socket not connected, waiting for connect...');
    socket.once('connect', () => {
      console.log('[PlayCanvas] socket connected, emitting join-room');
      socket.emit('join-room', { roomId, playerName });
    });
    socket.connect();
  } else {
    console.log('[PlayCanvas] socket already connected, emitting join-room');
    socket.emit('join-room', { roomId, playerName });
  }
});

// Browser history warning - prevent accidental navigation during game
function handleBeforeUnload(e) {
  if (isMyTurn.value || timeLeft.value < 30) {
    e.preventDefault();
    e.returnValue = '游戏进行中，离开将断开连接。确定要离开吗？';
    return e.returnValue;
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  stopTimer();
  window.removeEventListener('beforeunload', handleBeforeUnload);
  socket.off('room-joined', handleRoomJoined);
  socket.off('room-update', handleRoomUpdate);
  socket.off('player-joined', handlePlayerJoined);
  socket.off('player-left', handlePlayerLeft);
  socket.off('your-sentence', handleYourSentence);
  socket.off('your-turn', handleYourTurn);
  socket.off('new-round', handleNewRound);
  socket.off('drawing-update', handleDrawingUpdate);
  socket.off('game-ended', handleGameEnded);
  socket.off('game-started', handleGameStarted);
  socket.off('turn-skipped', handleTurnSkipped);
  socket.off('reconnect', handleReconnect);
});
</script>

<style scoped>
.play-canvas {
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
  background-attachment: local;
}

.game-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  z-index: 10;
}

.spiral {
  width: 40px;
  height: 60px;
  background: repeating-linear-gradient(
    to bottom,
    #666 0px,
    #666 6px,
    transparent 6px,
    transparent 16px
  );
  border-radius: 4px;
  margin-right: 12px;
}

.header-content {
  display: flex;
  gap: 16px;
  align-items: center;
}

.round-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
  background: white;
  padding: 8px 16px;
  border: 2px solid var(--color-primary);
  border-radius: 20px;
  box-shadow: 3px 3px 0 var(--color-primary);
  transform: rotate(-2deg);
}

.round-label {
  font-size: 12px;
  color: #888;
  font-family: var(--font-body);
}

.round-num {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-accent-purple);
  font-family: var(--font-display);
}

.turn-order-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-accent-yellow);
  padding: 6px 12px;
  border: 2px solid var(--color-primary);
  border-radius: 20px;
  box-shadow: 2px 2px 0 var(--color-primary);
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.turn-order-icon {
  font-size: 14px;
}

.turn-order-text {
  font-size: 13px;
  font-weight: bold;
  color: var(--color-primary);
  font-family: var(--font-display);
}

.turn-order-hint {
  font-size: 11px;
  color: #666;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.player-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-primary);
  transform: rotate(1deg);
}

.player-count .icon {
  width: 18px;
  height: 18px;
}

.game-main {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  max-width: 600px;
  margin: 0 auto;
}

.reconnect-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: var(--color-accent-yellow);
  border: 3px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-primary);
  font-weight: bold;
  font-family: var(--font-body);
  color: var(--color-primary);
  animation: bounce 1s infinite;
}

.time-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-accent-red);
  color: white;
  border: 3px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-primary);
  font-weight: bold;
  font-family: var(--font-body);
  animation: timeWarningPulse 1s ease-in-out infinite;
}

.warning-icon {
  font-size: 1.2rem;
}

.warning-text {
  font-size: 0.95rem;
}

.turn-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: 30px;
  box-shadow: 4px 4px 0 var(--color-primary);
  transform: rotate(-1deg);
  animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.turn-banner.waiting {
  background: var(--color-accent-yellow);
}

.turn-banner.drawing {
  background: var(--color-accent-red);
  color: white;
  border-color: var(--color-primary);
  transform: rotate(1deg);
  animation: turnPulse 1.5s ease-in-out infinite;
}

.turn-banner.drawing .turn-text {
  font-size: 1.5rem;
}

.turn-banner.drawing.just-started {
  animation: turnFlash 0.6s ease-out, turnPulse 1.5s ease-in-out 0.6s infinite;
}

@keyframes turnPulse {
  0%, 100% {
    box-shadow: 4px 4px 0 var(--color-primary);
    transform: rotate(1deg) scale(1);
  }
  50% {
    box-shadow: 6px 6px 0 var(--color-primary), 0 0 20px var(--color-accent-red);
    transform: rotate(1deg) scale(1.02);
  }
}

@keyframes turnFlash {
  0% {
    opacity: 0;
    transform: rotate(1deg) scale(0.8);
  }
  50% {
    opacity: 1;
    transform: rotate(1deg) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: rotate(1deg) scale(1);
  }
}

.turn-indicator {
  width: 12px;
  height: 12px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: bounce 1s infinite;
}

.turn-banner.drawing .turn-indicator {
  background: white;
}

.turn-text {
  font-size: 16px;
  font-weight: bold;
  font-family: var(--font-body);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) rotate(-1deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(-1deg);
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.sentence-card {
  position: relative;
  width: 100%;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

.speech-bubble {
  background: white;
  padding: 24px 32px;
  border: 3px solid var(--color-primary);
  border-radius: 20px;
  box-shadow: 5px 5px 0 var(--color-primary);
  text-align: center;
  position: relative;
}

.sentence-card.myTurn .speech-bubble {
  background: linear-gradient(135deg, #fff8f8 0%, #f8f0ff 50%, #fff0f8 100%);
  border-color: var(--color-accent-purple);
  border-width: 4px;
  box-shadow: 5px 5px 0 var(--color-accent-purple), 0 0 15px var(--color-accent-purple);
}

.bubble-label {
  display: block;
  font-size: 12px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.label-interpret {
  color: var(--color-accent-purple);
  font-weight: bold;
}

.label-original {
  color: var(--color-accent-red);
  font-weight: bold;
}

.bubble-text {
  font-size: clamp(1rem, 4vw, 1.8rem);
  font-weight: bold;
  color: var(--color-accent-purple);
  font-family: var(--font-display);
  line-height: 1.3;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.bubble-tail {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-top: 20px solid var(--color-primary);
}

.bubble-tail::after {
  content: '';
  position: absolute;
  top: -23px;
  left: -13px;
  width: 0;
  height: 0;
  border-left: 13px solid transparent;
  border-right: 13px solid transparent;
  border-top: 18px solid white;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.timer-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}

.timer-clock {
  width: 100%;
  height: 100%;
  filter: drop-shadow(3px 3px 0 var(--color-primary));
}

.clock-face {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 3;
}

.clock-inner {
  fill: white;
  stroke: var(--color-primary);
  stroke-width: 2;
}

.clock-hand {
  stroke: var(--color-primary);
  stroke-width: 3;
  stroke-linecap: round;
  transform-origin: 50px 50px;
  transition: transform 0.3s ease, stroke 0.3s ease;
}

.clock-hand.warning {
  stroke: #f39c12; /* Orange at 10s */
}

.clock-hand.minute-hand {
  stroke: var(--color-accent-purple);
  stroke-width: 2;
}

.clock-hand.minute-hand.warning {
  stroke: var(--color-accent-red); /* Red at 5s */
}

.clock-center {
  fill: var(--color-primary);
}

.tick {
  stroke: #ccc;
  stroke-width: 2;
}

.timer-digit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  font-weight: bold;
  font-family: var(--font-display);
  color: var(--color-primary);
  transition: color 0.3s, transform 0.3s;
}

.timer-digit.warning {
  color: #f39c12; /* Orange for 10s warning - softer than red */
  animation: pulse 1s ease-in-out infinite;
}

.timer-digit.critical {
  color: var(--color-accent-red);
  animation: shake 0.3s infinite; /* Faster shake at 5s */
}

@keyframes shake {
  0%, 100% { transform: translate(-50%, -50%) rotate(0); }
  25% { transform: translate(-50%, -50%) rotate(-3deg); }
  75% { transform: translate(-50%, -50%) rotate(3deg); }
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

@keyframes timeWarningPulse {
  0%, 100% { transform: scale(1); box-shadow: 4px 4px 0 var(--color-primary); }
  50% { transform: scale(1.02); box-shadow: 6px 6px 0 var(--color-primary), 0 0 15px rgba(231, 76, 60, 0.3); }
}

.viewing-canvas-area {
  width: 100%;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.viewing-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  color: var(--color-primary);
  background: white;
  padding: 6px 16px;
  border: 2px solid var(--color-primary);
  border-radius: 20px;
  box-shadow: 3px 3px 0 var(--color-primary);
}

.viewing-icon {
  font-size: 16px;
}

.viewing-canvas-frame {
  width: 100%;
  max-width: 500px;
  border: 4px solid var(--color-primary);
  border-radius: 8px;
  box-shadow: 6px 6px 0 var(--color-primary);
  overflow: hidden;
  background: white;
}

.viewing-image {
  width: 100%;
  height: auto;
  display: block;
}

.viewing-canvas {
  width: 100%;
  height: auto;
  display: block;
  background: white;
}

.canvas-area {
  position: relative;
  width: 100%;
  animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}

.canvas-frame {
  width: 100%;
  border: 4px solid var(--color-primary);
  border-radius: 8px;
  box-shadow: 6px 6px 0 var(--color-primary);
  overflow: hidden;
  background: white;
}

.canvas-deco {
  position: absolute;
  width: 30px;
  height: 60px;
  background: var(--color-accent-yellow);
  border: 2px solid var(--color-primary);
  border-radius: 4px;
}

.deco-left {
  left: -20px;
  top: 50%;
  transform: translateY(-50%) rotate(-10deg);
}

.deco-right {
  right: -20px;
  top: 50%;
  transform: translateY(-50%) rotate(10deg);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toolbar-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}

.canvas-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  font-size: 1.2rem;
  font-weight: bold;
  font-family: var(--font-display);
  border: 4px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 5px 5px 0 var(--color-primary);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.action-btn:hover {
  transform: translate(-3px, -3px);
  box-shadow: 7px 7px 0 var(--color-primary);
}

.action-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-primary);
}

.submit-btn {
  background: var(--color-accent-red);
  color: white;
}

.clear-btn {
  background: white;
  color: var(--color-primary);
}

.skip-btn {
  background: var(--color-accent-yellow);
  color: var(--color-primary);
}

.icon {
  width: 20px;
  height: 20px;
}

.check-icon {
  width: 24px;
  height: 24px;
  stroke: white;
}

.doodle {
  position: fixed;
  font-size: 32px;
  opacity: 0.6;
  pointer-events: none;
  z-index: 1;
}

.doodle-1 {
  top: 15%;
  right: 8%;
  animation: float 3s ease-in-out infinite;
}

.doodle-2 {
  bottom: 20%;
  left: 5%;
  animation: float 4s ease-in-out infinite 0.5s;
}

.doodle-3 {
  top: 60%;
  right: 5%;
  animation: float 3.5s ease-in-out infinite 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(5deg); }
}

.turn-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.turn-content {
  text-align: center;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.turn-emoji {
  font-size: 5rem;
  display: block;
  animation: bounce 0.6s ease-in-out infinite;
}

.turn-text {
  font-family: var(--font-display);
  font-size: 2.5rem;
  color: var(--color-accent-purple);
  margin: 16px 0;
  transform: rotate(-2deg);
  text-shadow: 3px 3px 0 var(--color-accent-yellow);
}

.turn-subtext {
  font-size: 1.2rem;
  color: #666;
  margin: 0;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); }
}

.turn-flash-enter-active {
  animation: flashIn 0.4s ease-out;
}

.turn-flash-leave-active {
  animation: flashOut 0.4s ease-in;
}

@keyframes flashIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes flashOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.1); }
}

.interpretation-bubble {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(135deg, #fff 0%, #fff8e7 100%);
  border: 3px solid var(--color-accent-yellow);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 5px 5px 0 var(--color-accent-yellow);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px dashed var(--color-accent-yellow);
}

.bubble-icon {
  font-size: 1.5rem;
}

.bubble-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--color-accent-purple);
}

.bubble-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.prev-drawing-mini {
  width: 120px;
  height: 90px;
  border: 3px solid var(--color-primary);
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.prev-drawing-mini img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bubble-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #666;
}

.hint-arrow {
  animation: bounceUp 1s ease-in-out infinite;
}

@keyframes bounceUp {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .sentence-card,
  .timer-wrapper,
  .interpretation-bubble,
  .hint-arrow {
    animation: none;
  }

  .turn-indicator {
    animation: none;
  }

  .turn-flash-enter-active,
  .turn-flash-leave-active {
    animation: none;
  }
}

@media (max-width: 600px) {
  .play-canvas {
    padding: 12px;
  }

  .timer-wrapper {
    width: 90px;
    height: 90px;
  }

  .polaroid-image img {
    max-width: 200px;
  }

  .doodle {
    display: none;
  }

  .mobile-turn-reminder {
    display: flex;
  }

  .turn-banner .turn-text {
    font-size: 14px;
  }
}

/* Mobile turn reminder - hidden by default, shown on mobile */
.mobile-turn-reminder {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--color-accent-purple) 0%, #8e44ad 100%);
  color: white;
  border: 3px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-primary);
  animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.reminder-icon {
  font-size: 2rem;
  animation: bounce 1s ease-in-out infinite;
}

.reminder-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reminder-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: bold;
}

.reminder-subtitle {
  font-size: 0.85rem;
  opacity: 0.9;
}
</style>
