<template>
  <div class="toolbar hand-drawn">
    <!-- Tool Selection -->
    <div class="tool-group">
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'pen' }"
        @click="$emit('update:tool', 'pen')"
        :title="isMobile ? '画笔' : undefined"
        :aria-label="isMobile ? '画笔' : undefined"
      >
        <svg v-if="!isMobile" class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
        <svg v-else class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
        <span v-if="!isMobile">画笔<span v-if="currentTool === 'pen'" class="active-indicator"> ✓</span></span>
      </button>
      <button
        class="tool-btn eraser-btn"
        :class="{ active: currentTool === 'eraser' }"
        @click="$emit('update:tool', 'eraser')"
        :title="isMobile ? '橡皮擦' : undefined"
        :aria-label="isMobile ? '橡皮擦' : undefined"
      >
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
          <path d="M22 21H7"/>
          <path d="m5 11 9 9"/>
        </svg>
        <span v-if="!isMobile">橡皮<span v-if="currentTool === 'eraser'" class="active-indicator"> ✓</span></span>
      </button>
      <button
        class="tool-btn undo-btn"
        @click="$emit('undo')"
        :title="isMobile ? undefined : (undoCount === 0 ? '暂无可撤销的笔画' : '撤销')"
        :aria-label="isMobile ? '撤销' : undefined"
        :disabled="undoCount === 0"
        :class="{ disabled: undoCount === 0 }"
      >
        <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7v6h6"/>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
        </svg>
        <span>撤销</span>
      </button>
    </div>

    <!-- Size Selection - hidden on mobile -->
    <div v-if="!isMobile" class="tool-group">
      <button
        class="size-btn"
        :class="{ active: currentSize === 3 }"
        @click="$emit('update:size', 3)"
        title="小"
      >
        <span class="size-dot small"></span>
      </button>
      <button
        class="size-btn"
        :class="{ active: currentSize === 8 }"
        @click="$emit('update:size', 8)"
        title="中"
      >
        <span class="size-dot medium"></span>
      </button>
      <button
        class="size-btn"
        :class="{ active: currentSize === 16 }"
        @click="$emit('update:size', 16)"
        title="大"
      >
        <span class="size-dot large"></span>
      </button>
    </div>

    <!-- Mobile compact sizes -->
    <div v-if="isMobile" class="tool-group size-compact">
      <button
        v-for="size in [3, 8, 16]"
        :key="size"
        class="size-compact-btn"
        :class="{ active: currentSize === size }"
        @click="$emit('update:size', size)"
      >
        <span class="size-dot" :class="size === 3 ? 'small' : size === 8 ? 'medium' : 'large'"></span>
      </button>
    </div>

    <!-- Eraser Size Indicator -->
    <div v-if="currentTool === 'eraser'" class="eraser-size-hint">
      <span>橡皮尺寸: {{ currentSize === 3 ? '小' : currentSize === 8 ? '中' : '大' }}</span>
    </div>

    <!-- Color Selection -->
    <div class="tool-group colors" :class="{ 'colors-compact': isMobile }">
      <button
        v-for="color in (isMobile ? colors.slice(0, 6) : colors)"
        :key="color.value"
        class="color-btn"
        :class="{ active: currentColor === color.value }"
        :style="{ backgroundColor: color.value }"
        :title="color.name"
        @click="$emit('update:color', color.value)"
      >
        <span v-if="currentColor === color.value" class="color-check">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const windowWidth = ref(window.innerWidth);

