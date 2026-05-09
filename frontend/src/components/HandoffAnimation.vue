<template>
  <transition name="handoff">
    <div v-if="show" class="handoff-overlay" @click="handleClick">
      <div class="handoff-content">
        <div v-if="imageData" class="handoff-image-wrapper">
          <img :src="imageData" alt="Previous drawing" class="handoff-image" />
        </div>
        <p class="handoff-message">{{ message }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  imageData: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: '传递中...'
  }
});

const emit = defineEmits(['animation-complete']);

let timeout = null;

function handleClick() {
  // Allow clicking to dismiss early
  emit('animation-complete');
}

onMounted(() => {
  // Emit animation-complete after transition duration
  timeout = setTimeout(() => {
    if (props.show) {
      emit('animation-complete');
    }
  }, 1500);
});

onUnmounted(() => {
  if (timeout) clearTimeout(timeout);
});
</script>

<style scoped>
.handoff-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(108, 92, 231, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.handoff-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 32px;
}

.handoff-image-wrapper {
  background: white;
  padding: 16px;
  border: 4px solid var(--color-primary);
  border-radius: var(--radius-medium);
  box-shadow: 8px 8px 0 var(--color-accent-yellow);
  animation: paperFloat 2s ease-in-out infinite;
  max-width: 300px;
  max-height: 300px;
}

.handoff-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-small);
}

.handoff-message {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: white;
  text-shadow: 3px 3px 0 var(--color-accent-purple);
  animation: pulse 1.5s ease-in-out infinite;
  text-align: center;
  margin: 0;
}

/* Transition classes */
.handoff-enter-active {
  animation: handoffIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.handoff-leave-active {
  animation: handoffOut 0.4s ease-in forwards;
}

/* Keyframes */
@keyframes paperFloat {
  0%, 100% {
    transform: translateY(0) rotate(-2deg);
  }
  50% {
    transform: translateY(-15px) rotate(2deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

@keyframes handoffIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(30px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes handoffOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.1);
  }
}
</style>
