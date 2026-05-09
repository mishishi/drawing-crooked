<template>
  <div id="app">
    <div class="connection-indicator" :class="connectionState">
      <span class="dot"></span>
      <span v-if="connectionState === 'reconnecting'" class="text">重新连接中...</span>
      <span v-else-if="connectionState === 'disconnected'" class="text">连接已断开</span>
    </div>
    <Toast :message="toast.message" :type="toast.type" :visible="toast.visible" />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Toast from './components/Toast.vue';
import { connectionState, setToastFn } from './socket/client.js';
import { toast, showToast } from './store/toastStore.js';

// 连接 socket 错误到 toast 系统
onMounted(() => {
  setToastFn(showToast);
});
</script>

<style scoped>
.connection-indicator {
  position: fixed;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: rgba(0, 0, 0, 0.6);
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  color: white;
  z-index: 9999;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.connection-indicator:hover {
  opacity: 1;
}

.connection-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connection-indicator.connected .dot {
  background: #22c55e;
}

.connection-indicator.disconnected .dot {
  background: #ef4444;
}

.connection-indicator.reconnecting .dot {
  background: #eab308;
  animation: bounce 1s infinite;
}

.connection-indicator .text {
  white-space: nowrap;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
