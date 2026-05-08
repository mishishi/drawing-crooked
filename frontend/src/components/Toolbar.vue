<template>
  <div class="toolbar hand-drawn">
    <!-- Tool Selection -->
    <div class="tool-group">
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'pen' }"
        @click="$emit('update:tool', 'pen')"
        title="画笔"
      >
        画笔
      </button>
      <button
        class="tool-btn"
        :class="{ active: currentTool === 'eraser' }"
        @click="$emit('update:tool', 'eraser')"
        title="橡皮擦"
      >
        橡皮
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

defineEmits(['update:tool', 'update:color', 'update:size']);

const colors = [
  { name: '黑色', value: '#000000' },
  { name: '白色', value: '#ffffff' },
  { name: '红色', value: '#e74c3c' },
  { name: '橙色', value: '#e67e22' },
  { name: '黄色', value: '#f1c40f' },
  { name: '绿色', value: '#27ae60' },
  { name: '蓝色', value: '#3498db' },
  { name: '紫色', value: '#9b59b6' }
];
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  margin-top: 10px;
  background: #fff;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
}

.tool-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.tool-group.colors {
  gap: 4px;
}

.tool-btn {
  padding: 8px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  color: #333;
}

.tool-btn:hover {
  border-color: #aaa;
  background: #f5f5f5;
}

.tool-btn.active {
  border-color: #3498db;
  background: #3498db;
  color: #fff;
}

.size-btn {
  width: 36px;
  height: 36px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.size-btn:hover {
  border-color: #aaa;
  background: #f5f5f5;
}

.size-btn.active {
  border-color: #3498db;
  background: #e8f4fc;
}

.size-dot {
  border-radius: 50%;
  background: #333;
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
  width: 32px;
  height: 32px;
  border: 2px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.color-btn:hover {
  transform: scale(1.1);
  border-color: #aaa;
}

.color-btn.active {
  border-color: #3498db;
  border-width: 3px;
  box-shadow: 0 0 0 2px #3498db;
}
</style>
