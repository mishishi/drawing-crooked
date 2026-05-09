# Reveal Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interpretation bubbles (showing what each player saw) and handoff animations (dramatic turn transitions) to enhance the game experience.

**Architecture:** Two frontend enhancements to PlayCanvas.vue: (1) a visible "interpretation bubble" showing what sentence/drawing the player is interpreting, and (2) a handoff animation that plays when turns transition between players.

**Tech Stack:** Vue 3 Composition API, CSS animations/transitions, existing GameCanvas component

---

## File Structure

- Modify: `frontend/src/views/PlayCanvas.vue` - Add interpretation bubble and handoff animation triggers
- Modify: `frontend/src/style.css` - Add shared animation keyframes
- Create: `frontend/src/components/HandoffAnimation.vue` - Standalone handoff animation component

---

## Task 1: Create HandoffAnimation Component

**Files:**
- Create: `frontend/src/components/HandoffAnimation.vue`
- Modify: `frontend/src/views/PlayCanvas.vue:1-20` (import)
- Modify: `frontend/src/views/PlayCanvas.vue:165` (add to template)

- [ ] **Step 1: Create HandoffAnimation.vue with basic structure**

```vue
<template>
  <transition name="handoff" @after-leave="$emit('animation-complete')">
    <div v-if="show" class="handoff-overlay">
      <div class="handoff-content">
        <img v-if="imageData" :src="imageData" class="handoff-image" />
        <div class="handoff-text">{{ message }}</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  imageData: { type: String, default: null },
  message: { type: String, default: '传递中...' }
});

defineEmits(['animation-complete']);
</script>

<style scoped>
.handoff-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(108, 92, 231, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.handoff-content {
  text-align: center;
  color: white;
}

.handoff-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 16px;
  border: 4px solid white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  animation: paperFloat 1.5s ease-in-out infinite;
}

.handoff-text {
  margin-top: 24px;
  font-family: var(--font-display);
  font-size: 2rem;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes paperFloat {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.handoff-enter-active {
  animation: handoffIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.handoff-leave-active {
  animation: handoffOut 0.4s ease-in;
}

@keyframes handoffIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(50px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes handoffOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.1);
  }
}
</style>
```

- [ ] **Step 2: Add import to PlayCanvas.vue**

Add to the script imports section (around line 170):
```javascript
import HandoffAnimation from '../components/HandoffAnimation.vue';
```

- [ ] **Step 3: Add component to PlayCanvas template**

Add after line 164 (before `</template>` closing of play-canvas div):
```vue
<HandoffAnimation
  :show="showHandoff"
  :imageData="handoffImageData"
  :message="handoffMessage"
  @animation-complete="handleHandoffComplete"
/>
```

- [ ] **Step 4: Add handoff state to PlayCanvas script**

Add after line 222 (after `showTurnIndicator`):
```javascript
// Handoff animation state
const showHandoff = ref(false);
const handoffImageData = ref(null);
const handoffMessage = ref('');
let handoffTimeout = null;
```

- [ ] **Step 5: Add handoff trigger function**

Add after `dismissCelebration` function (around line 291):
```javascript
// Trigger handoff animation
function triggerHandoff(imageData, message = '传递中...') {
  // Clear any existing timeout
  if (handoffTimeout) clearTimeout(handoffTimeout);
  
  handoffImageData.value = imageData;
  handoffMessage.value = message;
  showHandoff.value = true;
  
  // Auto-hide after 1.5 seconds
  handoffTimeout = setTimeout(() => {
    showHandoff.value = false;
  }, 1500);
}

function handleHandoffComplete() {
  // Animation finished
  console.log('[handoff] animation complete');
}
```

- [ ] **Step 6: Trigger handoff when receiving your-turn with previous drawing**

Modify `handleYourTurn` function (around line 389). When `isMyTurn` is true AND `prevDrawing` exists, trigger the handoff animation BEFORE showing the canvas:

```javascript
function handleYourTurn({ round, previousDrawing: prevDrawing, currentPlayerName: name, isMyTurn: myTurn, totalRounds: total }) {
  // ... existing code ...
  
  if (isMyTurn.value) {
    if (prevDrawing) {
      // Show handoff animation with the previous drawing
      triggerHandoff(prevDrawing, '看看上一位画了什么~');
    }
    // ... rest of existing code
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/HandoffAnimation.vue frontend/src/views/PlayCanvas.vue
git commit -m "feat: add handoff animation component for turn transitions"
```

---

## Task 2: Add Interpretation Bubble

