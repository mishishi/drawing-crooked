<template>
  <div class="home">
    <!-- Notebook paper background -->
    <div class="notebook-bg"></div>

    <!-- Floating decorations -->
    <div class="deco deco-pencil">✏️</div>
    <div class="deco deco-brush">🖌️</div>
    <div class="deco deco-star">⭐</div>
    <div class="deco deco-heart">💜</div>

    <!-- Main content card -->
    <div class="home-card">
      <!-- Spiral binding -->
      <div class="spiral-binding">
        <div class="spiral-ring" v-for="i in 8" :key="i"></div>
      </div>

      <!-- Card content -->
      <div class="card-content">
        <!-- Title area -->
        <div class="title-area">
          <h1 class="title">
            <span class="title-char" style="--delay: 0">画</span>
            <span class="title-char" style="--delay: 1">传</span>
            <span class="title-char" style="--delay: 2">歪</span>
            <span class="title-char" style="--delay: 3">了</span>
          </h1>
          <div class="title-row">
          <div class="subtitle-badge">
            <span class="subtitle-text">和朋友一起玩画图传话游戏</span>
          </div>
          <button @click="showRules = true" class="rules-btn">📖 游戏规则</button>
        </div>
        </div>

        <!-- Form area -->
        <div class="form-area">
          <div class="input-group">
            <label class="input-label">
              <span class="label-icon">👤</span>
              你的名字
            </label>
            <input
              v-model="playerName"
              placeholder="给自己起个昵称"
              class="hand-drawn-input"
              maxlength="10"
            />
          </div>

          <div class="action-section">
            <button @click="createRoom" class="action-btn create-btn" :disabled="isCreating">
              <span v-if="isCreating" class="btn-icon">⏳</span>
              <span v-else class="btn-icon">🎨</span>
              <span class="btn-text">{{ isCreating ? '创建中...' : '创建房间' }}</span>
              <span v-if="!isCreating" class="btn-decoration">→</span>
            </button>

            <div class="divider-text">
              <span class="divider-line"></span>
              <span class="divider-label">或者</span>
              <span class="divider-line"></span>
            </div>

            <div class="input-group join-group">
              <label class="input-label">
                <span class="label-icon">🚪</span>
                房间号
              </label>
              <div class="room-input-wrapper">
                <input
                  v-model="roomId"
                  placeholder="输入房间号"
                  class="hand-drawn-input room-input"
                  :class="{
                    'valid': roomIdValidation === 'valid_format',
                    'invalid': roomIdValidation === 'invalid_format'
                  }"
                  maxlength="6"
                  @keyup.enter="joinRoom"
                  :disabled="isJoining"
                />
                <span v-if="roomIdValidation === 'valid_format'" class="validation-icon valid-icon">✓</span>
                <span v-else-if="roomIdValidation === 'invalid_format'" class="validation-icon invalid-icon">✕</span>
                <span v-else-if="roomId.length > 0 && roomId.length < 6" class="validation-icon hint-icon">{{ roomId.length }}/6</span>
              </div>
            </div>

            <button @click="joinRoom" class="action-btn join-btn" :disabled="isJoining">
              <span v-if="isJoining" class="btn-icon">⏳</span>
              <span v-else class="btn-icon">👋</span>
              <span class="btn-text">{{ isJoining ? '加入中...' : '加入房间' }}</span>
              <span v-if="!isJoining" class="btn-decoration">→</span>
            </button>
          </div>
        </div>

        <!-- Error message -->
        <transition name="error-pop">
          <div v-if="error" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
        </transition>
      </div>
    </div>

    <!-- Footer decoration -->
    <div class="footer-doodle">
      <span class="doodle-text">~ 开始你的创作之旅 ~</span>
    </div>

    <!-- Rules Modal -->
    <transition name="modal">
      <div v-if="showRules" class="modal-overlay" @click.self="showRules = false">
        <div class="modal-card">
          <div class="modal-header">
            <h2 class="modal-title">📖 游戏规则</h2>
            <button @click="showRules = false" class="modal-close">✕</button>
          </div>
          <div class="modal-content">
            <div class="rule-section">
              <h3>🎯 游戏目标</h3>
              <p>根据提示语句画画，让下一位玩家猜出语句，循环往复，最终看语句传成什么样了！</p>
            </div>
            <div class="rule-section">
              <h3>🔄 游戏流程</h3>
              <ol class="rule-list">
                <li><strong>第一位玩家</strong>：看到提示语句，画出对应的图画</li>
                <li><strong>第二位玩家</strong>：看图猜句子，写出你猜到的句子</li>
                <li><strong>第三位玩家</strong>：看到句子，再画一幅图</li>
                <li>以此类推，<strong>画画→猜谜→画画→猜谜...</strong></li>
              </ol>
            </div>
            <div class="rule-section">
              <h3>🏆 计分规则</h3>
              <p>最终答案与原句越接近，得分越高！全部完成后揭晓所有人的创作，感受"传话歪了"的乐趣！</p>
            </div>
            <div class="rule-section">
              <h3>💡 小技巧</h3>
              <ul class="rule-list">
                <li>画画要尽量简洁清晰</li>
                <li>猜句子时可以联想多种可能</li>
                <li>享受过程，不要太在意对错哦</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { socket } from '../socket/client.js';
