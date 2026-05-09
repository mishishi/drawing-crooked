import { ref } from 'vue';
import { useAudioFeedback } from './useAudioFeedback.js';

export function useTimer(onTimeUp) {
  const { playBeep } = useAudioFeedback();
  const timeLeft = ref(30);
  const timerInterval = ref(null);
  const timeWarningShown = ref(false);

  function startTimer() {
    stopTimer();
    timeLeft.value = 30;
    timeWarningShown.value = false;
    timerInterval.value = setInterval(() => {
      timeLeft.value--;
      if (timeLeft.value === 5) {
        playBeep(800, 150);
      } else if (timeLeft.value === 3) {
        playBeep(600, 150);
      } else if (timeLeft.value === 1) {
        playBeep(400, 200);
      } else if (timeLeft.value === 0) {
        playBeep(300, 500);
      }
      if (timeLeft.value <= 5 && !timeWarningShown.value) {
        timeWarningShown.value = true;
      }
      if (timeLeft.value <= 0) {
        stopTimer();
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  }

  return {
    timeLeft,
    timeWarningShown,
    startTimer,
    stopTimer
  };
}
