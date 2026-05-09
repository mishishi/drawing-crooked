import { ref } from 'vue';

export function useFirstTimeGuidance() {
  const isFirstTurn = ref(!localStorage.getItem('hasPlayedBefore'));
  const hasShownFirstTurnGuidance = ref(localStorage.getItem('hasShownFirstTurnGuidance') === 'true');

  function dismissFirstTurnGuidance() {
    hasShownFirstTurnGuidance.value = true;
    localStorage.setItem('hasShownFirstTurnGuidance', 'true');
  }

  function markFirstTurnComplete() {
    if (isFirstTurn.value) {
      isFirstTurn.value = false;
      localStorage.setItem('hasPlayedBefore', 'true');
    }
  }

  return {
    isFirstTurn,
    hasShownFirstTurnGuidance,
    dismissFirstTurnGuidance,
    markFirstTurnComplete
  };
}