import { showToast } from '../store/toastStore.js';

const router = useRouter();
const playerName = ref(localStorage.getItem('playerName') || '');
const roomId = ref('');
const error = ref('');
const isCreating = ref(false);
const isJoining = ref(false);
const showRules = ref(false);
const roomIdValidation = ref('idle'); // 'idle' | 'checking' | 'valid_format' | 'invalid_format'
let currentGuestName = '';

// Persist playerName to localStorage
watch(playerName, (val) => {
  localStorage.setItem('playerName', val);
});

// Real-time room code validation - only validate format, not existence
// Convert to uppercase for display as user types
watch(roomId, (val) => {
  if (!val) {
    roomIdValidation.value = 'idle';
    return;
  }

  // Convert to uppercase for display
  const trimmed = val.trim().toUpperCase();
  if (val !== trimmed) {
    roomId.value = trimmed;
  }

  if (trimmed.length < 6) {
    roomIdValidation.value = 'idle';
    return;
  }

  if (trimmed.length === 6 && /^[A-Z0-9]+$/.test(trimmed)) {
    roomIdValidation.value = 'valid_format';
  } else {
    roomIdValidation.value = 'invalid_format';
  }
});

const handleRoomJoined = ({ room, playerId }) => {
  isCreating.value = false;
  isJoining.value = false;
  router.push({
    name: 'waiting',
    params: { roomId: room.roomId },
    query: { name: playerName.value, room: JSON.stringify({ room, playerId }) }
  });
};

const handleCreateRoomError = ({ message }) => {
  error.value = message;
  isCreating.value = false;
};

const handleJoinRoomError = ({ message }) => {
  error.value = message;
  isJoining.value = false;
};

const handleError = ({ message }) => {
  error.value = message;
  isCreating.value = false;
  isJoining.value = false;
};

onMounted(() => {
  socket.on('room-joined', handleRoomJoined);
  socket.on('create-room-error', handleCreateRoomError);
  socket.on('join-room-error', handleJoinRoomError);
  socket.on('error', handleError);
  socket.on('connect_error', () => {
    isCreating.value = false;
    isJoining.value = false;
    showToast('无法连接到服务器，请检查网络后重试', 'error');
  });
});

onUnmounted(() => {
  socket.off('room-joined', handleRoomJoined);
  socket.off('create-room-error', handleCreateRoomError);
  socket.off('join-room-error', handleJoinRoomError);
  socket.off('error', handleError);
  socket.off('connect_error');
});

function createRoom() {
  if (isCreating.value) return;
  error.value = '';
  const name = playerName.value.trim() || generateGuestName();
  if (!playerName.value.trim()) {
    playerName.value = name;
    showToast(`已为你分配昵称: ${name}`, 'info');
  }
  isCreating.value = true;
  socket.connect();
  socket.emit('create-room', { playerName: name });
}

function joinRoom() {
  if (!roomId.value.trim()) {
    error.value = '请输入房间号';
    return;
  }
  error.value = '';
  const name = playerName.value.trim() || generateGuestName();
  if (!playerName.value.trim()) {
    playerName.value = name;
    showToast(`已为你分配昵称: ${name}`, 'info');
  }
  socket.connect();
  socket.emit('join-room', { roomId: roomId.value.trim().toUpperCase(), playerName: name });
}

