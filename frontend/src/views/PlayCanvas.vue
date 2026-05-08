<template>
  <div class="play-canvas">
    <!-- Show sentence when it's player's turn -->
    <div v-if="isMyTurn && sentence" class="sentence-display hand-drawn">
      <span class="label">请画出:</span>
      <span class="sentence-text">{{ sentence }}</span>
    </div>

    <!-- Timer -->
    <div v-if="isMyTurn" class="timer" :class="{ warning: timeLeft <= 10 }">
      {{ timeLeft }}秒
    </div>

    <!-- Drawing status -->
    <div v-if="!isMyTurn" class="waiting-status hand-drawn">
      <p>等待 {{ currentPlayerName }} 画画...</p>
    </div>

    <!-- Previous drawing display -->
    <div v-if="!isMyTurn && previousDrawing" class="previous-drawing hand-drawn">
      <p class="label">上一幅画:</p>
      <img :src="previousDrawing" alt="Previous drawing" />
    </div>

    <!-- Canvas (only show when it's player's turn) -->
    <div v-if="isMyTurn" class="canvas-wrapper hand-drawn">
      <GameCanvas
        ref="gameCanvasRef"
        :strokeColor="currentColor"
        :strokeWidth="currentSize"
        :isEraser="currentTool === 'eraser'"
        @strokeEnd="handleStrokeEnd"
      />
    </div>

    <!-- Toolbar (only show when it's player's turn) -->
    <div v-if="isMyTurn" class="toolbar-wrapper">
      <Toolbar
        v-model:tool="currentTool"
        v-model:color="currentColor"
        v-model:size="currentSize"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GameCanvas from '../components/GameCanvas.vue';
import Toolbar from '../components/Toolbar.vue';
import { socket } from '../socket/client.js';
import { setGameResults } from '../store/gameStore.js';

const route = useRoute();
const router = useRouter();
const roomId = route.params.roomId;

const sentence = ref('');
const isMyTurn = ref(false);
const currentRound = ref(1);
const totalRounds = ref(1);
const currentPlayerName = ref('');
const previousDrawing = ref(null);
const timeLeft = ref(30);
const timerInterval = ref(null);

const gameCanvasRef = ref(null);
const currentTool = ref('pen');
const currentColor = ref('#000000');
const currentSize = ref(8);

let playerId = '';
const playerName = route.query.name || localStorage.getItem('playerName') || '';

// Computed
const isOwner = computed(() => playerId === room.value?.owner);
const room = ref({ players: [] });

// Timer functions
function startTimer() {
  timeLeft.value = 30;
  clearInterval(timerInterval.value);
  timerInterval.value = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      submitDrawing();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval.value);
}

// Handle stroke end - broadcast to others
function handleStrokeEnd({ imageData }) {
  socket.emit('draw-stroke', { roomId, imageData });
}

// Submit drawing
function submitDrawing() {
  stopTimer();
  const imageData = gameCanvasRef.value?.getImageData() || '';
  socket.emit('submit-drawing', { roomId, imageData });
}

// Socket event handlers
function handleYourSentence({ sentence: s }) {
  sentence.value = s;
}

function handleYourTurn({ round, previousDrawing: prevDrawing, currentPlayerName: name }) {
  isMyTurn.value = true;
  currentRound.value = round;
  currentPlayerName.value = name || '';
  previousDrawing.value = prevDrawing || null;

  // Draw previous drawing to canvas if available
  if (prevDrawing) {
    gameCanvasRef.value?.setImageData(prevDrawing);
  } else {
    // Clear canvas for new drawing
    gameCanvasRef.value?.clearCanvas();
  }
  startTimer();
}

function handleNewRound({ round, totalRounds: total }) {
  currentRound.value = round;
  totalRounds.value = total;
}

function handleDrawingUpdate({ imageData }) {
  previousDrawing.value = imageData;
}

function handleGameEnded({ roomId: rid, results }) {
  stopTimer();
  if (results) {
    setGameResults(results);
  }
  router.push({ name: 'reveal', params: { roomId: rid } });
}

function handleGameStarted({ roomId: rid }) {
  // Navigate to play canvas
  router.push({ name: 'play', params: { roomId: rid } });
}

function handleRoomJoined({ room: r, playerId: pid }) {
  playerId = pid;
  room.value = r;
  // Store playerName in localStorage for reconnect
  if (playerName) {
    localStorage.setItem('playerName', playerName);
  }
}

onMounted(() => {
  // Reconnect to room
  socket.emit('join-room', { roomId, playerName });

  socket.on('room-joined', handleRoomJoined);
  socket.on('your-sentence', handleYourSentence);
  socket.on('your-turn', handleYourTurn);
  socket.on('new-round', handleNewRound);
  socket.on('drawing-update', handleDrawingUpdate);
  socket.on('game-ended', handleGameEnded);
  socket.on('game-started', handleGameStarted);
});

onUnmounted(() => {
  stopTimer();
  socket.off('room-joined', handleRoomJoined);
  socket.off('your-sentence', handleYourSentence);
  socket.off('your-turn', handleYourTurn);
  socket.off('new-round', handleNewRound);
  socket.off('drawing-update', handleDrawingUpdate);
  socket.off('game-ended', handleGameEnded);
  socket.off('game-started', handleGameStarted);
});
</script>

<style scoped>
.play-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  gap: 16px;
}

.sentence-display {
  background: #fff;
  padding: 16px 32px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  text-align: center;
}

.sentence-display .label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.sentence-display .sentence-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent-purple);
}

.timer {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-primary);
  padding: 8px 24px;
  background: var(--color-accent-yellow);
  border-radius: 8px;
  border: 3px solid var(--color-primary);
}

.timer.warning {
  color: var(--color-accent-red);
  background: #ffe0e0;
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.waiting-status {
  background: #fff;
  padding: 24px 48px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  text-align: center;
}

.previous-drawing {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
}

.previous-drawing .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  display: block;
}

.previous-drawing img {
  max-width: 400px;
  max-height: 300px;
  border-radius: 8px;
  border: 2px solid #ddd;
}

.canvas-wrapper {
  width: 100%;
  max-width: 800px;
  border-radius: 12px;
  overflow: hidden;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
}

.toolbar-wrapper {
  width: 100%;
  max-width: 800px;
}
</style>
