<template>
  <transition name="toast">
    <div v-if="visible" class="toast" :class="type" role="alert" aria-live="polite">
      <span class="toast-icon">
        <!-- Error icon -->
        <svg v-if="type === 'error'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <!-- Success icon -->
        <svg v-else-if="type === 'success'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <!-- Info icon -->
        <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </span>
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
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toast-icon svg {
  display: block;
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

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    animation: none;
  }
}
</style>
