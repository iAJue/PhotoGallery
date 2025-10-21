import { ref } from 'vue';

// options: { getItems: () => Array, isImage: (item) => boolean }
export function useImagePreview(options) {
  const { getItems, isImage } = options;

  const currentImage = ref(null);
  const currentIndex = ref(null);

  function openImage(index) {
    const items = getItems() || [];
    if (!Array.isArray(items) || items.length === 0) return;
    if (typeof index !== 'number' || index < 0 || index >= items.length) return;
    if (!isImage(items[index])) return;
    currentIndex.value = index;
    currentImage.value = items[index];
  }

  function closeImage() {
    currentImage.value = null;
    currentIndex.value = null;
  }

  function nextImage() {
    const items = getItems() || [];
    if (!Array.isArray(items) || items.length === 0) return;
    if (currentIndex.value === null || currentIndex.value === undefined) return;
    let next = (currentIndex.value + 1) % items.length;
    let guard = 0;
    while (!isImage(items[next])) {
      next = (next + 1) % items.length;
      if (++guard > items.length) return; // all non-image
    }
    currentIndex.value = next;
    currentImage.value = items[currentIndex.value];
  }

  function previousImage() {
    const items = getItems() || [];
    if (!Array.isArray(items) || items.length === 0) return;
    if (currentIndex.value === null || currentIndex.value === undefined) return;
    let prev = (currentIndex.value - 1 + items.length) % items.length;
    let guard = 0;
    while (!isImage(items[prev])) {
      prev = (prev - 1 + items.length) % items.length;
      if (++guard > items.length) return; // all non-image
    }
    currentIndex.value = prev;
    currentImage.value = items[currentIndex.value];
  }

  return {
    currentImage,
    currentIndex,
    openImage,
    closeImage,
    nextImage,
    previousImage,
  };
}

// Bind controls to existing refs
// params: { currentImage, currentIndex, getItems: () => Array, isImage: (item) => boolean }
export function useImagePreviewControls(params) {
  const { currentImage, currentIndex, getItems, isImage } = params;

  function openImage(index) {
    const items = getItems() || [];
    if (!Array.isArray(items) || items.length === 0) return;
    if (typeof index !== 'number' || index < 0 || index >= items.length) return;
    if (!isImage(items[index])) return;
    currentIndex.value = index;
    currentImage.value = items[index];
  }

  function closeImage() {
    currentImage.value = null;
    currentIndex.value = null;
  }

  function nextImage() {
    const items = getItems() || [];
    if (!Array.isArray(items) || items.length === 0) return;
    if (currentIndex.value === null || currentIndex.value === undefined) return;
    let next = (currentIndex.value + 1) % items.length;
    let guard = 0;
    while (!isImage(items[next])) {
      next = (next + 1) % items.length;
      if (++guard > items.length) return;
    }
    currentIndex.value = next;
    currentImage.value = items[currentIndex.value];
  }

  function previousImage() {
    const items = getItems() || [];
    if (!Array.isArray(items) || items.length === 0) return;
    if (currentIndex.value === null || currentIndex.value === undefined) return;
    let prev = (currentIndex.value - 1 + items.length) % items.length;
    let guard = 0;
    while (!isImage(items[prev])) {
      prev = (prev - 1 + items.length) % items.length;
      if (++guard > items.length) return;
    }
    currentIndex.value = prev;
    currentImage.value = items[currentIndex.value];
  }

  return { openImage, closeImage, nextImage, previousImage };
}
