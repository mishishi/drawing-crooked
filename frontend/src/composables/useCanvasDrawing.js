import { ref, computed } from 'vue';

export function useCanvasDrawing(gameCanvasRef) {
  const currentTool = ref('pen');
  const currentColor = ref('#000000');
  const currentSize = ref(8);

  const undoCount = computed(() => {
    return gameCanvasRef.value?.undoCount ?? 0;
  });

  function clearCanvas() {
    gameCanvasRef.value?.clearCanvas();
  }

  function undoCanvas() {
    gameCanvasRef.value?.undo();
  }

  function getImageData() {
    return gameCanvasRef.value?.getImageData() || null;
  }

  function setImageData(dataUrl) {
    gameCanvasRef.value?.setImageData(dataUrl);
  }

  function clearCanvasForNewTurn() {
    if (gameCanvasRef.value) {
      gameCanvasRef.value.clearCanvas();
    }
  }

  return {
    currentTool,
    currentColor,
    currentSize,
    undoCount,
    clearCanvas,
    undoCanvas,
    getImageData,
    setImageData,
    clearCanvasForNewTurn
  };
}
