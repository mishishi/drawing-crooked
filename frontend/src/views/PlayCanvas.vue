<template>
  <div class="play-canvas">
    <GameCanvas />
    <Toolbar />
  </div>
</template>

<script setup>
import GameCanvas from '../components/GameCanvas.vue';
import Toolbar from '../components/Toolbar.vue';
</script>

<style scoped>
.play-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}
</style>
