<template>
    <div class="gallery random">
        <div class="photo-item" v-for="(randomItem, index) in randomItems" :key="index"
            @click="handleItemClick(randomItem)">
            <img :src="randomItem.src" :alt="randomItem.alt" v-if="!randomItem.isVideo" />
            <div v-else class="video-overlay">
                <div class="play-icon"><i class="fa-solid fa-play"></i></div>
                <video :src="randomItem.src[0]" class="plyr" muted preload="metadata"></video>
                <div class="video-duration">{{ randomItem.duration }}</div>
            </div>
        </div>

        <!-- 骨架屏：加载更多 -->
        <div v-if="loading" class="photo-item skeleton">
            <div class="skeleton-img"></div>
        </div>

        <!-- 图片和视频预览模态框 -->
        <div v-if="currentMedia" class="media-modal" @click.self="closeMedia">
            <div class="video-container" v-if="currentMedia.isVideo">
                <video ref="videoPlayer" class="plyr responsive-video">
                    <source v-for="(src, index) in currentMedia.src" :key="index" :src="src" type="video/mp4" />
                </video>
            </div>
            <img v-else :src="currentMedia.src" :alt="currentMedia.alt" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, onUnmounted, watch, nextTick } from 'vue';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
const randomItems = ref([]);
const loading = ref(false);
const page = ref(1);
const currentMedia = ref(null); // 当前预览的图片或视频
const plyrInstance = ref(null); // Plyr 实例
const videoPlayer = ref(null);
const currentSrcIndex = ref(0); // 用于跟踪当前播放的分段视频索引
const limit = ref(12); 


watch(currentMedia, async () => {
    if (currentMedia.value && currentMedia.value.isVideo) {
        await nextTick();
        plyrInstance.value = new Plyr(videoPlayer.value, {
            controls: ['play', 'progress', 'volume', 'fullscreen'],
            autoplay: true,
        });
        preloadNextSegment();
        plyrInstance.value.on('ended', handleVideoEnd);
    }
});
function preloadNextSegment() {
    if (Array.isArray(currentMedia.value.src) && currentSrcIndex.value < currentMedia.value.src.length - 1) {
        const nextSegment = document.createElement('video');
        nextSegment.src = currentMedia.value.src[currentSrcIndex.value + 1];
        nextSegment.preload = 'auto';
    }
}
onUnmounted(() => {
    if (plyrInstance.value) {
        plyrInstance.value.destroy();
    }
});
function handleVideoEnd() {
    if (Array.isArray(currentMedia.value.src) && currentSrcIndex.value < currentMedia.value.src.length - 1) {
        currentSrcIndex.value += 1;
        plyrInstance.value.source = {
            type: 'video',
            sources: [
                { src: currentMedia.value.src[currentSrcIndex.value], type: 'video/mp4' },
            ],
        };
        plyrInstance.value.play();
        preloadNextSegment();
    } else {
        currentSrcIndex.value = 0;
    }
}
async function shuffleGallery(page) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=random&page=${page}&limit=${limit.value}`);
        if (!response.ok) throw new Error('网络请求失败');

        const data = await response.json();

        if(data.length == 0) {
            window.removeEventListener('scroll', handleScroll);
            return
        }
        const newItems = data.map(item => ({
            src: item.type === 1 ? item.data.split('\n') : item.data,
            alt: item.name,
            isVideo: item.type === 1,
            duration: formatDuration(parseFloat(item.duration)) || null,
            createdAt: item.created_at,
            size: item.size,
            folderId: item.folder_id
        }));

        return newItems;
    } catch (error) {
        console.error("获取随机数据失败:", error);
        return [];
    } finally {
        loading.value = false;
    }
}

async function loadMoreItems() {
    const newItems = await shuffleGallery(page.value);
    randomItems.value.push(...newItems);
    page.value += 1;
}
function formatDuration(duration) {
    const totalSeconds = Math.floor(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function handleScroll() {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 10 && !loading.value) {
        loadMoreItems();
    }
}

function handleItemClick(item) {
    currentMedia.value = item;
}

function closeMedia() {
    if (plyrInstance.value) {
        plyrInstance.value.destroy();
    }
    currentMedia.value = null;
    if (currentMedia.value && currentMedia.value.isVideo) {
        currentSrcIndex.value = 0;
    }
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
    loadMoreItems();
    window.addEventListener('scroll', handleScroll);
});

onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
});

</script>

<style scoped>
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
.video-overlay video{
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
</style>