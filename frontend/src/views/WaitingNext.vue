<template>
  <div class="waiting-next">
    <div class="animation-container">
      <div class="pencil">✏️</div>
      <div class="thought-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>

    <h2 class="title">等待下一个人画画...</h2>

    <div v-if="currentPlayerName" class="current-turn">
      <span class="label">当前轮到:</span>
      <span class="player-name">{{ currentPlayerName }}</span>
    </div>

    <div class="round-info hand-drawn">
      <span>第 {{ currentRound }} 轮</span>
      <span class="separator">/</span>
      <span>共 {{ totalRounds }} 轮</span>
    </div>

    <div class="players-progress">
      <div
        v-for="(player, index) in players"
        :key="player.id"
        class="player-dot"
        :class="{
          active: index === currentPlayerIndex,
          completed: index < currentPlayerIndex
        }"
      >
        <span class="avatar">{{ player.name.charAt(0) }}</span>
        <span class="name">{{ player.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { socket } from '../socket/client.js';

const route = useRoute();
const roomId = route.params.roomId;

const currentPlayerName = ref('');
const currentRound = ref(1);
const totalRounds = ref(1);
const currentPlayerIndex = ref(0);
const players = ref([]);

function handleYourTurn({ round }) {
  currentRound.value = round;
}

function handleNewRound({ round, totalRounds: total }) {
  currentRound.value = round;
  totalRounds.value = total;
}

function handleYourSentence({ sentence }) {
  // Player received their sentence, redirect to play canvas
  // This shouldn't happen in WaitingNext, but just in case
}

function handleRoomJoined({ room }) {
  players.value = room.players || [];
  currentRound.value = room.currentRound || 1;
  totalRounds.value = room.totalRounds || 1;
}

onMounted(() => {
  socket.emit('join-room', { roomId, playerName: '' });

  socket.on('room-joined', handleRoomJoined);
  socket.on('your-turn', handleYourTurn);
  socket.on('new-round', handleNewRound);
  socket.on('your-sentence', handleYourSentence);
});

onUnmounted(() => {
  socket.off('room-joined', handleRoomJoined);
  socket.off('your-turn', handleYourTurn);
  socket.off('new-round', handleNewRound);
  socket.off('your-sentence', handleYourSentence);
});
</script>

<style scoped>
.waiting-next {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.animation-container {
  position: relative;
  width: 120px;
  height: 100px;
}

.pencil {
  font-size: 48px;
  animation: draw 1s ease-in-out infinite;
  transform-origin: bottom right;
}

@keyframes draw {
  0%, 100% {
    transform: rotate(0deg) translateY(0);
  }
  25% {
    transform: rotate(-10deg) translateY(-5px);
  }
  75% {
    transform: rotate(10deg) translateY(-5px);
  }
}

.thought-bubble {
  position: absolute;
  top: -10px;
  right: -20px;
  display: flex;
  gap: 6px;
  background: white;
  padding: 8px 12px;
  border-radius: 20px;
  border: 2px solid var(--color-primary);
  box-shadow: 2px 2px 0 var(--color-primary);
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--color-accent-purple);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
}

.title {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--color-primary);
  text-align: center;
}

.current-turn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 16px 32px;
  border-radius: 12px;
  border: 3px solid var(--color-accent-purple);
  box-shadow: 4px 4px 0 var(--color-accent-purple);
}

.current-turn .label {
  font-size: 14px;
  color: #666;
}

.current-turn .player-name {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent-purple);
}

.round-info {
  display: flex;
  gap: 8px;
  background: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: 2px solid var(--color-primary);
  font-weight: bold;
  color: var(--color-primary);
}

.separator {
  color: #ccc;
}

.players-progress {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.player-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.player-dot.active {
  opacity: 1;
  transform: scale(1.1);
}

.player-dot.completed {
  opacity: 0.8;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-accent-yellow);
  border: 3px solid var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-primary);
}

.player-dot.active .avatar {
  background: var(--color-accent-purple);
  color: white;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(155, 89, 182, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(155, 89, 182, 0); }
}

.name {
  font-size: 12px;
  color: #666;
}

.player-dot.active .name {
  color: var(--color-accent-purple);
  font-weight: bold;
}
</style>
