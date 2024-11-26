<template>
    <div class="">
        <div class="gallery random">
            <div class="photo-item" v-for="(randomItem, index) in randomItems" :key="index"
                @click="handleItemClick(randomItem)">
                <img :src="randomItem.src" :alt="randomItem.alt" v-if="!randomItem.isVideo" />
                <div v-else class="video-overlay">
                    <div class="play-icon"><i class="fa-solid fa-play"></i></div>
                    <video :src="randomItem.src[0]" muted preload="metadata"></video>
                    <div class="video-duration">{{ randomItem.duration }}</div>
                </div>
            </div>
        </div>
        <!-- 骨架屏：加载中 -->
        <div v-if="loading" class="photo-item skeleton">
            <div class="skeleton-img"></div>
        </div>
        <!-- 图片和视频预览模态框 -->
        <div v-if="currentMedia" class="media-modal" @click.self="closeMedia">
            <div v-if="currentMedia.isVideo" class="video-modal" @click.self="closeMedia">
                <div class="dplayer-container"></div>
            </div>
            <img v-else :src="currentMedia.src" :alt="currentMedia.alt" />
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

// 处理点击图片或视频的事件
function handleItemClick(item) {
    currentMedia.value = item;
    currentSrcIndex.value = 0; // 点击时重置分段索引
    nextTick(() => initDPlayer()); // 初始化播放器
}

// 关闭媒体预览模态框
function closeMedia() {
    if (dplayerInstance.value) {
        dplayerInstance.value.destroy();
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
        dplayerInstance.value.destroy();
    }
});
</script>


<style scoped>

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
}

.dplayer-container {
    width: 80%;
    height: 60%;
    border-radius: 8px;
    overflow: hidden;
}

.gallery.random {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    padding: 24px;
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
    background: #e0e0e0;
}

.skeleton-img {
    width: 100%;
    height: 100%;
    background: #ccc;
    animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
    0% {
        background-color: #e0e0e0;
    }

    50% {
        background-color: #c0c0c0;
    }

    100% {
        background-color: #e0e0e0;
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
</style>