<template>
  <div class="reveal">
    <h1 class="title">揭晓时刻</h1>

    <div v-if="resultsLoaded" class="timeline">
      <div
        v-for="(item, index) in timelineItems"
        :key="index"
        class="timeline-item"
      >
        <div class="player-badge">
          {{ item.playerName }} 的画作
        </div>
        <div class="drawing-card hand-drawn">
          <img :src="item.imageData" alt="Drawing" class="drawing-image" />
        </div>
        <div class="sentence-box hand-drawn">
          <span class="label">句子:</span>
          <span class="sentence">{{ item.sentence }}</span>
        </div>
      </div>
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

// Build timeline items from drawings and sentences
const timelineItems = computed(() => {
  const items = [];
  const drawings = gameResults.drawings || [];
  const sentences = gameResults.sentences || {};

  for (const drawing of drawings) {
    items.push({
      playerId: drawing.from,
      playerName: drawing.playerName || '未知玩家',
      imageData: drawing.imageData,
      round: drawing.round,
      sentence: sentences[drawing.from] || '无句子'
    });
  }

  return items;
});

function playAgain() {
  socket.emit('leave-room', { roomId });
  // Redirect to waiting room to restart
  const storedName = localStorage.getItem('playerName') || '';
  router.push({ name: 'waiting', params: { roomId }, query: { name: storedName } });
}

function goHome() {
  socket.emit('leave-room', { roomId });
  router.push({ name: 'home' });
}

// Listen for room-joined to get updated room status
function handleRoomJoined({ room }) {
  if (room.status === 'ended' && room.results) {
    // Restore results from room data on reconnect
    gameResults.drawings = room.results.drawings || [];
    gameResults.sentences = room.results.sentences || {};
  }
  resultsLoaded.value = true;
}

onMounted(() => {
  playerName.value = localStorage.getItem('playerName') || '';

  // If we have results, show them
  if (gameResults.drawings && gameResults.drawings.length > 0) {
    resultsLoaded.value = true;
  } else {
    // Try to rejoin room to get results (if game ended while we were away)
    socket.emit('join-room', { roomId, playerName: playerName.value });
  }

  socket.on('room-joined', handleRoomJoined);
});

onUnmounted(() => {
  socket.off('room-joined', handleRoomJoined);
});
</script>

<style scoped>
.reveal {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
  gap: 24px;
}

.title {
  font-family: var(--font-display);
  font-size: 3rem;
  color: var(--color-accent-purple);
  transform: rotate(-2deg);
  text-shadow: 3px 3px 0 var(--color-accent-yellow);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-paper);
  border-radius: 12px;
  border: 3px solid var(--color-primary);
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.player-badge {
  font-size: 14px;
  font-weight: bold;
  color: var(--color-accent-purple);
  background: var(--color-accent-yellow);
  padding: 4px 12px;
  border-radius: 12px;
  border: 2px solid var(--color-primary);
}

.drawing-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  width: 100%;
}

.drawing-image {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

.sentence-box {
  background: white;
  padding: 12px 24px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  text-align: center;
}

.sentence-box .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.sentence-box .sentence {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-primary);
}

.loading {
  background: white;
  padding: 32px 48px;
  border-radius: 12px;
  border: 3px solid var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
}

.actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.primary {
  background: var(--color-accent-purple);
  color: white;
}

.secondary {
  background: var(--color-primary);
  color: white;
}
</style>
