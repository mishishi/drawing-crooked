<template>
  <div class="toolbar hand-drawn">
    <!-- Tool Selection -->
    <div class="tool-group">
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'pen' }"
        @click="$emit('update:tool', 'pen')"
        title="画笔"
        :aria-pressed="currentTool === 'pen'"
      >
        画笔<span v-if="currentTool === 'pen'" class="active-indicator"> ✓</span>
      </button>
      <button
        class="tool-btn eraser-btn"
        :class="{ active: currentTool === 'eraser' }"
        @click="$emit('update:tool', 'eraser')"
        title="橡皮擦"
        :aria-pressed="currentTool === 'eraser'"
      >
        🧹 橡皮<span v-if="currentTool === 'eraser'" class="active-indicator"> ✓</span>
      </button>
      <button
        class="tool-btn undo-btn"
        @click="$emit('undo')"
        title="撤销"
      >
        ↩️
      </button>
    </div>

    <!-- Size Selection -->
    <div class="tool-group">
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

    <!-- Eraser Size Indicator -->
    <div v-if="currentTool === 'eraser'" class="eraser-size-hint">
      <span>橡皮尺寸: {{ currentSize === 3 ? '小' : currentSize === 8 ? '中' : '大' }}</span>
    </div>

    <!-- Color Selection -->
    <div class="tool-group colors">
      <button
        v-for="color in colors"
        :key="color.value"
        class="color-btn"
        :class="{ active: currentColor === color.value }"
        :style="{ backgroundColor: color.value }"
        :title="color.name"
        @click="$emit('update:color', color.value)"
      ></button>
    </div>
  </div>
</template>

<script setup>
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
  border-radius: 16px;
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
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
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
  color: #fff;
  border-color: var(--color-accent-purple);
  box-shadow: 2px 2px 0 var(--color-accent-purple);
}

.eraser-btn.active {
  background: #f5f5f5;
  color: #666;
  border-color: #999;
  box-shadow: 2px 2px 0 #999;
}

.size-btn {
  width: 38px;
  height: 38px;
  border: 2px solid var(--color-primary);
  border-radius: 10px;
  background: #fff;
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
  border-radius: 50%;
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
  width: 26px;
  height: 26px;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
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
  font-size: 0.75rem;
  color: #666;
  background: #f0f0f0;
  padding: 4px 10px;
  border-radius: 8px;
  border: 2px solid #ddd;
  font-weight: bold;
}
</style>
