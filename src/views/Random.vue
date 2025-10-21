<template>
    <div class="container">
        <div class="gallery random">
            <div class="photo-item" v-for="(randomItem, index) in randomItems" :key="index"
                @click="handleItemClick(randomItem, index)">
                <img :src="randomItem.src" :alt="randomItem.alt" v-if="!randomItem.isVideo" loading="lazy" />
                <div v-else class="video-overlay">
                    <div class="play-icon"><i class="fa-solid fa-play"></i></div>
                    <video :src="randomItem.src[0]" muted preload="metadata"></video>
                    <div class="video-duration">{{ randomItem.duration }}</div>
                </div>
            </div>
            <!-- 骨架屏 -->
            <template v-if="loading">
                <div v-for="i in 12" :key="i" class="photo-item skeleton">
                    <div class="skeleton-img"></div>
                </div>
            </template>
        </div>

        <!-- 图片预览模态框 -->
        <div v-if="currentImage" class="image-modal" @click.self="closeImage">
            <img :src="currentImage.src" :alt="currentImage.alt" @swipeleft="nextImage" @swiperight="previousImage"
                loading="lazy" />
            <button class="nav-button left" @click.stop="previousImage">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="nav-button right" @click.stop="nextImage">
                <i class="fas fa-chevron-right"></i>
            </button>
            <span class="close-icon" @click="closeImage">&times;</span>
        </div>

        <!-- 视频预览模态框 -->
        <div v-if="currentMedia && currentMedia.isVideo" class="video-modal" @click.self="closeMedia">
            <div class="dplayer-container" ref="dplayerContainer"></div>
        </div>

        <!-- 加载更多按钮 -->
        <div class="load-more" v-if="!loading">
            <button @click="loadMoreItems">加载更多 <i class="fas fa-chevron-down"></i></button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { formatDuration } from '../utils/format';
import { useImagePreviewControls } from '../composables/useImagePreview';
import { useModalKeydown } from '../composables/useModalKeydown';
import { useDPlayerPreview } from '../composables/useDPlayerPreview';

const randomItems = ref([]);
const loading = ref(false);
const page = ref(1);
const currentMedia = ref(null); // 当前预览的视频
const limit = ref(15);
const dplayerContainer = ref(null);
const currentSrcIndex = ref(0);
const currentImage = ref(null); // 当前预览的图片
const currentIndex = ref(null); // 当前图片索引

const { openImage, closeImage, nextImage, previousImage } = useImagePreviewControls({
    currentImage,
    currentIndex,
    getItems: () => randomItems.value,
    isImage: (item) => !item.isVideo,
});

const { handleKeyDown } = useModalKeydown({
    isImageOpen: () => !!currentImage.value,
    isVideoOpen: () => !!currentMedia.value,
    closeImage,
    closeVideo: () => closeMedia(),
    nextImage,
    previousImage,
});

const { openMedia: openVideoPreview, closeMedia: closeVideoPreview } = useDPlayerPreview({
    containerRef: dplayerContainer,
    currentMedia,
    currentSrcIndex,
});

function handleItemClick(item, index) {
    if (!item.isVideo) {
        openImage(index);
    } else {
        openVideoPreview(item);
    }
}

function closeMedia() { closeVideoPreview(); }

// 加载随机数据
async function shuffleGallery(page) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=random&page=${page}&limit=${limit.value}`);
        if (!response.ok) throw new Error('网络请求失败');
        const data = await response.json();
        if (data.length === 0) return [];
        const newItems = data.map(item => ({
            src: item.type === 1 ? item.data.split('\n') : item.data,
            alt: item.name,
            isVideo: item.type === 1,
            duration: formatDuration(parseFloat(item.duration)) || null,
        }));
        return newItems;
    } catch (error) {
        console.error('获取随机数据失败:', error);
        return [];
    } finally {
        loading.value = false;
    }
}

// 加载更多数据
async function loadMoreItems() {
    if (loading.value) return;
    const newItems = await shuffleGallery(page.value);
    randomItems.value.push(...newItems);
    page.value += 1;
}

function setLimitBasedOnScreenSize() {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 2560) {
        limit.value = 50; // 2K 屏幕
    } else if (screenWidth >= 1200) {
        limit.value = 40; // 大屏幕
    } else if (screenWidth >= 768) {
        limit.value = 15; // 中等屏幕
    } else {
        limit.value = 10; // 小屏幕
    }
}

onMounted(() => {
    setLimitBasedOnScreenSize();
    window.addEventListener('resize', setLimitBasedOnScreenSize);
    window.addEventListener('keydown', handleKeyDown);
    loadMoreItems();
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
    closeVideoPreview();
    window.removeEventListener('resize', setLimitBasedOnScreenSize);
});
</script>

<style scoped>
.container {
    padding-bottom: 30px;
}

.gallery.random {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    padding: 24px;
}

.video-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
}

.dplayer-container {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    width: auto;
    height: auto;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.photo-item {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 1;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.photo-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.photo-item:hover img {
    transform: scale(1.05);
}

/* 骨架屏样式 */
.skeleton {
    background: var(--bg-secondary);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px var(--shadow-color);
}

.photo-item.skeleton {
    aspect-ratio: 1;
}

.skeleton-img {
    width: 100%;
    height: 100%;
    background: var(--skeleton-end);
    animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
    0% {
        opacity: 0.6;
    }

    50% {
        opacity: 1;
    }

    100% {
        opacity: 0.6;
    }
}

/* 模态框样式 */
.media-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.media-modal img,
.media-modal video {
    border-radius: 8px;
}

.video-container {
    max-width: 53%;
    border-radius: 8px;
    overflow: hidden;
}

.responsive-video {
    width: auto;
    height: auto;
}

.video-overlay {
    position: relative;
    height: 100%;
    width: 100%;
    background: #353535;
}

.video-overlay video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
}

.play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 25px;
    color: white;
    background: rgba(0, 0, 0, 0.6);
    padding: 8px 12px;
    border-radius: 50%;
    z-index: 9;
}

.video-duration {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
}

.load-more {
    display: flex;
    justify-content: center;
    margin-top: 16px;
}

.load-more button {
    padding: 7px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.3s ease;
}

.load-more button:hover {
    background-color: #0056b3;
}

.load-more button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

/* 图片预览模态框样式 */
.image-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.image-modal img {
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
}

/* 导航按钮 */
.nav-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    font-size: 24px;
    padding: 10px;
    cursor: pointer;
    border-radius: 50%;
    width: 50px;
    height: 50px;
}

.nav-button.left {
    left: 20px;
}

.nav-button.right {
    right: 20px;
}

.close-icon {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 24px;
    color: white;
    cursor: pointer;
}
</style>