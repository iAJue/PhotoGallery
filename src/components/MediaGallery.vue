<template>
    <div class="media-gallery">
        <div
            v-for="(group, groupIndex) in normalizedGroups"
            :key="`${group.date || 'group'}-${groupIndex}`"
            class="date-group"
            :class="{ 'plain-group': !showGroupHeading }"
        >
            <div v-if="showGroupHeading && group.date" class="group-heading">
                <div>
                    <h3>{{ group.date }}</h3>
                </div>
            </div>

            <div class="photos">
                <div
                    v-for="(photo, idx) in group.items"
                    :key="`${group.date || 'group'}-${idx}`"
                    class="photo-item"
                    :class="{ 'is-video': photo.isVideo }"
                    @click="handleItemClick(photo)"
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

        <div v-if="loading" class="date-group skeleton-group" :class="{ 'plain-group': !showGroupHeading }">
            <div v-if="showGroupHeading" class="group-heading">
                <div>
                    <div class="skeleton-text heading-kicker"></div>
                    <div class="skeleton-text heading-title"></div>
                </div>
            </div>
            <div class="photos">
                <div v-for="i in skeletonCount" :key="i" class="photo-item skeleton">
                    <div class="skeleton-img"></div>
                </div>
            </div>
        </div>

        <div v-if="!loading && !allItems.length && !hasMore" class="empty-state">
            <h3>{{ emptyTitle }}</h3>
            <p>{{ emptyDescription }}</p>
        </div>

        <div v-if="showLoadMore && !loading && hasMore" class="load-more">
            <button type="button" @click="$emit('load-more')">
                <span>{{ loadMoreText }}</span>
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
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { formatDuration } from '../utils/format';
import { useImagePreviewControls } from '../composables/useImagePreview';
import { useModalKeydown } from '../composables/useModalKeydown';
import { useDPlayerPreview } from '../composables/useDPlayerPreview';

const props = defineProps({
    groups: {
        type: Array,
        default: () => [],
    },
    loading: {
        type: Boolean,
        default: false,
    },
    hasMore: {
        type: Boolean,
        default: false,
    },
    showLoadMore: {
        type: Boolean,
        default: false,
    },
    showGroupHeading: {
        type: Boolean,
        default: true,
    },
    skeletonCount: {
        type: Number,
        default: 8,
    },
    loadMoreText: {
        type: String,
        default: '继续浏览',
    },
    emptyTitle: {
        type: String,
        default: '这里暂时还没有内容',
    },
    emptyDescription: {
        type: String,
        default: '换个关键词试试，或者稍后再回来看看。',
    },
});

defineEmits(['load-more']);

const dplayerContainer = ref(null);
const currentVideo = ref(null);
const currentImage = ref(null);
const currentIndex = ref(null);
const currentSrcIndex = ref(0);

const normalizedGroups = computed(() => props.groups.map(group => ({
    date: group?.date || '',
    items: Array.isArray(group?.items) ? group.items : [],
})));

const allItems = computed(() => normalizedGroups.value.flatMap(group => group.items));

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

function previewImage(photo) {
    const idx = allItems.value.findIndex(item => item === photo || item.src === photo.src);
    if (idx !== -1) openImage(idx);
}

function handleItemClick(photo) {
    if (photo.isVideo) {
        openVideoPreview(photo);
        return;
    }

    previewImage(photo);
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    closeVideoPreview();
});
</script>

<style scoped>
.media-gallery {
    --card-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    --card-shadow-hover: 0 24px 48px rgba(15, 23, 42, 0.16);
    max-width: 1280px;
    margin: 0 auto;
    color: var(--text-primary);
}

.date-group {
    margin-bottom: 32px;
}

.date-group.plain-group {
    margin-bottom: 24px;
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
.image-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.76);
    backdrop-filter: blur(16px);
    display: flex;
    align-items: center;
    justify-content: center;
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

.skeleton {
    box-sizing: border-box;
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
}
</style>