function generateGuestName() {
  const guestNames = ['神秘玩家', '匿名画手', '路人甲', '隔壁老王', '吃瓜群众', '云画家'];
  currentGuestName = guestNames[Math.floor(Math.random() * guestNames.length)] + Math.floor(Math.random() * 100);
  return currentGuestName;
}
</script>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      transparent,
      transparent 39px,
      #e8d4c4 39px,
      #e8d4c4 40px
    ),
    linear-gradient(90deg, transparent 59px, #ffcccc 59px, #ffcccc 61px, transparent 61px),
    var(--bg-paper);
}

/* Floating decorations */
.deco {
  position: fixed;
  font-size: 40px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.deco-pencil {
  top: 12%;
  left: 8%;
  animation: float1 4s ease-in-out infinite;
}

.deco-brush {
  top: 20%;
  right: 10%;
  animation: float2 5s ease-in-out infinite;
}

.deco-star {
  bottom: 25%;
  left: 6%;
  animation: float3 4.5s ease-in-out infinite 0.5s;
}

.deco-heart {
  bottom: 15%;
  right: 8%;
  animation: float1 5.5s ease-in-out infinite 1s;
}

@keyframes float1 {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-15px) rotate(5deg); }
}

@keyframes float2 {
  0%, 100% { transform: translateY(0) rotate(5deg); }
  50% { transform: translateY(-20px) rotate(-5deg); }
}

@keyframes float3 {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(8deg); }
}

/* Main card */
.home-card {
  position: relative;
  display: flex;
  background: white;
  border: 4px solid var(--color-primary);
  border-radius: 20px;
  box-shadow: 8px 8px 0 var(--color-primary);
  overflow: visible;
  z-index: 10;
  animation: cardAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Spiral binding */
.spiral-binding {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 20px 8px;
  background: linear-gradient(90deg, #f5f0e8 0%, #fff 100%);
  border-right: 3px solid var(--color-primary);
  border-radius: 16px 0 0 16px;
}

.spiral-ring {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #888 0%, #444 100%);
  border-radius: 50%;
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.3);
  position: relative;
}

.spiral-ring::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #222;
  border-radius: 50%;
}

/* Card content */
.card-content {
  padding: 32px 40px;
  min-width: 360px;
}

/* Title area */
.title-area {
  text-align: center;
  margin-bottom: 28px;
}

.title {
  font-family: var(--font-display);
  font-size: var(--text-display);
  color: var(--color-accent-red);
  margin: 0;
  display: flex;
  justify-content: center;
  gap: 4px;
  transform: rotate(-2deg);
  text-shadow: 3px 3px 0 var(--color-accent-yellow);
}

.title-char {
  display: inline-block;
  animation: charBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--delay) * 0.1s) both;
}

@keyframes charBounce {
  from {
    opacity: 0;
    transform: translateY(-30px) rotate(-10deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

.subtitle-badge {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 16px;
  background: var(--color-accent-yellow);
  border: 2px solid var(--color-primary);
  border-radius: 20px;
  transform: rotate(1deg);
}

.subtitle-text {
  font-size: var(--text-caption);
  color: var(--color-primary);
  font-family: var(--font-body);
}

/* Form area */
.form-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.join-group {
  opacity: 1;
  transition: opacity 0.3s;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-caption);
  font-weight: bold;
  color: var(--color-primary);
  font-family: var(--font-body);
}

.label-icon {
  font-size: 1rem;
}

.hand-drawn-input {
  padding: 14px 18px;
  font-size: 1rem;
  font-family: var(--font-body);
  border: 3px solid var(--color-primary);
  border-radius: 12px;
  background: #fff;
  box-shadow: 4px 4px 0 var(--color-primary);
  outline: none;
  transition: box-shadow 0.2s, transform 0.2s;
}

.hand-drawn-input:focus {
  box-shadow: 5px 5px 0 var(--color-accent-purple);
  transform: translate(-1px, -1px);
}

.hand-drawn-input::placeholder {
  color: #aaa;
  font-style: italic;
}

.room-input {
  text-transform: uppercase;
  letter-spacing: 4px;
  font-weight: bold;
  text-align: center;
  padding-right: 40px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.room-input.valid {
  border-color: #27ae60;
  box-shadow: 4px 4px 0 #27ae60;
}

.room-input.invalid {
  border-color: var(--color-accent-red);
  box-shadow: 4px 4px 0 var(--color-accent-red);
}

.room-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.validation-icon {
  position: absolute;
  right: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  pointer-events: none;
}

.valid-icon {
  color: #27ae60;
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.invalid-icon {
  color: var(--color-accent-red);
  animation: shake 0.3s ease-in-out;
}

.hint-icon {
  color: #aaa;
  font-size: 0.9rem;
  letter-spacing: 0;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes popIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Action section */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  font-size: 1.2rem;
  font-weight: bold;
  font-family: var(--font-display);
  border: 4px solid var(--color-primary);
  border-radius: 16px;
  box-shadow: 5px 5px 0 var(--color-primary);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s;
}

.action-btn:hover::before {
  left: 100%;
}

.action-btn:hover {
  transform: translate(-3px, -3px);
  box-shadow: 7px 7px 0 var(--color-primary);
}

.action-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-primary);
}

.create-btn {
  background: var(--color-accent-red);
  color: white;
}

.join-btn {
  background: var(--color-accent-purple);
  color: white;
}

.btn-icon {
  font-size: 1.4rem;
}

.btn-text {
  flex: 1;
}

.btn-decoration {
  font-size: 1.2rem;
  opacity: 0.8;
}

/* Divider */
.divider-text {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}

.divider-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ddd, transparent);
}

