import { ref, computed } from 'vue';

export function useGameState() {
  // Core game state
  const sentence = ref('');
  const isMyTurn = ref(false);
  const turnJustStarted = ref(false);
  const currentRound = ref(1);
  const totalRounds = ref(1);
  const currentPlayerName = ref('');
  const previousDrawing = ref(null);

  // Player state
  const players = ref([]);
  let myPlayerId = '';

  // Computed
  const currentPlayerPosition = computed(() => {
    if (!currentPlayerName.value) return 1;
    const idx = players.value.findIndex(p => p.name === currentPlayerName.value);
    return idx === -1 ? 1 : idx + 1;
  });

  // User's position in the turn queue
  const myPositionInQueue = computed(() => {
    if (!myPlayerId || !currentPlayerName.value) return 1;
    const currentIdx = players.value.findIndex(p => p.name === currentPlayerName.value);
    const myIdx = players.value.findIndex(p => p.id === myPlayerId);
    if (currentIdx === -1 || myIdx === -1) return 1;

    let ahead = (myIdx - currentIdx - 1 + players.value.length) % players.value.length;
    return ahead + 2;
  });

  const playersAheadInQueue = computed(() => {
    if (!myPlayerId || !currentPlayerName.value) return players.value.length - 1;
    const currentIdx = players.value.findIndex(p => p.name === currentPlayerName.value);
    const myIdx = players.value.findIndex(p => p.id === myPlayerId);
    if (currentIdx === -1 || myIdx === -1) return players.value.length - 1;

    let ahead = (myIdx - currentIdx - 1 + players.value.length) % players.value.length;
    return ahead;
  });

  function setMyPlayerId(id) {
    myPlayerId = id;
  }

  function setSentence(s) {
    sentence.value = s;
  }

  function setTurnData({ round, previousDrawing: prevDrawing, currentPlayerName: name, isMyTurn: myTurn, totalRounds: total }) {
    currentRound.value = round;
    if (total) totalRounds.value = total;
    currentPlayerName.value = name || '';
    previousDrawing.value = prevDrawing || null;
    isMyTurn.value = myTurn;
  }

  function setPlayers(playerList) {
    players.value = playerList || [];
  }

  function addPlayer(player) {
    if (!players.value.find(p => p.id === player.id)) {
      players.value.push(player);
    }
  }

  function removePlayer(playerId) {
    players.value = players.value.filter(p => p.id !== playerId);
  }

  function triggerTurnFlash() {
    turnJustStarted.value = true;
    setTimeout(() => {
      turnJustStarted.value = false;
    }, 1000);
  }

  function clearTurnData() {
    sentence.value = '';
    isMyTurn.value = false;
    turnJustStarted.value = false;
    currentRound.value = 1;
    totalRounds.value = 1;
    currentPlayerName.value = '';
    previousDrawing.value = null;
  }

  return {
    // State
    sentence,
    isMyTurn,
    turnJustStarted,
    currentRound,
    totalRounds,
    currentPlayerName,
    previousDrawing,
    players,
    // Computed
    currentPlayerPosition,
    myPositionInQueue,
    playersAheadInQueue,
    // Setters
    setMyPlayerId,
    setSentence,
    setTurnData,
    setPlayers,
    addPlayer,
    removePlayer,
    triggerTurnFlash,
    clearTurnData
  };
}
