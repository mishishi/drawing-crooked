<template>
  <div class="game-canvas hand-drawn">
    <canvas ref="canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const canvas = ref(null);
const isDrawing = ref(false);

function startDrawing(e) {
  isDrawing.value = true;
}

function draw(e) {
  if (!isDrawing.value) return;
  const ctx = canvas.value.getContext('2d');
  // TODO: implement drawing
}

function stopDrawing() {
  isDrawing.value = false;
}

onMounted(() => {
  if (canvas.value) {
    canvas.value.width = 800;
    canvas.value.height = 600;
  }
});
</script>

<style scoped>
.game-canvas {
  width: 800px;
  height: 600px;
  background: #fff;
}

canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
</style>
