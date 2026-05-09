// Toast notification store
import { reactive } from 'vue';

export const toast = reactive({
  message: '',
  type: 'info', // 'info' | 'error' | 'success'
  visible: false
});

let timeout = null;

export function showToast(message, type = 'info', duration = 3000) {
  toast.message = message;
  toast.type = type;
  toast.visible = true;

  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    toast.visible = false;
  }, duration);
}

export function hideToast() {
  toast.visible = false;
}
