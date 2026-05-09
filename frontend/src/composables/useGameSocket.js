import { socket } from '../socket/client.js';
import { useGameState } from './useGameState.js';
import { setGameResults, clearGameResults } from '../store/gameStore.js';
import { showToast } from '../store/toastStore.js';

export function useGameSocket({ roomId, playerName, onSubmitDrawing, onDrawStroke, router }) {
  const {
    setSentence,
    setTurnData,
    setPlayers,
    addPlayer,
    removePlayer,
    triggerTurnFlash
  } = useGameState();

  // Handler: your-sentence
  function handleYourSentence({ sentence: s }) {
    setSentence(s);
  }

  // Handler: your-turn
  function handleYourTurn({ round, previousDrawing: prevDrawing, currentPlayerName: name, isMyTurn: myTurn, totalRounds: total, previousDrawing: prevDrawing }) {
    setTurnData({ round, previousDrawing: prevDrawing, currentPlayerName: name, isMyTurn: myTurn, totalRounds: total });
    if (myTurn) {
      triggerTurnFlash();
    }
  }

  // Handler: new-round
  function handleNewRound({ round, totalRounds: total }) {
    showToast(`第 ${round} 轮开始！`, 'info');
  }

  // Handler: drawing-update
  function handleDrawingUpdate({ imageData }) {
    // Update previous drawing for real-time viewing
  }

  // Handler: game-ended
  function handleGameEnded({ roomId: rid, results }) {
    if (results) {
      setGameResults(results);
    }
    router.push({ name: 'reveal', params: { roomId: rid } });
  }

  // Handler: game-started
  function handleGameStarted({ roomId: rid }) {
    clearGameResults();
    router.push({ name: 'play', params: { roomId: rid } });
  }

  // Handler: room-joined
  function handleRoomJoined({ room: r, playerId: pid, mySentence }) {
    // Set sentence immediately from room-joined event, OR from room.sentences directly
    if (mySentence) {
      setSentence(mySentence);
    } else if (r.sentences?.[pid]) {
      setSentence(r.sentences[pid]);
    }

    if (r.status === 'ended') {
      router.push({ name: 'reveal', params: { roomId: r.roomId } });
    }
  }

  // Handler: room-update
  function handleRoomUpdate({ room: r }) {
    // Update players and current state if needed
  }

  // Handler: player-joined
  function handlePlayerJoined({ player }) {
    addPlayer(player);
  }

  // Handler: player-left
  function handlePlayerLeft({ playerId: pid }) {
    removePlayer(pid);
  }

  // Handler: turn-skipped
  function handleTurnSkipped({ skippedPlayerName, newCurrentPlayerName, playerName, penalty }) {
    if (playerName && penalty !== undefined) {
      showToast(`${playerName} 跳过了回合 (-${penalty}分)`, 'info');
    } else if (skippedPlayerName && newCurrentPlayerName) {
      showToast(`${skippedPlayerName} 掉线了，轮到 ${newCurrentPlayerName}`, 'info');
    }
  }

  // Handler: reconnect
  function handleReconnect() {
    socket.emit('join-room', { roomId, playerName });
  }

  // Register all socket handlers
  function registerHandlers() {
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-update', handleRoomUpdate);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('your-sentence', handleYourSentence);
    socket.on('your-turn', handleYourTurn);
    socket.on('new-round', handleNewRound);
    socket.on('drawing-update', handleDrawingUpdate);
    socket.on('game-ended', handleGameEnded);
    socket.on('game-started', handleGameStarted);
    socket.on('turn-skipped', handleTurnSkipped);
    socket.on('reconnect', handleReconnect);
  }

  // Unregister all socket handlers
  function unregisterHandlers() {
    socket.off('room-joined', handleRoomJoined);
    socket.off('room-update', handleRoomUpdate);
    socket.off('player-joined', handlePlayerJoined);
    socket.off('player-left', handlePlayerLeft);
    socket.off('your-sentence', handleYourSentence);
    socket.off('your-turn', handleYourTurn);
    socket.off('new-round', handleNewRound);
    socket.off('drawing-update', handleDrawingUpdate);
    socket.off('game-ended', handleGameEnded);
    socket.off('game-started', handleGameStarted);
    socket.off('turn-skipped', handleTurnSkipped);
    socket.off('reconnect', handleReconnect);
  }

  // Emit join-room
  function joinRoom() {
    if (!socket.connected) {
      socket.once('connect', () => {
        socket.emit('join-room', { roomId, playerName });
      });
      socket.connect();
    } else {
      socket.emit('join-room', { roomId, playerName });
    }
  }

  return {
    registerHandlers,
    unregisterHandlers,
    joinRoom,
    handleYourTurn,
    handleYourSentence,
    handleNewRound,
    handleDrawingUpdate,
    handleGameEnded,
    handleGameStarted,
    handleRoomJoined,
    handleRoomUpdate,
    handlePlayerJoined,
    handlePlayerLeft,
    handleTurnSkipped,
    handleReconnect
  };
}
