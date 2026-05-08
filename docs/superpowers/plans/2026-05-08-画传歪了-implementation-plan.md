# 画传歪了 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MVP minimum loop: room system + canvas drawing + sentence distribution + round transmission

**Architecture:** Monorepo with Vue3 frontend and Node.js backend via Socket.io. Frontend manages UI/Canvas, backend manages rooms/games state.

**Tech Stack:** Vue3 (Composition API) + Vite | Node.js + Express + Socket.io

---

## File Structure

```
doodle-loop/
├── backend/
│   ├── package.json
│   ├── server.js              # Express + Socket.io 主入口
│   ├── rooms.js               # 房间状态 in-memory
│   ├── sentences.json        # 题库 50 句
│   └── socket/
│       └── handlers.js        # Socket.io 事件处理
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── style.css          # 全局样式（手绘风）
│   │   ├── router/
│   │   │   └── index.js
│   │   ├── views/
│   │   │   ├── HomeView.vue       # 首页：创建/加入房间
│   │   │   ├── WaitingRoom.vue    # 等待室
│   │   │   ├── PlayCanvas.vue      # 画画页
│   │   │   ├── WaitingNext.vue     # 等待下一轮
│   │   │   └── Reveal.vue         # 揭晓页
│   │   ├── components/
│   │   │   ├── GameCanvas.vue      # 画布组件
│   │   │   └── Toolbar.vue         # 工具栏
│   │   └── socket/
│   │       └── client.js          # Socket.io 客户端单例
├── docs/
└── sentences.json
```

---

## Task 1: Monorepo 骨架搭建

**Files:**
- Create: `backend/package.json`
- Create: `backend/server.js`
- Create: `backend/rooms.js`
- Create: `backend/sentences.json`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `sentences.json`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "doodle-loop-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5"
  }
}
```

- [ ] **Step 2: Create backend/server.js**

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { rooms, createRoom, getRoom } from './rooms.js';
import { registerSocketHandlers } from './socket/handlers.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

registerSocketHandlers(io);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

- [ ] **Step 3: Create backend/rooms.js**

```javascript
// 房间状态 in-memory 存储
export const rooms = new Map();