function handleResize() {
  windowWidth.value = window.innerWidth;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const isMobile = computed(() => windowWidth.value < 600);

defineProps({
  currentTool: {
    type: String,
    default: 'pen',
    validator: (v) => ['pen', 'eraser'].includes(v)
  },
  currentColor: {
    type: String,
    default: '#000000'
  },
  currentSize: {
    type: Number,
    default: 8,
    validator: (v) => [3, 8, 16].includes(v)
  },
  undoCount: {
    type: Number,
    default: 0
  }
});

defineEmits(['update:tool', 'update:color', 'update:size', 'undo']);

const colors = [
  { name: '黑色', value: '#000000' },
  { name: '红色', value: '#e74c3c' },
  { name: '橙色', value: '#e67e22' },
  { name: '黄色', value: '#f1c40f' },
  { name: '绿色', value: '#27ae60' },
  { name: '蓝色', value: '#3498db' },
  { name: '紫色', value: '#9b59b6' },
  { name: '棕色', value: '#8B4513' },
  { name: '粉色', value: '#e91e63' },
  { name: '灰色', value: '#607d8b' }
];
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 18px;
  margin-top: 10px;
  background: var(--bg-paper);
  border: 3px solid var(--color-primary);
  border-radius: var(--radius-medium);
  box-shadow: 4px 4px 0 var(--color-primary);
  justify-content: center;
  align-items: center;
  transform: rotate(-1deg);
}

.tool-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.tool-group.colors {
  gap: 5px;
}

.active-indicator {
  font-weight: bold;
}

.tool-btn {
  padding: 8px 14px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-small);
  background: var(--color-white);
  cursor: pointer;
  font-size: var(--text-caption);
  font-weight: bold;
  font-family: var(--font-body);
  transition: all 0.2s ease;
  color: var(--color-primary);
  box-shadow: 2px 2px 0 var(--color-primary);
}

.tool-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-primary);
}

.tool-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-primary);
}

.tool-btn.active {
  background: var(--color-accent-purple);
  color: var(--color-white);
  border-color: var(--color-accent-purple);
  box-shadow: 2px 2px 0 var(--color-accent-purple);
}

.eraser-btn.active {
  background: var(--color-gray-light);
  color: var(--color-gray-dark);
  border-color: var(--color-gray-mid);
  box-shadow: 2px 2px 0 var(--color-gray-mid);
}

.size-btn {
  width: 38px;
  height: 38px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-small);
  background: var(--color-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 2px 2px 0 var(--color-primary);
}

.size-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-primary);
}

.size-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-primary);
}

.size-btn.active {
  background: var(--color-accent-yellow);
  border-color: var(--color-primary);
}

.size-dot {
  border-radius: var(--radius-full);
  background: var(--color-primary);
}

.size-dot.small {
  width: 6px;
  height: 6px;
}

.size-dot.medium {
  width: 12px;
  height: 12px;
}

.size-dot.large {
  width: 20px;
  height: 20px;
}

.color-btn {
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 2px 2px 0 var(--color-primary);
}

.color-btn:hover {
  transform: translate(-2px, -2px) scale(1.1);
  box-shadow: 3px 3px 0 var(--color-primary);
}

.color-btn.active {
  border-color: var(--color-accent-purple);
  border-width: 3px;
  box-shadow: 2px 2px 0 var(--color-accent-purple);
  transform: scale(1.15);
}

.eraser-size-hint {
  font-size: var(--text-small);
  color: var(--color-gray-dark);
  background: var(--color-gray-light);
  padding: 4px 10px;
  border-radius: var(--radius-small);
  border: 2px solid var(--color-gray-border);
  font-weight: bold;
}

/* Mobile compact styles */
.icon-only {
  font-size: 1.2rem;
}

.size-compact {
  gap: 4px;
}

.size-compact-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-small);
  background: var(--color-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 2px 2px 0 var(--color-primary);
}

.size-compact-btn.active {
  background: var(--color-accent-yellow);
  border-color: var(--color-primary);
}

.colors-compact {
  gap: 4px;
}

.colors-compact .color-btn {
  width: 36px;
  height: 36px;
  box-shadow: 2px 2px 0 var(--color-primary);
}

.color-check {
  color: var(--color-white);
  font-size: 10px;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.tool-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 400px) {
  .toolbar {
    padding: 10px 12px;
    gap: 8px;
  }

  .tool-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .tool-btn .tool-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
