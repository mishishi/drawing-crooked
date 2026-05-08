<template>
  <div class="game-canvas hand-drawn" ref="containerRef">
    <canvas
      ref="canvasRef"
      @mousedown="startDraw"
      @mousemove="draw"
      @mouseup="endDraw"
      @mouseleave="endDraw"
      @touchstart.prevent="startDraw"
      @touchmove.prevent="draw"
      @touchend.prevent="endDraw"
      @touchcancel.prevent="endDraw"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { showToast } from '../store/toastStore.js';

const props = defineProps({
  width: { type: Number, default: 800 },
  height: { type: Number, default: 600 },
  strokeColor: { type: String, default: '#000000' },
  strokeWidth: { type: Number, default: 8 },
  isEraser: { type: Boolean, default: false },
  backgroundColor: { type: String, default: '#ffffff' }
});

const emit = defineEmits(['draw', 'strokeStart', 'strokeEnd']);

const containerRef = ref(null);
const canvasRef = ref(null);
const isDrawing = ref(false);
const ctx = ref(null);

// Stroke history for undo
const MAX_HISTORY = 50;
const strokeHistory = ref([]);
const undoCount = computed(() => strokeHistory.value.length);

function getPos(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  const scaleX = canvasRef.value.width / rect.width;
  const scaleY = canvasRef.value.height / rect.height;

  if (e.touches && e.touches.length > 0) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function startDraw(e) {
  if (!ctx.value) return;
  isDrawing.value = true;
  ctx.value.beginPath();
  ctx.value.moveTo(getPos(e).x, getPos(e).y);
  emit('strokeStart');
}

function draw(e) {
  if (!isDrawing.value || !ctx.value) return;
  ctx.value.lineTo(getPos(e).x, getPos(e).y);
  ctx.value.stroke();
}

function endDraw(e) {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  if (ctx.value) {
    ctx.value.closePath();
  }
  // Save stroke to history
  if (strokeHistory.value.length >= MAX_HISTORY) {
    strokeHistory.value.shift();
  }
  strokeHistory.value.push(canvasRef.value.toDataURL());
  emit('strokeEnd', { imageData: canvasRef.value.toDataURL() });
}

function setupCanvas() {
  if (!canvasRef.value || !containerRef.value) return;

  const container = containerRef.value;
  const canvas = canvasRef.value;

  // Set canvas resolution
  canvas.width = props.width;
  canvas.height = props.height;

  ctx.value = canvas.getContext('2d');
  ctx.value.lineCap = 'round';
  ctx.value.lineJoin = 'round';

  // Initialize canvas with background color
  ctx.value.fillStyle = props.backgroundColor;
  ctx.value.fillRect(0, 0, canvas.width, canvas.height);

  // Apply current stroke settings
  updateStrokeStyle();
}

function updateStrokeStyle() {
  if (!ctx.value) return;

  if (props.isEraser) {
    ctx.value.globalCompositeOperation = 'destination-out';
    ctx.value.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.value.globalCompositeOperation = 'source-over';
    ctx.value.strokeStyle = props.strokeColor;
  }
  ctx.value.lineWidth = props.strokeWidth;
}

// Watch for prop changes
watch(() => props.strokeColor, updateStrokeStyle);
watch(() => props.strokeWidth, updateStrokeStyle);
watch(() => props.isEraser, updateStrokeStyle);
watch(() => props.backgroundColor, () => {
  if (canvasRef.value) {
    clearCanvas();
  }
});

// Public methods
function clearCanvas() {
  if (!ctx.value || !canvasRef.value) return;
  ctx.value.fillStyle = props.backgroundColor;
  ctx.value.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  strokeHistory.value = [];
}

function undo() {
  if (strokeHistory.value.length === 0) {
    showToast('没有可撤销的操作', 'warning');
    return;
  }
  if (strokeHistory.value.length <= 1) {
    clearCanvas();
    strokeHistory.value = [];
    return;
  }
  strokeHistory.value.pop();
  const img = new Image();
  img.onload = () => {
    ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    ctx.value.drawImage(img, 0, 0);
  };
  img.src = strokeHistory.value[strokeHistory.value.length - 1];
}

function getImageData() {
  if (!canvasRef.value) return null;
  return canvasRef.value.toDataURL();
}

function setImageData(dataUrl) {
  if (!ctx.value || !canvasRef.value) return;
  const img = new Image();
  img.onload = () => {
    if (!ctx.value || !canvasRef.value) return;
    ctx.value.fillStyle = props.backgroundColor;
    ctx.value.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    ctx.value.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

// Expose methods to parent
defineExpose({
  clearCanvas,
  undo,
  getImageData,
  setImageData
});

onMounted(() => {
  setupCanvas();
});
</script>

<style scoped>
.game-canvas {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 4 / 3;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  touch-action: none;
}

canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  display: block;
}
</style>
