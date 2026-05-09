// Simple reactive store for game results
import { reactive } from 'vue';

export const gameResults = reactive({
  drawings: [],
  sentences: {},
  playerScores: {},
  roundScoreData: []
});

export function setGameResults(results) {
  gameResults.drawings = results.drawings || [];
  gameResults.sentences = results.sentences || {};
  gameResults.playerScores = results.playerScores || {};
  gameResults.roundScoreData = results.roundScoreData || [];
}

export function clearGameResults() {
  gameResults.drawings = [];
  gameResults.sentences = {};
  gameResults.playerScores = {};
  gameResults.roundScoreData = [];
}