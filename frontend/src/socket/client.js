import { io } from 'socket.io-client';
import { ref } from 'vue';

const connectionState = ref('disconnected'); // 'connected' | 'disconnected' | 'reconnecting'

const socket = io('http://localhost:6002', {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

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
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  connectionState.value = 'disconnected';
});

export { socket, connectionState };
