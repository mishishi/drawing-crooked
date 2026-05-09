<template>
  <div class="chain-viewer">
    <div class="chain-scroll">
      <div
        v-for="(item, index) in chain"
        :key="index"
        class="chain-item"
      >
        <div class="chain-number">{{ index + 1 }}</div>
        <img v-if="item.imageData" :src="item.imageData" class="chain-image" />
        <div v-else class="chain-image skipped">已跳过</div>
        <div class="chain-sentence">"{{ item.sentence }}"</div>
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
  padding: var(--space-2);
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
  border: 2px dashed var(--color-primary);
}

.chain-image.skipped {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-warning);
  font-size: var(--text-caption);
}

.chain-sentence {
  text-align: center;
  font-size: var(--text-body);
  color: var(--color-primary);
  word-break: break-word;
  font-style: italic;
}

.chain-author {
  font-size: var(--text-caption);
  color: var(--color-info);
}
</style>
