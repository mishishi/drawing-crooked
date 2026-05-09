# Multi-Round Gameplay & Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-round gameplay (3 rounds), scoring system, enhanced reveal page, and skip mechanism for the drawing chain game.

**Architecture:** The game runs in sequential rounds. Each round, every player draws once in a chain. After all players draw, the chain is revealed and scored. Scoring compares player guesses against original sentences using simple text similarity. Multi-round uses existing round infrastructure - modify totalRounds from 1 to 3, reuse startNewRound() and startGame() flow.

**Tech Stack:** Vue 3, Socket.io, Node.js, vanilla CSS

---

## Task 1: Multi-Round Game Flow

**Files:**
- Modify: `backend/rooms.js:85` — change `totalRounds` from `room.players.length` to a config value (3)
- Modify: `backend/rooms.js:101-120` — emit round info to all players each round
- Modify: `backend/rooms.js:125-155` — submitDrawing handles round advancement
- Modify: `backend/socket/handlers.js:109-115` — validate start-game ownership

- [ ] **Step 1: Update totalRounds to 3**

In `backend/rooms.js`, modify `startGame()`:

```javascript
room.totalRounds = 3; // 3 rounds of drawing chains
```

- [ ] **Step 2: Verify round advancement logic**

In `submitDrawing()`, after saving drawing, check if all players have drawn (drawings.length === room.players.length). If yes, either end the round or advance to next round. The existing `advanceToNextPlayer` should handle this but verify it correctly increments `currentRound` when all players complete.

- [ ] **Step 3: Test round flow manually**

Run: `cd backend && node server.js`
Create two players, start game. Draw and submit. Verify round increments after both players draw. Check server logs for `currentRound` value.

---

## Task 2: Scoring System (Backend)

**Files:**
- Modify: `backend/rooms.js` — add `calculateScore(originalSentence, guessedSentence)` function
- Modify: `backend/rooms.js` — add `playerScores` map to room state
- Modify: `backend/rooms.js:200-215` — calculate scores in `endGame()`
- Modify: `backend/socket/handlers.js` — emit `round-ended` and `game-ended` with scores

- [ ] **Step 1: Add scoring function**

Add at bottom of `backend/rooms.js`:

```javascript
/**
 * Simple word-based similarity score between two sentences
 * Returns 0-100 score
 */
export function calculateScore(originalSentence, guessedSentence) {
  if (!originalSentence || !guessedSentence) return 0;
  
  const normalize = (s) => s.toLowerCase().replace(/[^\w\s\u4e00-\u9fff]/g, '').trim();
  const orig = normalize(originalSentence).split(/\s+/);
  const guess = normalize(guessedSentence).split(/\s+/);
  
  if (orig.length === 0 || guess.length === 0) return 0;
  
  // Count matching words
  const origSet = new Set(orig);
  const matches = guess.filter(w => origSet.has(w)).length;
  
  // Jaccard-like similarity
  const union = new Set([...orig, ...guess]);
  return Math.round((matches / union.size) * 100);
}
```

- [ ] **Step 2: Add playerScores to room state**

In `createRoom()` or in `resetRoomForNewGame()`, initialize:

```javascript
room.playerScores = {}; // { playerId: totalScore }
room.roundScores = [];  // [{ round, scores: { playerId: score } }]
```

- [ ] **Step 3: Score each round in endGame**

Replace `endGame()` final scores section:

```javascript
// Calculate scores for each drawing chain link
const roundScoreData = []; // { playerId, guess, original, score }

// For each drawing, the NEXT player (to) guessed what they saw
room.drawings.forEach((drawing, index) => {
  const nextDrawing = room.drawings[index + 1];
  if (!nextDrawing) return; // Last drawing has no guess
  
  const guesser = room.players.find(p => p.id === nextDrawing.from);
  const actualDrawer = room.players.find(p => p.id === drawing.from);
  if (!guesser || !actualDrawer) return;
  
  const originalSentence = drawing.sentence;
  const guessedSentence = nextDrawing.sentence; // The guesser's interpretation
  const score = calculateScore(originalSentence, guessedSentence);
  
  roundScoreData.push({
    playerId: guesser.id,
    playerName: guesser.name,
    original: originalSentence,
    guess: guessedSentence,
    score
  });
  
  // Accumulate total score
  room.playerScores[guesser.id] = (room.playerScores[guesser.id] || 0) + score;
});

// Add participation bonus (everyone who completed all rounds gets base points)
const basePoints = 10;
Object.keys(room.playerScores).forEach(pid => {
  room.playerScores[pid] += basePoints;
});

return {
  ...room,
  roundScoreData,
  playerScores: room.playerScores,
  drawingsWithNames
};
```