.divider-label {
  font-size: 0.85rem;
  color: #888;
  font-family: var(--font-body);
}

/* Error message */
.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff0f0;
  border: 2px solid var(--color-accent-red);
  border-radius: 10px;
  color: var(--color-accent-red);
  font-size: 0.9rem;
  font-weight: bold;
}

.error-icon {
  font-size: 1.1rem;
}

.error-pop-enter-active {
  animation: errorPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.error-pop-leave-active {
  animation: errorPop 0.2s reverse;
}

@keyframes errorPop {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Title row with rules button */
.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.rules-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: bold;
  font-family: var(--font-body);
  color: var(--color-primary);
  background: white;
  border: 2px solid var(--color-primary);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.rules-btn:hover {
  background: var(--color-accent-yellow);
  transform: translateY(-2px);
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background: white;
  border: 4px solid var(--color-primary);
  border-radius: 20px;
  box-shadow: 8px 8px 0 var(--color-primary);
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  position: relative;
  z-index: 10;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--color-accent-yellow) 0%, #fff 100%);
  border-bottom: 3px solid var(--color-primary);
}

.modal-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-h2);
  color: var(--color-primary);
  transform: rotate(-1deg);
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--color-accent-red);
  color: white;
  transform: rotate(90deg);
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
}

.rule-section {
  margin-bottom: 20px;
}

.rule-section:last-child {
  margin-bottom: 0;
}

.rule-section h3 {
  margin: 0 0 8px 0;
  font-size: var(--text-body);
  color: var(--color-accent-purple);
  font-family: var(--font-display);
}

.rule-section p {
  margin: 0;
  font-size: 0.9rem;
  color: #555;
  line-height: 1.5;
}

.rule-list {
  margin: 0;
  padding-left: 20px;
  font-size: 0.9rem;
  color: #555;
  line-height: 1.8;
}

.rule-list li {
  margin-bottom: 4px;
}

/* Modal transitions */
.modal-enter-active {
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  animation: modalIn 0.2s reverse;
}

@keyframes modalIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-enter-active .modal-card {
  animation: modalCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .modal-card {
  animation: modalCardIn 0.2s reverse;
}

@keyframes modalCardIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Footer */
.footer-doodle {
  margin-top: 32px;
  text-align: center;
  z-index: 10;
}

.doodle-text {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--color-accent-purple);
  opacity: 0.7;
  animation: fadeFloat 3s ease-in-out infinite;
}

@keyframes fadeFloat {
  0%, 100% { opacity: 0.5; transform: translateY(0); }
  50% { opacity: 0.8; transform: translateY(-5px); }
}

/* Responsive */
@media (max-width: 500px) {
  .home-card {
    flex-direction: column;
  }

  .spiral-binding {
    flex-direction: row;
    border-right: none;
    border-bottom: 3px solid var(--color-primary);
    border-radius: 16px 16px 0 0;
    padding: 8px 20px;
  }

  .spiral-ring {
    width: 20px;
    height: 20px;
  }

  .card-content {
    min-width: auto;
    padding: 24px;
  }

  .title {
    font-size: 2.5rem;
  }

  .deco {
    display: none;
  }
}
</style>
