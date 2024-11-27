<template>
    <div class="gallery">
        <!-- 实际内容 -->
        <div v-for="(group, date) in groupedPhotos" :key="date" class="date-group">
            <h3>{{ group.date }}</h3>
            <div class="photos">
                <div v-for="(photo, idx) in group.items" :key="idx" class="photo-item"
                    @click="photo.isVideo ? playVideo(photo) : previewImage(photo, idx)">
                    <img v-if="!photo.isVideo" :src="photo.src" :alt="photo.alt" />
                    <div v-else class="video-thumbnail">
                        <div class="play-icon"><i class="fa-solid fa-play"></i></div>
                        <video :src="photo.src[0]" class="plyr" muted preload="metadata"></video>
                        <span class="duration">{{ formatDuration(parseFloat(photo.duration)) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 骨架屏 - -->
        <div v-if="loading" class="date-group">
            <div class="skeleton-text" style="width: 120px; height: 20px; margin-bottom: 16px;"></div>
            <div class="photos">
                <div v-for="i in 12" :key="i" class="photo-item skeleton">
                    <div class="skeleton-img"></div>
                </div>
            </div>
        </div>

        <!-- 加载更多按钮 -->
        <div class="load-more" v-if="!loading && hasMore">
            <button @click="loadMore">加载更多 <i class="fas fa-chevron-down"></i></button>
        </div>

        <div v-if="currentVideo" class="video-modal" @click.self="closeMedia">
            <div class="dplayer-container"></div>
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

        <!-- 密码输入框 -->
        <div v-if="showPasswordPrompt" class="modal-overlay" @click="closePasswordPrompt">
            <div class="password-modal" @click.stop>
                <h3>该文件夹受密码保护</h3>
                <input v-model="password" type="password" placeholder="输入密码" required="true" />
                <button @click="submitPassword">提交</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import DPlayer from 'dplayer';
const route = useRoute();
const folderId = ref(null);
const showPasswordPrompt = ref(false);
const password = ref("");
const groupedPhotos = ref([]);
const currentVideo = ref(null);
const currentImage = ref(null);
const currentIndex = ref(null); 
const loading = ref(false);
const page = ref(1); 
const plyrInstance = ref(null); 
const currentSrcIndex = ref(0); 
const searchQuery = ref("");
const limit = ref(12); 
const hasMore = ref(true);
const dplayerInstance = ref(null);

watch(currentVideo, async () => {
    if (currentVideo.value && currentVideo.value.isVideo) {
        await nextTick();
        initializeDPlayer();
    }
});

function initializeDPlayer() {
    if (dplayerInstance.value) {
        dplayerInstance.value.destroy();
    }

    dplayerInstance.value = new DPlayer({
        container: document.querySelector('.dplayer-container'),
        video: {
            url: currentVideo.value.src[currentSrcIndex.value],
        },
        autoplay: true,
    });

    // 监听时间更新事件，提前加载下一个片段
    dplayerInstance.value.on('timeupdate', () => {
        const currentTime = dplayerInstance.value.video.currentTime;
        const duration = dplayerInstance.value.video.duration;

        // 如果播放接近尾声，预加载下一段
        if (duration - currentTime < 20) {
            preloadNextSegment();
        }
    });

    // 监听播放结束事件，切换到下一段
    dplayerInstance.value.on('ended', handleVideoEnd);
}
function preloadNextSegment() {
    if (Array.isArray(currentVideo.value.src) && currentSrcIndex.value < currentVideo.value.src.length - 1) {
        const nextSegment = document.createElement('video');
        nextSegment.src = currentVideo.value.src[currentSrcIndex.value + 1];
        nextSegment.preload = 'auto'; // 提前预加载下一段
    }
}
onUnmounted(() => {
    if (plyrInstance.value) {
        plyrInstance.value.destroy();
    }
});
function handleVideoEnd() {
    // 如果还有下一段视频
    if (Array.isArray(currentVideo.value.src) && currentSrcIndex.value < currentVideo.value.src.length - 1) {
        currentSrcIndex.value += 1; // 切换到下一个地址
        dplayerInstance.value.switchVideo({
            url: currentVideo.value.src[currentSrcIndex.value],
        });
        dplayerInstance.value.play(); // 自动播放下一段视频
    } else {
        // 如果所有片段播放完毕
        currentSrcIndex.value = 0; // 重置索引
        dplayerInstance.value.pause(); // 暂停播放器（如果需要）
    }
}

function closeMedia() {
    if (dplayerInstance.value) {
        dplayerInstance.value.destroy();
    }
    currentVideo.value = null;
    currentSrcIndex.value = 0;
}
async function fetchPhotos(page) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=photos&page=${page}&limit=${limit.value}&folder_id=${folderId.value}&password=${password.value}&search=${searchQuery.value}`);
        if (!response.ok) throw new Error('网络请求失败');
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        if (data.length === 0) {
            hasMore.value = false;
            return;
        }
        showPasswordPrompt.value = false;
        const newPhotos = data.map(group => ({
            date: group.date,
            items: group.items.map(item => ({
                src: item.isVideo ? item.src.split('\n') : item.src,
                alt: item.alt,
                isVideo: item.isVideo || false,
                duration: item.duration || null,
                thumbnail: item.thumbnail || null,
            })),
        }));
        groupedPhotos.value = [...groupedPhotos.value, ...newPhotos];
    } catch (error) {
        console.error("获取照片数据失败:", error);
    } finally {
        loading.value = false;
    }
}
// 加载更多方法
function loadMore() {
    if (!loading.value && hasMore.value) {
        page.value += 1; // 增加页码
        fetchPhotos(page.value); // 加载下一页数据
    }
}

function playVideo(photo) {
    if (photo.isVideo) {
        currentVideo.value = photo;
    }
}

function previewImage(photo, index) {
    currentImage.value = photo;
    currentIndex.value = groupedPhotos.value.flatMap(group => group.items).findIndex(item => item.src === photo.src);
}

function closeImage() {
    currentImage.value = null;
    currentIndex.value = null;
}

function nextImage() {
    if (currentIndex.value !== null) {
        const allItems = groupedPhotos.value.flatMap(group => group.items); // 展平所有图片和视频
        let nextIndex = (currentIndex.value + 1) % allItems.length; // 计算下一项索引
        // 跳过视频
        while (allItems[nextIndex].isVideo) {
            nextIndex = (nextIndex + 1) % allItems.length;
        }
        currentIndex.value = nextIndex; // 更新索引
        currentImage.value = allItems[currentIndex.value]; // 更新当前图片
    }
}

function previousImage() {
    if (currentIndex.value !== null) {
        const allItems = groupedPhotos.value.flatMap(group => group.items); // 展平所有图片和视频
        let prevIndex = (currentIndex.value - 1 + allItems.length) % allItems.length; // 计算上一项索引
        // 跳过视频
        while (allItems[prevIndex].isVideo) {
            prevIndex = (prevIndex - 1 + allItems.length) % allItems.length;
        }
        currentIndex.value = prevIndex; // 更新索引
        currentImage.value = allItems[currentIndex.value]; // 更新当前图片
    }
}

function closeVideo() {
    currentVideo.value = null;
}

function formatDuration(duration) {
    const totalSeconds = Math.floor(duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function submitPassword() {
    if (password.value) {
        fetchPhotos(page.value);
    } else {
        alert('请输入密码');
    }
}
watch(
    () => route.query.search,
    (newSearch) => {
        searchQuery.value = newSearch;
        groupedPhotos.value = [];
        fetchPhotos(page.value);
    }
);
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
    const folderParam = route.query.folder_id;
    const isPassword = route.query.ispassword === 'true';
    searchQuery.value = route.query.search || '';
    setLimitBasedOnScreenSize();
    if (folderParam) {
        folderId.value = folderParam;
    }
    if (isPassword) {
        showPasswordPrompt.value = true;
    } else {
        fetchPhotos(page.value);
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
    background: rgba(0, 0, 0, 0.8);
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
.gallery {
    padding: 16px;
}

.date-group {
    margin-bottom: 24px;
}

.date-group h3 {
    margin-bottom: 16px;
    color: var(--text-secondary);
}

.photos {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.photo-item {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    aspect-ratio: 1;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.photo-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
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

.video-thumbnail {
    position: relative;
    width: 100%;
    height: 100%;
    background: #353535;
}

.play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    color: white;
    z-index: 99;
}

.duration {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

.video-modal,
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

/* 骨架屏样式 */
.skeleton {
    background: var(--bg-secondary);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px var(--shadow-color);
}

.skeleton-text {
    background: var(--skeleton-end);
    border-radius: 4px;
    animation: skeleton-loading 1.5s infinite;
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

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.password-modal {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: center;
    width: 300px;
}

.password-modal h3 {
    margin-bottom: 16px;
    color: #333;
}

.password-modal input {
    width: 90%;
    padding: 10px;
    margin-bottom: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.password-modal button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.password-modal button:hover {
    background-color: #0056b3;
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
.video-thumbnail video{
    width: 100%;
    height: 100%;
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