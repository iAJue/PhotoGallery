// options: { isImageOpen: () => boolean, isVideoOpen: () => boolean, closeImage, closeVideo, nextImage, previousImage }
export function useModalKeydown(options) {
  const { isImageOpen, isVideoOpen, closeImage, closeVideo, nextImage, previousImage } = options;

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      if (isImageOpen && isImageOpen()) closeImage && closeImage();
      if (isVideoOpen && isVideoOpen()) closeVideo && closeVideo();
    } else if (event.key === 'ArrowRight' && isImageOpen && isImageOpen()) {
      nextImage && nextImage();
    } else if (event.key === 'ArrowLeft' && isImageOpen && isImageOpen()) {
      previousImage && previousImage();
    }
  }

  return { handleKeyDown };
}

