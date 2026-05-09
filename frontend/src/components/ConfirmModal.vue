<template>
  <transition name="modal">
    <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
      <div class="modal hand-drawn" :class="size">
        <div class="modal-icon">{{ icon }}</div>
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" @click="handleCancel">
            {{ cancelText }}
          </button>
          <button class="modal-btn modal-btn-confirm" :class="confirmClass" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要继续吗？' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  confirmClass: { type: String, default: 'danger' }, // 'danger' | 'primary'
  icon: { type: String, default: '⚠️' },
  size: { type: String, default: 'small' } // 'small' | 'medium' | 'large'
});

const emit = defineEmits(['confirm', 'cancel']);

const visible = ref(false);
let resolvePromise = null;

function show() {
  return new Promise((resolve) => {
    visible.value = true;
    resolvePromise = resolve;
  });
}

function hide() {
  visible.value = false;
  resolvePromise = null;
}

function handleConfirm() {
  hide();
  if (resolvePromise) resolvePromise(true);
  emit('confirm');
}

function handleCancel() {
  hide();
  if (resolvePromise) resolvePromise(false);
  emit('cancel');
}

defineExpose({ show });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal {
  background: var(--bg-paper, #fff);
  border: 3px solid var(--color-primary, #333);
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 5px 5px 0 var(--color-primary, #333);
  text-align: center;
  max-width: 90vw;
}

.modal.small {
  width: 300px;
}

.modal.medium {
  width: 400px;
}

.modal.large {
  width: 500px;
}

.modal-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.modal-title {
  font-family: var(--font-display, 'ZCOOL KuaiLe', cursive);
  font-size: var(--text-h2, 1.5rem);
  color: var(--color-primary, #333);
  margin: 0 0 12px 0;
}

.modal-message {
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
  font-size: var(--text-body, 1rem);
  color: var(--color-gray-dark, #555);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  padding: 10px 24px;
  border: 2px solid var(--color-primary, #333);
  border-radius: var(--radius-small, 8px);
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
  font-size: var(--text-body, 1rem);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 3px 3px 0 var(--color-primary, #333);
}

.modal-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-primary, #333);
}

.modal-btn-cancel {
  background: var(--color-white, #fff);
  color: var(--color-primary, #333);
}

.modal-btn-cancel:hover {
  background: var(--color-gray-light, #f5f5f5);
}

.modal-btn-confirm.danger {
  background: var(--color-accent-red, #e74c3c);
  color: white;
  border-color: var(--color-accent-red, #e74c3c);
  box-shadow: 3px 3px 0 var(--color-accent-red, #e74c3c);
}

.modal-btn-confirm.danger:hover {
  background: #c0392b;
}

.modal-btn-confirm.primary {
  background: var(--color-accent-purple, #9b59b6);
  color: white;
  border-color: var(--color-accent-purple, #9b59b6);
  box-shadow: 3px 3px 0 var(--color-accent-purple, #9b59b6);
}

.modal-btn-confirm.primary:hover {
  opacity: 0.9;
}

/* Transitions */
.modal-enter-active {
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  animation: modalOut 0.2s ease-out forwards;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes modalOut {
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