**Files:**
- Modify: `frontend/src/views/PlayCanvas.vue:58-100` (template section)
- Modify: `frontend/src/style.css` (if needed)

- [ ] **Step 1: Understand current implementation**

Current `sentence-card` (lines 58-71) shows the player's own sentence. Current `viewing-canvas-area` (lines 92-100) shows the previous drawing for non-players.

The interpretation bubble should appear ABOVE the canvas when it's the player's turn, showing:
- "👀 看到" label
- The sentence/drawing they need to interpret
- A speech-bubble style container

- [ ] **Step 2: Create interpretation bubble template**

Replace the current `viewing-canvas-area` section (lines 92-100) with an enhanced version that shows when it's the player's turn AND they have previousDrawing:

```vue
<!-- Interpretation bubble - shows what player is interpreting -->
<div v-if="isMyTurn && previousDrawing" class="interpretation-bubble">
  <div class="bubble-header">
    <span class="bubble-icon">💭</span>
    <span class="bubble-title">你在画什么？</span>
  </div>
  <div class="bubble-content">
    <div class="prev-drawing-mini">
      <img :src="previousDrawing" alt="Previous drawing" />
    </div>
    <div class="bubble-hint">
      <span class="hint-arrow">👆</span>
      <span>参考上面的画</span>
      <span class="hint-arrow">👆</span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add interpretation bubble CSS**

Add to PlayCanvas.vue `<style scoped>` section (before `</style>`):

```css
.interpretation-bubble {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(135deg, #fff 0%, #fff8e7 100%);
  border: 3px solid var(--color-accent-yellow);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 5px 5px 0 var(--color-accent-yellow);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px dashed var(--color-accent-yellow);
}

.bubble-icon {
  font-size: 1.5rem;
}

.bubble-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--color-accent-purple);
}

.bubble-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.prev-drawing-mini {
  width: 120px;
  height: 90px;
  border: 3px solid var(--color-primary);
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.prev-drawing-mini img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bubble-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #666;
}

.hint-arrow {
  animation: bounceUp 1s ease-in-out infinite;
}

@keyframes bounceUp {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
```

- [ ] **Step 4: Update sentence card for non-first round**

The current `sentence-card` shows the player's OWN sentence. For rounds > 1, players should see a different prompt since they're interpreting a drawing, not a sentence.

Modify the `sentence-card` section (lines 58-71) to conditionally show different content:

```vue
<!-- Sentence card - speech bubble style -->
<div class="sentence-card" :class="{ myTurn: isMyTurn }">
  <div class="speech-bubble">
    <span class="bubble-label">
      <template v-if="isMyTurn">
        <span v-if="previousDrawing" class="label-interpret">🎨 画出来</span>
        <span v-else class="label-original">🎯 原句</span>
      </template>
      <template v-else>等待中...</template>
    </span>
    <span class="bubble-text">
      <template v-if="isMyTurn && previousDrawing">
        上一位画的是什么？把它画出来！
      </template>
      <template v-else>
        {{ sentence || '等待中...' }}
      </template>
    </span>
  </div>
  <div class="bubble-tail"></div>
</div>
```

- [ ] **Step 5: Add interpretation label styles**

Add to the `<style scoped>` section:

```css
.label-interpret {
  color: var(--color-accent-purple);
  font-weight: bold;
}

.label-original {
  color: var(--color-accent-red);
  font-weight: bold;
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/PlayCanvas.vue frontend/src/style.css
git commit -m "feat: add interpretation bubble showing what player is drawing"
```

---

## Task 3: Integrate and Test Flow

**Files:**
- Test: Full flow through PlayCanvas.vue

- [ ] **Step 1: Verify state transitions**

Review the `handleYourTurn` function to ensure the flow is:
1. Receive `your-turn` event
2. If `isMyTurn` and has `prevDrawing`, trigger handoff animation
3. After handoff shows, reveal turn indicator celebration
4. After celebration dismissed, show canvas

- [ ] **Step 2: Test handoff animation timing**

The handoff should:
1. Show for ~1.5 seconds
2. Auto-dismiss
3. Then show turn indicator celebration
4. After celebration dismissed, show canvas with previous drawing loaded

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: integrate handoff animation and interpretation bubble flow"
```

---

## Verification Checklist

- [ ] Handoff animation plays when receiving a turn with `previousDrawing`
- [ ] Interpretation bubble appears above canvas showing previous drawing
- [ ] Sentence card changes to show "画出来" prompt when interpreting drawing
- [ ] Turn indicator celebration still works correctly
- [ ] Canvas loads with previous drawing after animations complete
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Mobile layout still works
- [ ] No console errors during flow
