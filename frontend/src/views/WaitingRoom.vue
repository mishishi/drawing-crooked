<template>
  <div class="waiting-room">
    <h2>等待室</h2>
    <p>房间号: {{ roomId }}</p>
    <p>玩家: {{ playerName }}</p>
    <p>等待其他玩家加入...</p>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const roomId = route.params.roomId;
const playerName = route.query.name || '';
</script>

<style scoped>
.waiting-room {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
}
</style>