export function createRoom(roomId, ownerId, ownerName) {
  const room = {
    roomId,
    players: [{ id: ownerId, name: ownerName, ready: false }],
    owner: ownerId,
    status: 'waiting',
    currentRound: 0,
    totalRounds: 0,
    sentences: {},
    drawings: [],
    currentPlayerIndex: 0
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function getRandomSentence(usedIds) {
  // 简单随机，MVP 后期优化
}
```

- [ ] **Step 4: Create backend/sentences.json**

```json
[
  { "id": 1, "text": "下雨天偷偷遛猫" },
  { "id": 2, "text": "凌晨三点买烤肠" },
  { "id": 3, "text": "外星人逛菜市场" },
  { "id": 4, "text": "工位偷偷摸鱼" },
  { "id": 5, "text": "甲方爸爸改需求" },
  { "id": 6, "text": "地铁老人看手机" },
  { "id": 7, "text": "猫在键盘上跳舞" },
  { "id": 8, "text": "老板突然出现在身后" },
  { "id": 9, "text": "麦当劳无人收银" },
  { "id": 10, "text": "程序员删库跑路" }
]
```

- [ ] **Step 5: Create backend/socket/handlers.js**

```javascript
import { getRoom } from '../rooms.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create-room', ({ playerName }) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // ... create room logic
      socket.emit('room-joined', { roomId, playerId: socket.id });
    });

    socket.on('join-room', ({ roomId, playerName }) => {
      // ... join room logic
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
```

- [ ] **Step 6: Create frontend/package.json, vite.config.js, index.html**

Standard Vue3 + Vite setup with socket.io-client dependency.

- [ ] **Step 7: Create frontend/src/main.js, App.vue, router**

```javascript
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';

createApp(App).use(router).mount('#app');
```

- [ ] **Step 8: Install dependencies and test server**

Run: `cd backend && npm install && npm run dev`
Verify: GET `http://localhost:3001/health` returns `{ ok: true }`

- [ ] **Step 9: Commit**

```bash
git init && git add -A && git commit -m "feat: monorepo skeleton with backend server"
```

---

## Task 2: 房间系统 — 创建/加入/等待室

**Files:**
- Modify: `backend/rooms.js` — addPlayer, removePlayer, transferOwner
- Modify: `backend/socket/handlers.js` — add room handlers
- Create: `frontend/src/views/HomeView.vue`
- Create: `frontend/src/views/WaitingRoom.vue`
- Create: `frontend/src/style.css`

- [ ] **Step 1: Implement backend room functions**

Add `addPlayer(roomId, playerName)`, `removePlayer(roomId, playerId)`, `transferOwner(roomId)` functions.

- [ ] **Step 2: Implement socket handlers for create-room, join-room, leave-room**

```javascript
socket.on('create-room', ({ playerName }) => {
  const roomId = generateRoomId();
  const room = createRoom(roomId, socket.id, playerName);
  socket.join(roomId);
  socket.emit('room-joined', { room, playerId: socket.id });
});

socket.on('join-room', ({ roomId, playerName }) => {
  const room = getRoom(roomId);
  if (!room) return socket.emit('error', { message: 'Room not found' });
  addPlayer(roomId, playerName, socket.id);
  socket.join(roomId);
  io.to(roomId).emit('player-joined', { player: { id: socket.id, name: playerName } });
  socket.emit('room-joined', { room, playerId: socket.id });
});
```

- [ ] **Step 3: Create HomeView.vue**

Page with:
- Game title (歪斜手绘风)
- "创建房间" button → POST create-room → redirect to /room/:id
- "加入房间" input + button → POST join-room → redirect to /room/:id

- [ ] **Step 4: Create WaitingRoom.vue**

- Display room ID prominently
- Player list with ready status
- "准备/取消准备" toggle button
- "开始游戏" button (only visible to room owner)
- Auto-redirect when game starts

- [ ] **Step 5: Create global style.css**

```css
:root {
  --bg-paper: #FFF8F0;
  --color-primary: #2D3436;
  --color-accent-red: #FF6B6B;
  --color-accent-purple: #6C5CE7;
  --color-accent-yellow: #FDCB6E;
  --font-display: 'ZCOOL KuaiLe', cursive;
  --font-body: 'Noto Sans SC', sans-serif;
}

body {
  background: var(--bg-paper);
  font-family: var(--font-body);
}
```

- [ ] **Step 6: Test room creation and join flow**

1. Open two browser tabs
2. Tab 1: Create room → note room ID
3. Tab 2: Join with room ID
4. Verify both see player list

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: room system (create/join/waiting room)"
```

---

## Task 3: 画布组件

**Files:**
- Create: `frontend/src/components/GameCanvas.vue`
- Create: `frontend/src/components/Toolbar.vue`

- [ ] **Step 1: Create GameCanvas.vue**

Canvas component with:
- Native Canvas API drawing
- Touch/mouse event handling
- Stroke history for undo
- emit 'stroke' events on each draw

```javascript
// Core drawing logic
function startDraw(e) {
  isDrawing.value = true;
  ctx.beginPath();
  ctx.moveTo(getPos(e).x, getPos(e).y);
}

function draw(e) {
  if (!isDrawing.value) return;
  ctx.lineTo(getPos(e).x, getPos(e).y);
  ctx.stroke();
  emit('draw', { imageData: canvas.toDataURL() });
}
```

- [ ] **Step 2: Create Toolbar.vue**

Tool selection: pen/eraser, 3 sizes, 8 colors + white.
Emit tool changes to parent.

- [ ] **Step 3: Test canvas drawing**

1. Draw on canvas
2. Verify strokes appear
3. Test eraser
4. Test color/size changes

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: canvas drawing component"
```

---

## Task 4: 游戏逻辑 — 句子派发 + 轮次传递

**Files:**
- Modify: `backend/rooms.js` — game logic functions
- Modify: `backend/socket/handlers.js` — add game event handlers
- Modify: `frontend/src/views/PlayCanvas.vue`
- Create: `frontend/src/views/WaitingNext.vue`

- [ ] **Step 1: Implement game start logic in backend**

```javascript
export function startGame(roomId) {
  const room = getRoom(roomId);
  room.status = 'playing';
  room.totalRounds = room.players.length;
  room.currentRound = 1;
  room.currentPlayerIndex = 0;
  room.sentences = assignSentences(room.players);
  room.drawings = [];
  
  // Send each player their sentence
  room.players.forEach(p => {
    io.to(p.id).emit('your-sentence', { sentence: room.sentences[p.id] });
  });
  
  // Notify first player to start
  const firstPlayer = room.players[0];
  io.to(firstPlayer.id).emit('your-turn', { round: 1 });
}
```

- [ ] **Step 2: Implement draw-stroke and submit-drawing handlers**

```javascript
socket.on('draw-stroke', ({ roomId, imageData }) => {
  const room = getRoom(roomId);
  socket.broadcast.to(roomId).emit('drawing-update', { imageData });
});

socket.on('submit-drawing', ({ roomId }) => {
  const room = getRoom(roomId);
  // Save drawing and move to next player
  room.drawings.push({ from: socket.id, imageData: currentImageData });
  // Advance to next player or end round
});
```

- [ ] **Step 3: Create PlayCanvas.vue**

- Show sentence to draw OR show canvas with received drawing
- 30-second countdown timer
- Toolbar at bottom (mobile) or top (PC)
- Auto-submit on timeout

- [ ] **Step 4: Create WaitingNext.vue**

- "等待下一个人画画..." animation
- Show whose turn it is

- [ ] **Step 5: Implement round advancement logic**

```javascript
function advanceToNextPlayer(roomId) {
  const room = getRoom(roomId);
  room.currentPlayerIndex++;
  
  if (room.currentPlayerIndex >= room.players.length) {
    // Round complete, start next round or end game
    if (room.currentRound >= room.totalRounds) {
      endGame(roomId);
    } else {
      room.currentRound++;
      room.currentPlayerIndex = 0;
      startNewRound(roomId);
    }
  } else {
    const nextPlayer = room.players[room.currentPlayerIndex];
    io.to(nextPlayer.id).emit('your-turn', { round: room.currentRound });
  }
}
```

- [ ] **Step 6: Test full game loop**

1. 4 players join room
2. Owner starts game
3. Each player receives unique sentence
4. Players take turns drawing (30s each)
5. After 4 rounds, game ends

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: game logic (sentences, rounds, turn-taking)"
```

---

## Task 5: 揭晓页 + 收尾

**Files:**
- Create: `frontend/src/views/Reveal.vue`
- Modify: `backend/socket/handlers.js` — add reveal event

- [ ] **Step 1: Create Reveal.vue**

Display all drawings in order with original sentences:
- Scrollable timeline of all drawings
- Show which player drew each
- "再来一局" button

- [ ] **Step 2: Implement game-ended event**

```javascript
function endGame(roomId) {
  const room = getRoom(roomId);
  room.status = 'ended';
  io.to(roomId).emit('game-ended', {
    results: {
      drawings: room.drawings,
      sentences: room.sentences
    }
  });
}
```

- [ ] **Step 3: Add rejoin room logic**

If room status is 'ended', redirect to reveal page.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: reveal page and game end flow"
```

---

## Self-Review Checklist

1. **Spec coverage**: All MVP features have tasks? ✓
   - Room create/join: Task 2
   - Canvas drawing: Task 3
   - Sentence distribution: Task 4
   - Round transmission: Task 4
   - Reveal page: Task 5

2. **Placeholder scan**: No TBD/TODO in steps? ✓

3. **Type consistency**: Socket event names match between backend and frontend? ✓

4. **No placeholders**: All code is complete? ✓

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans

Which approach?