- [ ] **Step 4: Emit round-ended and game-ended with scores**

In `advanceToNextPlayer()`, when round ends (all players drawn), emit `round-ended` event with scores. In `endGame()`, emit `game-ended` with final scores.

---

## Task 3: Scoring System (Frontend)

**Files:**
- Modify: `frontend/src/socket/client.js` — add listeners for `round-ended` and `game-ended`
- Modify: `frontend/src/views/PlayCanvas.vue` — show round progress and score after each round
- Modify: `frontend/src/views/Reveal.vue` — display round-by-round scores

- [ ] **Step 1: Add socket listeners in client.js**

```javascript
socket.on('round-ended', ({ round, scores, drawings }) => {
  connectionState.value = 'round-ended';
  // Store round results for reveal
});

socket.on('game-ended', ({ finalScores, allDrawings, roundResults }) => {
  connectionState.value = 'game-ended';
  // Navigate to results/reveal
});
```

- [ ] **Step 2: Show round completion in PlayCanvas**

After submitting drawing, if round ends, show brief "等待其他玩家..." overlay until `round-ended` event.

- [ ] **Step 3: Display scores in Reveal page**

In Reveal.vue, show per-player scores, highlight best guesses, show the transformation chain with sentences.

---

## Task 4: Enhanced Reveal Page

**Files:**
- Modify: `frontend/src/views/Reveal.vue` — display full chain with scrollable view
- Add: `frontend/src/components/ChainViewer.vue` — horizontal scrollable chain visualization

- [ ] **Step 1: Add ChainViewer component**

Create `frontend/src/components/ChainViewer.vue`:

```vue
<template>
  <div class="chain-viewer">
    <div class="chain-scroll">
      <div 
        v-for="(item, index) in chain" 
        :key="index"
        class="chain-item"
      >
        <div class="chain-number">{{ index + 1 }}</div>
        <img :src="item.imageData" class="chain-image" />
        <div class="chain-sentence">{{ item.sentence }}</div>
        <div class="chain-author">{{ item.playerName }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  chain: { type: Array, required: true }
});
</script>

<style scoped>
.chain-viewer {
  width: 100%;
  overflow-x: auto;
  padding: var(--space-4);
}

.chain-scroll {
  display: flex;
  gap: var(--space-4);
  min-height: 300px;
}

.chain-item {
  flex: 0 0 250px;
  background: white;
  border: 3px solid var(--color-primary);
  border-radius: var(--radius-medium);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.chain-number {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  color: var(--color-accent-purple);
}

.chain-image {
  width: 200px;
  height: 150px;
  object-fit: contain;
  background: #fafafa;
  border-radius: var(--radius-small);
}

.chain-sentence {
  text-align: center;
  font-size: var(--text-body);
  color: var(--color-primary);
  word-break: break-word;
}

.chain-author {
  font-size: var(--text-caption);
  color: var(--color-info);
}
</style>
```

- [ ] **Step 2: Update Reveal.vue to use ChainViewer and show scores**

```vue
<template>
  <div class="reveal-page">
    <h1 class="hand-drawn">游戏结果</h1>
    
    <div v-if="roundResults" class="round-results">
      <div v-for="(round, index) in roundResults" :key="index" class="round-section">
        <h2>第 {{ round.round }} 轮</h2>
        <ChainViewer :chain="round.chain" />
        <div class="round-scores">
          <div v-for="score in round.scores" :key="score.playerId" class="score-card">
            <span class="player-name">{{ score.playerName }}</span>
            <span class="score-value">{{ score.score }}分</span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="finalScores" class="final-scores">
      <h2>最终得分</h2>
      <div v-for="(score, playerId) in finalScores" :key="playerId" class="final-score-row">
        {{ getPlayerName(playerId) }}: {{ score }}分
      </div>
    </div>
  </div>
</template>
```

