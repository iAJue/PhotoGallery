<template>
    <div class="container">
        <div class="gallery random">
            <div class="photo-item" v-for="(randomItem, index) in randomItems" :key="index"
                @click="handleItemClick(randomItem, index)">
                <img :src="randomItem.src" :alt="randomItem.alt" v-if="!randomItem.isVideo" />
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
        <div v-if="currentImage" class="image-modal">
            <img :src="currentImage.src" :alt="currentImage.alt" @swipeleft="nextImage" @swiperight="previousImage" />

            <!-- 左右导航按钮 -->
            <button class="nav-button left" @click.stop="previousImage">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="nav-button right" @click.stop="nextImage">
                <i class="fas fa-chevron-right"></i>
            </button>

            <span class="close-icon" @click="closeImage">✖</span>
        </div>

        <!-- 视频预览模态框 -->
        <div v-if="currentMedia && currentMedia.isVideo" class="video-modal" @click.self="closeMedia">
            <div class="dplayer-container"></div>
        </div>

        <!-- 加载更多按钮 -->
        <div class="load-more" v-if="!loading">
            <button @click="loadMoreItems">加载更多 <i class="fas fa-chevron-down"></i></button>
        </div>
    </div>
</template>


<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import DPlayer from 'dplayer';

const randomItems = ref([]);
const loading = ref(false);
const page = ref(1);
const currentMedia = ref(null); // 当前预览的图片或视频
const dplayerInstance = ref(null); // DPlayer 实例
const limit = ref(12);
const currentSrcIndex = ref(0); // 用于跟踪当前播放的分段索引
const currentImage = ref(null); // 当前预览的图片
const currentIndex = ref(null); // 当前图片索引
function handleItemClick(item, index) {
    if (!item.isVideo) {
        currentImage.value = item;
        currentIndex.value = index;
    } else {
        currentMedia.value = item;
        currentSrcIndex.value = 0;
        nextTick(() => initDPlayer());
    }
}

function closeImage() {
    currentImage.value = null;
    currentIndex.value = null;
}

function nextImage() {
    if (currentIndex.value !== null) {
        let nextIndex = (currentIndex.value + 1) % randomItems.value.length;
        while (randomItems.value[nextIndex].isVideo) {
            nextIndex = (nextIndex + 1) % randomItems.value.length; // 跳过视频，循环查找下一张图片
        }
        currentIndex.value = nextIndex;
        currentImage.value = randomItems.value[currentIndex.value];
    }
}

function previousImage() {
    if (currentIndex.value !== null) {
        let prevIndex = (currentIndex.value - 1 + randomItems.value.length) % randomItems.value.length;
        while (randomItems.value[prevIndex].isVideo) {
            prevIndex = (prevIndex - 1 + randomItems.value.length) % randomItems.value.length; // 跳过视频，循环查找上一张图片
        }
        currentIndex.value = prevIndex;
        currentImage.value = randomItems.value[currentIndex.value];
    }
}
// 初始化 DPlayer
function initDPlayer() {
    if (dplayerInstance.value) {
        dplayerInstance.value.destroy();
    }

    dplayerInstance.value = new DPlayer({
        container: document.querySelector('.dplayer-container'),
        video: {
            url: Array.isArray(currentMedia.value.src)
                ? currentMedia.value.src[currentSrcIndex.value]
                : currentMedia.value.src,
            type: 'auto',
        },
        autoplay: true,
    });

    dplayerInstance.value.on('timeupdate', handleTimeUpdate);
}

// 监听播放时间更新
function handleTimeUpdate() {
    if (!dplayerInstance.value || !dplayerInstance.value.video) {
        console.warn('播放器实例不存在或已销毁');
        return;
    }

    const currentTime = dplayerInstance.value.video.currentTime;
    const duration = dplayerInstance.value.video.duration;

    console.log(`当前播放时间: ${currentTime}, 视频总时长: ${duration}`);

    if (Array.isArray(currentMedia.value.src) && currentMedia.value.src.length > 1) {
        // 提前加载下一个分段视频
        if (currentTime >= duration - 20 && currentSrcIndex.value < currentMedia.value.src.length - 1) {
            console.log('接近视频末尾，预加载下一个视频分段');
            preloadNextSegment(currentSrcIndex.value + 1);
        }

        // 当前视频播放结束时切换到下一个分段
        if (currentTime >= duration - 1 && currentSrcIndex.value < currentMedia.value.src.length - 1) {
            console.log('切换到下一个视频分段');
            currentSrcIndex.value += 1;
            switchToNextSegment();
        }

        // 最后一段播放结束时重置为第一段
        if (currentTime >= duration - 1 && currentSrcIndex.value === currentMedia.value.src.length - 1) {
            console.log('所有分段播放完成，重置到第一段');
            currentSrcIndex.value = 0;
            dplayerInstance.value.pause(); // 暂停播放
        }
    }
}
function preloadNextSegment(index) {
    const nextSegmentUrl = currentMedia.value.src[index];
    const videoElement = document.createElement('video');
    videoElement.src = nextSegmentUrl;
    videoElement.preload = 'metadata'; // 仅加载元数据以减少流量消耗
    videoElement.load();
    console.log(`预加载视频分段：${nextSegmentUrl}`);
}
// 切换到下一个分段视频
function switchToNextSegment() {
    const nextSegmentUrl = currentMedia.value.src[currentSrcIndex.value];
    dplayerInstance.value.switchVideo({
        url: nextSegmentUrl,
        type: 'auto',
        autoplay: true
    });
    dplayerInstance.value.play(); // 保持播放状态
    console.log(`切换到新的视频分段：${nextSegmentUrl}`);
}


// 关闭媒体预览模态框
function closeMedia() {
    if (dplayerInstance.value) {
        dplayerInstance.value.destroy(); // 销毁播放器实例
        dplayerInstance.value = null; // 确保不会再访问销毁的实例
    }
    currentMedia.value = null;
    currentSrcIndex.value = 0;
}

// 加载随机数据
async function shuffleGallery(page) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=random&page=${page}&limit=${limit.value}`);
        if (!response.ok) throw new Error('网络请求失败');

        const data = await response.json();

        if (data.length === 0) {
            return [];
        }
        const newItems = data.map(item => ({
            src: item.type === 1 ? item.data.split('\n') : item.data,
            alt: item.name,
            isVideo: item.type === 1,
            duration: formatDuration(parseFloat(item.duration)) || null,
        }));

        return newItems;
    } catch (error) {
        console.error("获取随机数据失败:", error);
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

// 格式化时长
function formatDuration(duration) {
    const totalSeconds = Math.floor(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

onMounted(() => {
    loadMoreItems(); // 初次加载
});

onBeforeUnmount(() => {
    if (dplayerInstance.value) {
        dplayerInstance.value.destroy(); // 销毁播放器实例
        dplayerInstance.value = null;
    }
});
</script>


<style scoped>
.container{
    padding-bottom: 30px;
}
.gallery.random {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    padding: 24px;
    min-height: calc(100vh - 68px); /* 减去头部高度 */
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
    width: 80%;
    height: 60%;
    border-radius: 8px;
    overflow: hidden;
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
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
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