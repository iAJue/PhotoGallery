<template>
    <div class="photos-page">
        <div v-for="(group, groupIndex) in groupedPhotos" :key="`${group.date}-${groupIndex}`" class="date-group">
            <div class="group-heading">
                <div>
                    <h3>{{ group.date }}</h3>
                </div>
            </div>

            <div class="photos">
                <div
                    v-for="(photo, idx) in group.items"
                    :key="`${group.date}-${idx}`"
                    class="photo-item"
                    :class="{ 'is-video': photo.isVideo }"
                    @click="photo.isVideo ? playVideo(photo) : previewImage(photo)"
                >
                    <img v-if="!photo.isVideo" :src="photo.src" :alt="photo.alt" loading="lazy" decoding="async" />
                    <div v-else class="video-thumbnail">
                        <video :src="photo.src[0]" class="plyr" muted preload="metadata"></video>
                    </div>

                    <div class="photo-overlay">
                        <div class="photo-chip">
                            <i :class="photo.isVideo ? 'fa-solid fa-play' : 'fa-regular fa-image'"></i>
                            <span>{{ photo.isVideo ? 'Video' : 'Photo' }}</span>
                        </div>
                        <span v-if="photo.isVideo" class="duration">{{ formatDuration(parseFloat(photo.duration)) }}</span>
                    </div>

                    <div v-if="photo.alt" class="photo-caption">
                        <span>{{ photo.alt }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="loading" class="date-group skeleton-group">
            <div class="group-heading">
                <div>
                    <div class="skeleton-text heading-kicker"></div>
                    <div class="skeleton-text heading-title"></div>
                </div>
                <div class="skeleton-pill"></div>
            </div>
            <div class="photos">
                <div v-for="i in 8" :key="i" class="photo-item skeleton">
                    <div class="skeleton-img"></div>
                </div>
            </div>
        </div>

        <div v-if="!loading && !hasMore && !allItems.length" class="empty-state">
            <h3>这里暂时还没有内容</h3>
            <p>换个关键词试试，或者稍后再回来看看。</p>
        </div>

        <div class="load-more" v-if="!loading && hasMore">
            <button type="button" @click="loadMore">
                <span>继续浏览</span>
                <i class="fas fa-arrow-down"></i>
            </button>
        </div>

        <div v-if="currentVideo" class="video-modal" @click.self="closeVideoPreview">
            <div class="dplayer-shell">
                <div class="dplayer-container" ref="dplayerContainer"></div>
            </div>
        </div>

        <div v-if="currentImage" class="image-modal" @click.self="closeImage">
            <img
                :src="currentImage.src"
                :alt="currentImage.alt"
                @swipeleft="nextImage"
                @swiperight="previousImage"
                loading="lazy"
                decoding="async"
            />
            <button class="nav-button left" type="button" @click.stop="previousImage">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="nav-button right" type="button" @click.stop="nextImage">
                <i class="fas fa-chevron-right"></i>
            </button>
            <button class="close-icon" type="button" @click="closeImage">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div v-if="showPasswordPrompt" class="modal-overlay" @click="closePasswordPrompt">
            <div class="password-modal" @click.stop>
                <span class="password-kicker">PRIVATE ACCESS</span>
                <h3>这个相册需要访问密码</h3>
                <p>输入密码后就可以继续查看当前文件夹内容。</p>
                <input v-model="password" type="password" placeholder="输入密码" required="true" />
                <button type="button" @click="submitPassword">进入相册</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { formatDuration } from '../utils/format';
import { useImagePreviewControls } from '../composables/useImagePreview';
import { useModalKeydown } from '../composables/useModalKeydown';
import { useDPlayerPreview } from '../composables/useDPlayerPreview';

const route = useRoute();
const folderId = ref(null);
const showPasswordPrompt = ref(false);
const password = ref('');
const groupedPhotos = ref([]);
const currentVideo = ref(null);
const currentImage = ref(null);
const currentIndex = ref(null);
const loading = ref(false);
const page = ref(1);
const currentSrcIndex = ref(0);
const searchQuery = ref('');
const limit = ref(12);
const hasMore = ref(true);
const dplayerContainer = ref(null);

const allItems = computed(() => groupedPhotos.value.flatMap(group => group.items));

const { openImage, closeImage, nextImage, previousImage } = useImagePreviewControls({
    currentImage,
    currentIndex,
    getItems: () => allItems.value,
    isImage: (item) => !item.isVideo,
});

const { handleKeyDown } = useModalKeydown({
    isImageOpen: () => !!currentImage.value,
    isVideoOpen: () => !!currentVideo.value,
    closeImage,
    closeVideo: () => closeVideoPreview(),
    nextImage,
    previousImage,
});

const { openMedia: openVideoPreview, closeMedia: closeVideoPreview } = useDPlayerPreview({
    containerRef: dplayerContainer,
    currentMedia: currentVideo,
    currentSrcIndex,
});

async function fetchPhotos(targetPage) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=photos&page=${targetPage}&limit=${limit.value}&folder_id=${folderId.value}&password=${password.value}&search=${searchQuery.value}`);
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
        console.error('获取照片数据失败:', error);
    } finally {
        loading.value = false;
    }
}

function resetGalleryState() {
    page.value = 1;
    hasMore.value = true;
    groupedPhotos.value = [];
}

function loadMore() {
    if (!loading.value && hasMore.value) {
        page.value += 1;
        fetchPhotos(page.value);
    }
}

function playVideo(photo) {
    if (photo.isVideo) {
        openVideoPreview(photo);
    }
}

function previewImage(photo) {
    const idx = allItems.value.findIndex(item => item.src === photo.src);
    if (idx !== -1) openImage(idx);
}

function submitPassword() {
    if (password.value) {
        resetGalleryState();
        fetchPhotos(page.value);
    } else {
        alert('请输入密码');
    }
}

function closePasswordPrompt() {
    showPasswordPrompt.value = false;
}

function syncRouteState() {
    folderId.value = route.query.folder_id || null;
    searchQuery.value = route.query.search || '';
}

watch(
    () => [route.query.folder_id, route.query.search, route.query.ispassword],
    ([newFolderId, newSearch, newIsPassword], [oldFolderId, oldSearch, oldIsPassword]) => {
        if (newFolderId === oldFolderId && newSearch === oldSearch && newIsPassword === oldIsPassword) {
            return;
        }

        folderId.value = newFolderId || null;
        searchQuery.value = newSearch || '';
        password.value = '';
        resetGalleryState();
        closeImage();
        closeVideoPreview();

        if (newIsPassword === 'true') {
            showPasswordPrompt.value = true;
            return;
        }

        showPasswordPrompt.value = false;
        fetchPhotos(page.value);
    }
);

function setLimitBasedOnScreenSize() {
    const screenWidth = window.innerWidth;
    if (screenWidth >= 2560) {
        limit.value = 50;
    } else if (screenWidth >= 1200) {
        limit.value = 40;
    } else if (screenWidth >= 768) {
        limit.value = 15;
    } else {
        limit.value = 10;
    }
}

onMounted(() => {
    syncRouteState();
    setLimitBasedOnScreenSize();

    if (route.query.ispassword === 'true') {
        showPasswordPrompt.value = true;
    } else {
        fetchPhotos(page.value);
    }

    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.photos-page {
    --card-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    --card-shadow-hover: 0 24px 48px rgba(15, 23, 42, 0.16);
    max-width: 1280px;
    margin: 0 auto;
    padding: 96px 24px 48px;
    color: var(--text-primary);
}

.password-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.14em;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-secondary);
}

.date-group {
    margin-bottom: 32px;
}

.group-heading {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}

.group-heading h3 {
    margin: 0;
    font-size: clamp(20px, 2.4vw, 28px);
    line-height: 1.1;
    letter-spacing: -0.03em;
}

.photos {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    grid-auto-flow: dense;
    grid-auto-rows: 4px;
    gap: 16px;
}

.photo-item {
    position: relative;
    grid-column: span 1;
    grid-row: span 12;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    isolation: isolate;
    background: color-mix(in srgb, var(--bg-secondary) 80%, transparent);
    box-shadow: var(--card-shadow);
    transition: transform 0.32s ease, box-shadow 0.32s ease, border-color 0.32s ease;
}

.photo-item:nth-child(7n + 1) {
    grid-column: span 2;
    grid-row: span 16;
}

.photo-item:nth-child(7n + 4) {
    grid-column: span 2;
    grid-row: span 12;
}

.photo-item:nth-child(9n + 6) {
    grid-row: span 18;
}

.photo-item:hover {
    transform: translateY(-6px);
    box-shadow: var(--card-shadow-hover);
}

.photo-item::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    pointer-events: none;
}

.photo-item img,
.video-thumbnail,
.video-thumbnail video,
.skeleton-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.photo-item img,
.video-thumbnail video {
    transition: transform 0.4s ease;
}

.photo-item:hover img,
.photo-item:hover .video-thumbnail video {
    transform: scale(1.04);
}

.video-thumbnail {
    position: relative;
    background: #111111;
}

.video-thumbnail::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(17, 17, 17, 0.06), rgba(17, 17, 17, 0.35));
}

.photo-overlay,
.photo-caption {
    position: absolute;
    z-index: 2;
    left: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    transition: opacity 0.28s ease, transform 0.28s ease;
}

.photo-overlay {
    top: 12px;
}

.photo-caption {
    bottom: 12px;
    justify-content: flex-start;
}

.photo-caption span {
    max-width: min(100%, 320px);
    padding: 8px 12px;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(14px);
    color: #ffffff;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.photo-chip,
.duration {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    backdrop-filter: blur(14px);
    font-size: 11px;
    border: 1px solid rgba(255, 255, 255, 0.18);
}

.photo-chip {
    font-weight: 600;
}

.photo-item.is-video .photo-chip {
    background: rgba(15, 23, 42, 0.28);
}

.video-modal,
.image-modal,
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.76);
    backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-modal,
.image-modal {
    padding: 24px;
}

.dplayer-shell {
    width: min(1120px, 100%);
    display: flex;
    justify-content: center;
}

.dplayer-container {
    width: auto;
    height: auto;
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

.image-modal img {
    max-width: min(92vw, 1360px);
    max-height: 90vh;
    border-radius: 18px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

.nav-button,
.close-icon {
    position: absolute;
    border: none;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
    cursor: pointer;
    transition: transform 0.2s ease, background-color 0.2s ease;
}

.nav-button {
    top: 50%;
    transform: translateY(-50%);
    width: 52px;
    height: 52px;
    border-radius: 50%;
    font-size: 20px;
}

.nav-button.left {
    left: 24px;
}

.nav-button.right {
    right: 24px;
}

.nav-button:hover {
    transform: translateY(-50%) scale(1.04);
    background: rgba(255, 255, 255, 0.2);
}

.close-icon {
    top: 22px;
    right: 22px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    font-size: 22px;
}

.close-icon:hover {
    transform: scale(1.04);
    background: rgba(255, 255, 255, 0.2);
}

.skeleton-group .group-heading {
    margin-bottom: 20px;
}

.skeleton,
.password-modal {
    box-sizing: border-box;
}

.skeleton {
    background: var(--bg-secondary);
}

.skeleton-text,
.skeleton-pill,
.skeleton-img {
    background: linear-gradient(90deg, var(--skeleton-start), var(--skeleton-end), var(--skeleton-start));
    background-size: 200% 100%;
    animation: skeleton-loading 1.4s ease infinite;
}

.heading-kicker {
    width: 100px;
    height: 14px;
    border-radius: 999px;
}

.heading-title {
    width: 170px;
    height: 34px;
    margin-top: 12px;
    border-radius: 14px;
}

.skeleton-pill {
    width: 110px;
    height: 42px;
    border-radius: 999px;
}

.photo-item.skeleton {
    grid-column: span 1;
    grid-row: span 12;
    border-radius: 20px;
    overflow: hidden;
}

.load-more {
    display: flex;
    justify-content: center;
    margin-top: 8px;
}

.load-more button {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    min-height: 54px;
    padding: 0 24px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--text-primary), color-mix(in srgb, var(--text-primary) 76%, #3b82f6 24%));
    color: var(--bg-primary);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.load-more button:hover {
    transform: translateY(-3px);
    box-shadow: 0 24px 42px rgba(15, 23, 42, 0.2);
}

.empty-state {
    padding: 56px 24px;
    text-align: center;
    border-radius: 28px;
    background: color-mix(in srgb, var(--bg-secondary) 92%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent);
}

.empty-state h3 {
    margin: 0 0 10px;
    font-size: 24px;
}

.empty-state p {
    margin: 0;
    color: var(--text-secondary);
}

.password-modal {
    width: min(420px, calc(100vw - 32px));
    padding: 30px;
    border-radius: 28px;
    background:
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 36%),
        var(--modal-bg);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
    text-align: left;
}

.password-modal h3 {
    margin: 12px 0 10px;
    font-size: 28px;
    line-height: 1.15;
}

.password-modal p {
    margin: 0 0 20px;
    color: var(--text-secondary);
    line-height: 1.7;
}

.password-modal input {
    width: 100%;
    height: 52px;
    padding: 0 16px;
    margin-bottom: 14px;
    border: 1px solid color-mix(in srgb, var(--border-color) 92%, transparent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--bg-secondary) 86%, transparent);
    color: var(--text-primary);
    font-size: 15px;
    box-sizing: border-box;
}

.password-modal input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--primary-blue) 50%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-blue) 12%, transparent);
}

.password-modal button {
    width: 100%;
    height: 50px;
    border: none;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--primary-blue), var(--hover-blue));
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
}

@keyframes skeleton-loading {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

@media (max-width: 1100px) {
    .photos {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-auto-rows: 4px;
    }
}

@media (max-width: 768px) {
    .photos-page {
        padding: 84px 14px 40px;
    }

    .group-heading {
        align-items: flex-start;
        flex-direction: column;
    }

    .photos {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    .photo-item {
        grid-column: span 1;
        grid-row: span 10;
        border-radius: 18px;
    }

    .photo-item:nth-child(7n + 1),
    .photo-item:nth-child(7n + 4),
    .photo-item:nth-child(9n + 6),
    .photo-item.skeleton {
        grid-column: span 1;
    }

    .photo-item:nth-child(7n + 1),
    .photo-item:nth-child(9n + 6) {
        grid-row: span 14;
    }

    .photo-item:nth-child(7n + 4),
    .photo-item.skeleton {
        grid-row: span 10;
    }

    .photo-item::after {
        border-radius: 18px;
    }

    .photo-caption {
        left: 12px;
        right: 12px;
        bottom: 12px;
    }

    .photo-overlay {
        left: 12px;
        right: 12px;
        top: 12px;
    }

    .photo-chip,
    .duration {
        padding: 0 10px;
        font-size: 11px;
    }

    .nav-button {
        width: 46px;
        height: 46px;
    }

    .nav-button.left {
        left: 12px;
    }

    .nav-button.right {
        right: 12px;
    }

    .close-icon {
        top: 12px;
        right: 12px;
    }

    .password-modal {
        padding: 24px 20px;
        border-radius: 22px;
    }

    .password-modal h3 {
        font-size: 24px;
    }
}
</style>
