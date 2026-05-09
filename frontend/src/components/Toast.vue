<template>
  <transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      <span class="toast-icon">{{ icon }}</span>
      <span class="toast-message">{{ message }}</span>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' }, // 'info' | 'error' | 'success'
  duration: { type: Number, default: null }
});

const defaultDurations = {
  error: 5000,
  success: 2500,
  info: 3000
};

const actualDuration = computed(() => {
  return props.duration ?? defaultDurations[props.type] ?? 3000;
});

const visible = ref(false);
let timeout = null;

watch(() => props.message, (newMsg) => {
  if (newMsg) {
    show();
  }
});

function show() {
  visible.value = true;
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    visible.value = false;
  }, actualDuration.value);
}

const icon = computed(() => {
  switch (props.type) {
    case 'error': return '⚠️';
    case 'success': return '✅';
    default: return 'ℹ️';
  }
});
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--color-white);
  border: 3px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 5px 5px 0 var(--color-primary);
  z-index: 9999;
  font-weight: bold;
  font-family: var(--font-body);
}

.toast.error {
  border-color: var(--color-accent-red);
  background: var(--color-error-bg);
}

.toast.error .toast-message {
  color: var(--color-error);
}

.toast.success {
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-message {
  color: var(--color-primary);
  font-size: 0.95rem;
}

.toast-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  animation: toastOut 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-30px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
  }
}
</style>
