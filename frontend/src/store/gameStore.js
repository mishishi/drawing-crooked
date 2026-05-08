// Simple reactive store for game results
import { reactive } from 'vue';

export const gameResults = reactive({
  drawings: [],
  sentences: {}
});

export function setGameResults(results) {
  gameResults.drawings = results.drawings || [];
  gameResults.sentences = results.sentences || {};
}

export function clearGameResults() {
  gameResults.drawings = [];
  gameResults.sentences = {};
}