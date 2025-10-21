import { ref, nextTick } from 'vue';
import DPlayer from 'dplayer';

// params: { containerRef, currentMedia, currentSrcIndex }
export function useDPlayerPreview(params) {
  const { containerRef, currentMedia, currentSrcIndex } = params;
  const dplayerInstance = ref(null);

  function initDPlayer() {
    if (!currentMedia.value) return;
    if (dplayerInstance.value) {
      dplayerInstance.value.destroy();
      dplayerInstance.value = null;
    }

    dplayerInstance.value = new DPlayer({
      container: containerRef.value,
      video: {
        url: Array.isArray(currentMedia.value.src)
          ? currentMedia.value.src[currentSrcIndex.value]
          : currentMedia.value.src,
        type: 'auto',
      },
      autoplay: true,
    });

    dplayerInstance.value.on('loadedmetadata', adjustVideoSize);
    dplayerInstance.value.on('timeupdate', handleTimeUpdate);
    dplayerInstance.value.on('ended', handleEnded);
  }

  function adjustVideoSize() {
    const videoEl = dplayerInstance.value?.video;
    const container = containerRef.value;
    if (!videoEl || !container) return;

    const { videoWidth, videoHeight } = videoEl;
    const aspectRatio = videoWidth / videoHeight;
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.95;

    let newWidth, newHeight;
    if (aspectRatio > 1) {
      newWidth = Math.min(maxWidth, maxHeight * aspectRatio);
      newHeight = newWidth / aspectRatio;
    } else {
      newHeight = Math.min(maxHeight, maxWidth / aspectRatio);
      newWidth = newHeight * aspectRatio;
    }

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
  }

  function handleTimeUpdate() {
    if (!dplayerInstance.value || !dplayerInstance.value.video) return;
    const currentTime = dplayerInstance.value.video.currentTime;
    const duration = dplayerInstance.value.video.duration;

    if (Array.isArray(currentMedia.value?.src) && currentMedia.value.src.length > 1) {
      // Preload next segment ~20s before end
      if (currentTime >= duration - 20 && currentSrcIndex.value < currentMedia.value.src.length - 1) {
        preloadNextSegment(currentSrcIndex.value + 1);
      }
    }
  }

  function handleEnded() {
    if (!Array.isArray(currentMedia.value?.src)) return;
    // Switch to next segment if available, else reset and pause
    if (currentSrcIndex.value < currentMedia.value.src.length - 1) {
      currentSrcIndex.value += 1;
      switchToNextSegment();
    } else {
      currentSrcIndex.value = 0;
      dplayerInstance.value?.pause();
    }
  }

  function preloadNextSegment(index) {
    const url = currentMedia.value?.src?.[index];
    if (!url) return;
    const videoElement = document.createElement('video');
    videoElement.src = url;
    videoElement.preload = 'metadata';
    videoElement.load();
  }

  function switchToNextSegment() {
    const url = currentMedia.value?.src?.[currentSrcIndex.value];
    if (!url || !dplayerInstance.value) return;
    dplayerInstance.value.switchVideo({ url, type: 'auto', autoplay: true });
    dplayerInstance.value.play();
  }

  async function openMedia(item) {
    currentMedia.value = item;
    currentSrcIndex.value = 0;
    await nextTick();
    initDPlayer();
  }

  function closeMedia() {
    if (dplayerInstance.value) {
      dplayerInstance.value.destroy();
      dplayerInstance.value = null;
    }
    currentMedia.value = null;
    currentSrcIndex.value = 0;
  }

  return {
    dplayerInstance,
    openMedia,
    closeMedia,
    initDPlayer,
    adjustVideoSize,
  };
}

