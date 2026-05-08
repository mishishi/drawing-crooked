<template>
  <div class="home">
    <h1 class="title">画传歪了</h1>
    <p class="subtitle">和朋友一起玩画图传话游戏</p>
    <div class="actions">
      <input v-model="playerName" placeholder="你的名字" class="hand-drawn" />
      <button @click="createRoom" class="hand-drawn-btn primary">创建房间</button>
      <div class="divider">或者</div>
      <input v-model="roomId" placeholder="房间号" class="hand-drawn" />
      <button @click="joinRoom" class="hand-drawn-btn secondary">加入房间</button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { socket } from '../socket/client.js';

const router = useRouter();
const playerName = ref('');
const roomId = ref('');
const error = ref('');

socket.on('room-joined', ({ room, playerId }) => {
  router.push({ name: 'waiting', params: { roomId: room.roomId }, query: { name: playerName.value } });
});

socket.on('error', ({ message }) => {
  error.value = message;
});

function createRoom() {
  if (!playerName.value.trim()) {
    error.value = '请输入你的名字';
    return;
  }
  error.value = '';
  socket.connect();
  socket.emit('create-room', { playerName: playerName.value.trim() });
}

function joinRoom() {
  if (!playerName.value.trim()) {
    error.value = '请输入你的名字';
    return;
  }
  if (!roomId.value.trim()) {
    error.value = '请输入房间号';
    return;
  }
  error.value = '';
  socket.connect();
  socket.emit('join-room', { roomId: roomId.value.trim().toUpperCase(), playerName: playerName.value.trim() });
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 24px;
}

.title {
  font-family: var(--font-display);
  font-size: 4rem;
  color: var(--color-accent-red);
  transform: rotate(-3deg);
  text-shadow: 3px 3px 0 var(--color-accent-yellow);
}

.subtitle {
  font-size: 1.2rem;
  color: var(--color-primary);
  opacity: 0.7;
  margin-top: -12px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  background: white;
  padding: 32px;
  border-radius: 16px;
  border: 3px solid var(--color-primary);
  box-shadow: 6px 6px 0 var(--color-primary);
}

input {
  padding: 12px 16px;
  font-size: 18px;
  width: 240px;
  border: 3px solid var(--color-primary);
  border-radius: 8px;
  box-shadow: 3px 3px 0 var(--color-primary);
  outline: none;
}

input:focus {
  box-shadow: 4px 4px 0 var(--color-accent-purple);
}

.divider {
  font-size: 14px;
  color: #999;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 60px;
  height: 2px;
  background: #ddd;
}

.divider::before {
  right: 100%;
  margin-right: 12px;
}

.divider::after {
  left: 100%;
  margin-left: 12px;
}

.primary {
  background: var(--color-accent-red);
  color: white;
}

.secondary {
  background: var(--color-accent-purple);
  color: white;
}

.error {
  color: var(--color-accent-red);
  font-size: 14px;
}
</style>