---

## Task 5: Skip Mechanism

**Files:**
- Modify: `backend/rooms.js` — add `skipTurn(roomId, playerId)` function
- Modify: `backend/socket/handlers.js` — handle `skip-turn` event
- Modify: `frontend/src/views/PlayCanvas.vue` — add skip button and confirmation dialog

- [ ] **Step 1: Add skipTurn function in backend/rooms.js**

```javascript
export function skipTurn(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return null;
  
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return null;
  
  // Add a placeholder drawing with a marker indicating skip
  const sentence = room.drawings.length === 0
    ? room.sentences[playerId]
    : room.sentences[room.drawings[room.drawings.length - 1].from];
  
  const toPlayer = room.players[(room.currentPlayerIndex + 1) % room.players.length];
  
  room.drawings.push({
    from: playerId,
    sentence: sentence,
    to: toPlayer.id,
    imageData: null, // null indicates skipped
    round: room.currentRound,
    playerIndex: room.currentPlayerIndex,
    skipped: true
  });
  
  return room;
}
```

- [ ] **Step 2: Handle skip-turn in socket/handlers.js**

```javascript
socket.on('skip-turn', ({ roomId }) => {
  const room = getRoom(roomId);
  if (!room) return;
  
  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer?.id !== socket.id) return;
  
  const result = skipTurn(roomId, socket.id);
  if (!result) return;
  
  // Apply penalty
  room.playerScores[socket.id] = (room.playerScores[socket.id] || 0) - 5;
  
  // Advance to next player
  advanceToNextPlayer(roomId, io);
  
  io.to(roomId).emit('turn-skipped', {
    playerId: socket.id,
    playerName: currentPlayer.name,
    penalty: 5
  });
});
```

- [ ] **Step 3: Add skip button in PlayCanvas.vue**

In the toolbar area:

```vue
<button 
  v-if="isMyTurn" 
  class="hand-drawn-btn skip-btn"
  @click="confirmSkip"
>
  跳过回合 (-5分)
</button>
```

```javascript
function confirmSkip() {
  if (confirm('确定要跳过回合吗？将扣除5分！')) {
    socket.emit('skip-turn', { roomId });
  }
}
```

---

## Task 6: Integration Testing

**Files:**
- Test manually all game flows

- [ ] **Step 1: Test full 3-round game**

1. Start server: `cd backend && node server.js`
2. Start frontend: `cd frontend && npm run dev`
3. Open 2 browser tabs, create room with 2 players
4. Start game
5. Player 1 draws their sentence → submits
6. Player 2 sees Player 1's drawing, guesses → submits
7. Round 1 ends → both see round results
8. Repeat for rounds 2 and 3
9. Final reveal shows all rounds + scores

- [ ] **Step 2: Test skip penalty**

1. During your turn, click skip button
2. Confirm penalty applied
3. Other player continues
4. Verify skipped drawing appears as placeholder in reveal

- [ ] **Step 3: Test disconnect handling**

1. Start game with 2 players
2. Player 1 disconnects (closes tab) during their turn
3. Verify turn transfers to Player 2
4. Player 2 completes their turn
5. Verify round advances correctly

---

## File Summary

| File | Action |
|------|--------|
| `backend/rooms.js` | Modify: totalRounds=3, scoring functions, skipTurn |
| `backend/socket/handlers.js` | Modify: skip-turn handler, round-ended/game-ended emits |
| `frontend/src/socket/client.js` | Modify: add round-ended/game-ended listeners |
| `frontend/src/views/PlayCanvas.vue` | Modify: skip button, round progress display |
| `frontend/src/views/Reveal.vue` | Modify: show scores, round results |
| `frontend/src/components/ChainViewer.vue` | Create: horizontal scrollable chain visualization |

---

## Execution Options

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
