# 画传歪了 (Doodle Loop)

> 画传歪了 is a real-time multiplayer drawing and guessing game (like telephone, but with pictures).

## Project Overview

**Tech Stack:**
- Frontend: Vue 3 (Composition API) + Vite + Vue Router
- Backend: Node.js + Socket.io
- Styling: CSS Custom Properties with hand-drawn aesthetic

**Architecture:**
- Real-time game state via WebSocket (Socket.io)
- Game flow: Waiting Room → Play (Canvas drawing) → Reveal (chain visualization)
- Each round: a sentence is passed player-to-player as drawings

**Key Files:**
- `frontend/src/views/PlayCanvas.vue` - Main game canvas
- `frontend/src/views/WaitingRoom.vue` - Pre-game lobby
- `frontend/src/views/Reveal.vue` - Post-game chain visualization
- `frontend/src/components/GameCanvas.vue` - Drawing canvas logic
- `frontend/src/components/Toolbar.vue` - Drawing tools
- `frontend/src/socket/client.js` - Socket.io client singleton
- `backend/server.js` - Express + Socket.io server
- `backend/socket/handlers.js` - WebSocket event handlers
- `backend/rooms.js` - Room state management

## Development Commands

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev
```

## Design System

CSS variables are defined in `frontend/src/style.css`:
- `--font-display` / `--font-body` - ZCOOL KuaiLe / Noto Sans SC
- Type scale: `--text-display`, `--text-h1`, `--text-h2`, `--text-body`, `--text-caption`, `--text-small`
- Spacing: `--space-1` (4px) through `--space-16` (64px)
- Border-radius: `--radius-small`, `--radius-medium`, `--radius-large`, `--radius-full`

## Conventions

- Use Vue 3 Composition API with `<script setup>`
- CSS variables for all design tokens (no hardcoded colors/spacing)
- WebSocket events handled in `socket/handlers.js`
- Game state stored in `store/gameStore.js` and `store/toastStore.js`
- Global styles in `style.css`; component-scoped styles in `<style scoped>`
