<template>
  <div class="toolbar hand-drawn">
    <button class="tool-btn">画笔</button>
    <button class="tool-btn">橡皮</button>
    <button class="tool-btn">清空</button>
  </div>
</template>

<script setup>
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  padding: 12px;
  margin-top: 10px;
  background: #fff;
}

.tool-btn {
  padding: 8px 16px;
  cursor: pointer;
}
</style>
