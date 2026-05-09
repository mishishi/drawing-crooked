import { io } from 'socket.io-client';
import { ref } from 'vue';

const connectionState = ref('disconnected'); // 'connected' | 'disconnected' | 'reconnecting'

const socket = io('http://localhost:6002', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

// Toast notification helper - avoids circular import
let toastFn = null;
export function setToastFn(fn) {
  toastFn = fn;
}

socket.on('connect', () => {
  console.log('[socket] connected');
  connectionState.value = 'connected';
});

socket.on('disconnect', () => {
  console.log('[socket] disconnected');
  connectionState.value = 'disconnected';
});

socket.on('reconnect_attempt', () => {
  console.log('[socket] reconnecting...');
  connectionState.value = 'reconnecting';
});

socket.on('reconnect_failed', () => {
  console.log('[socket] reconnection failed');
  connectionState.value = 'disconnected';
  toastFn?.('连接失败，请检查网络后刷新页面', 'error');
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  connectionState.value = 'disconnected';
  toastFn?.('无法连接到服务器，请检查网络后重试', 'error');
});

socket.on('game-ended', (data) => {
  console.log('[game-ended]', data);
  // Store data for reveal page; navigation is handled by PlayCanvas.vue
  window.gameResultData = data;
});

socket.on('round-ended', (data) => {
  console.log('[round-ended]', data);
  // Round results - handled by PlayCanvas.vue via other events
});

export { socket, connectionState };
