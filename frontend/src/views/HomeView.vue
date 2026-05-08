<template>
  <div class="home">
    <h1>画传歪了</h1>
    <div class="actions">
      <input v-model="playerName" placeholder="你的名字" class="hand-drawn" />
      <button @click="createRoom" class="hand-drawn-btn">创建房间</button>
      <div class="divider">或者</div>
      <input v-model="roomId" placeholder="房间号" class="hand-drawn" />
      <button @click="joinRoom" class="hand-drawn-btn">加入房间</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const playerName = ref('');
const roomId = ref('');

function createRoom() {
  // TODO: implement
}

function joinRoom() {
  // TODO: implement
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 20px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

input {
  padding: 10px;
  font-size: 16px;
  width: 200px;
}

.divider {
  margin: 8px 0;
  color: #666;
}
</style>
