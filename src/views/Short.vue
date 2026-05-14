<template>
    <div class="short-page">
        <section class="profile-hero" :style="heroStyle">
            <div class="hero-overlay">
                <div class="hero-content">
                    <img :src="profile.avatar" :alt="profile.nickname" class="avatar" />
                    <div class="profile-copy">
                        <div class="name-row">
                            <h1>{{ profile.nickname }}</h1>
                            <span class="handle">@{{ profile.handle }}</span>
                        </div>
                        <p class="profile-bio">{{ profile.bio }}</p>
                        <div class="profile-stats">
                            <div v-for="stat in profile.stats" :key="stat.label" class="stat-item">
                                <strong>{{ stat.value }}</strong>
                                <span>{{ stat.label }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <a class="follow-action" href="https://moejue.cn/" target="_blank" rel="noopener noreferrer">关注</a>
                    </div>
                </div>
            </div>
        </section>

        <section class="short-toolbar">
            <div class="feed-tabs">
                <div class="feed-tab-indicator" :style="activeTabStyle"></div>
                <button
                    v-for="tab in tabs"
                    :key="tab.value"
                    type="button"
                    class="feed-tab"
                    :class="{ active: activeMode === tab.value }"
                    @click="switchMode(tab.value)"
                >
                    {{ tab.label }}
                </button>
            </div>
        </section>

        <section v-if="loading && !videos.length" class="video-grid skeleton-grid">
            <div v-for="item in pageSize" :key="item" class="video-card skeleton-card">
                <div class="skeleton-cover"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
            </div>
        </section>

        <section v-else class="video-grid">
            <article
                v-for="video in videos"
                :key="video.id"
                class="video-card"
                @click="playVideo(video)"
            >
                <div class="video-cover">
                    <img :src="video.cover" :alt="video.title" loading="lazy" />
                    <div class="play-badge">
                        <i class="fa-solid fa-play"></i>
                    </div>
                    <span class="duration-badge">{{ formatDuration(video.durationSeconds) }}</span>
                    <div class="video-mask">
                        <div class="mask-top">
                            <div class="author-chip">
                                <img :src="video.authorAvatar" :alt="video.authorName" />
                                <span>{{ video.authorName }}</span>
                            </div>
                            <span>{{ formatPublishDate(video.publishTime) }}</span>
                        </div>
                        <div class="mask-bottom">
                            <span><i class="fa-solid fa-heart"></i> {{ formatCount(video.likes) }}</span>
                            <span><i class="fa-regular fa-message"></i> {{ formatCount(video.comments) }}</span>
                        </div>
                        <div class="video-title-overlay">
                            <h3>{{ video.title || '无标题' }}</h3>
                        </div>
                    </div>
                    <div v-if="loadingVideoId === video.id" class="loading-mask">加载中...</div>
                </div>
            </article>
        </section>

        <div v-if="!loading && !videos.length" class="empty-state">暂无数据</div>

        <div ref="sentinelRef" class="scroll-sentinel">
            <span v-if="loadingMore">加载中...</span>
            <span v-else-if="!hasMore && videos.length">已经到底了</span>
        </div>

        <div v-if="currentVideo" class="video-modal" @click.self="closeVideoPreview">
            <div class="video-player-shell">
                <button type="button" class="close-button" @click="closeVideoPreview">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div ref="dplayerContainer" class="dplayer-container"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDPlayerPreview } from '../composables/useDPlayerPreview';
import { useModalKeydown } from '../composables/useModalKeydown';

const apiBase = 'https://photo.moejue.cn/api';

const profile = {
    nickname: '阿珏酱',
    handle: 'MoeJue',
    bio: '欢迎来到阿珏酱的短视频世界！这里是我的个人主页，分享我喜爱的Short Videos。',
    avatar: 'https://q2.qlogo.cn/headimg_dl?dst_uin=1638211921&spec=640',
    banner: '/images/3.png',
    stats: [
        { label: '作品', value: '260' },
        { label: '关注', value: '186' },
        { label: '粉丝', value: '12.4w' },
        { label: '获赞', value: '38.9w' },
    ],
};

const tabs = [
    { label: '收藏', value: 'favorite' },
    { label: '随机', value: 'random' },
];

const pageSize = 12;
const activeMode = ref('favorite');
const currentVideo = ref(null);
const currentSrcIndex = ref(0);
const videos = ref([]);
const page = ref(1);
const total = ref(0);
const hasMore = ref(true);
const loading = ref(false);
const loadingMore = ref(false);
const loadingVideoId = ref('');
const sentinelRef = ref(null);
const dplayerContainer = ref(null);
const randomSeed = ref(String(Date.now()));

let observer = null;
let requestToken = 0;

const { handleKeyDown } = useModalKeydown({
    isImageOpen: () => false,
    isVideoOpen: () => !!currentVideo.value,
    closeVideo: () => closeVideoPreview(),
});

const { openMedia: openVideoPreview, closeMedia: closeVideoPreview } = useDPlayerPreview({
    containerRef: dplayerContainer,
    currentMedia: currentVideo,
    currentSrcIndex,
});

const heroStyle = computed(() => ({
    backgroundImage: `linear-gradient(180deg, rgba(15, 15, 15, 0.18), rgba(15, 15, 15, 0.88)), url(${profile.banner})`,
}));

const activeTabStyle = computed(() => {
    const activeIndex = tabs.findIndex(tab => tab.value === activeMode.value);
    const safeIndex = activeIndex === -1 ? 0 : activeIndex;
    return {
        transform: `translateX(${safeIndex * 100}%)`,
    };
});

function formatCount(value) {
    if (value >= 10000) {
        const shortValue = value / 10000;
        return `${shortValue >= 10 ? shortValue.toFixed(0) : shortValue.toFixed(1)}w`;
    }

    return value.toLocaleString('zh-CN');
}

function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainSeconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
}

function formatPublishDate(value) {
    return String(value || '').split(' ')[0];
}

async function getShortVideos(params = {}) {
    const searchParams = new URLSearchParams();
    const {
        mode = 'favorite',
        page = 1,
        seed = '',
    } = params;

    searchParams.set('mode', mode);
    searchParams.set('page', String(page));
    searchParams.set('pageSize', String(pageSize));

    if (seed) {
        searchParams.set('seed', String(seed));
    }

    const response = await fetch(`${apiBase}/short.php?${searchParams.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch short videos');
    }

    return response.json();
}

async function getShortPlayUrl(awemeId) {
    const response = await fetch(`${apiBase}/short_play.php?aweme_id=${encodeURIComponent(awemeId)}`);
    const data = await response.json();

    if (!response.ok && !data.url) {
        throw new Error(data.message || 'Failed to fetch short play url');
    }

    if (!data.url) {
        throw new Error(data.message || 'Play url is empty');
    }

    return data;
}

async function fetchPage(reset = false) {
    if (!reset && (loading.value || loadingMore.value)) {
        return;
    }

    if (reset) {
        requestToken += 1;
        page.value = 1;
        hasMore.value = true;
        videos.value = [];
        total.value = 0;

        if (activeMode.value === 'random') {
            randomSeed.value = String(Date.now());
        }
    }

    if (!hasMore.value) {
        return;
    }

    const currentRequestToken = requestToken;
    const isFirstPage = page.value === 1;

    if (isFirstPage) {
        loading.value = true;
    } else {
        loadingMore.value = true;
    }

    try {
        const data = await getShortVideos({
            mode: activeMode.value,
            page: page.value,
            seed: activeMode.value === 'random' ? randomSeed.value : '',
        });

        if (currentRequestToken !== requestToken) {
            return;
        }

        total.value = data.total || 0;
        hasMore.value = Boolean(data.hasMore);
        randomSeed.value = data.seed || randomSeed.value;
        videos.value = reset ? data.items : [...videos.value, ...data.items];
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
}

async function playVideo(video) {
    if (loadingVideoId.value) {
        return;
    }

    loadingVideoId.value = video.id;

    try {
        const data = await getShortPlayUrl(video.id);
        await openVideoPreview({
            src: data.url,
        });
    } catch (error) {
        console.error('获取播放地址失败:', error);
        alert(`获取播放地址失败: ${error.message || ''}`);
    } finally {
        loadingVideoId.value = '';
    }
}

async function switchMode(mode) {
    if (activeMode.value === mode) {
        return;
    }

    activeMode.value = mode;
    window.scrollTo({ top: 0, behavior: 'auto' });
}

function observeSentinel() {
    if (observer) {
        observer.disconnect();
    }

    if (!sentinelRef.value) {
        return;
    }

    observer = new IntersectionObserver((entries) => {
        const [entry] = entries;

        if (!entry.isIntersecting || loading.value || loadingMore.value || !hasMore.value) {
            return;
        }

        page.value += 1;
        fetchPage();
    }, {
        rootMargin: '240px 0px',
    });

    observer.observe(sentinelRef.value);
}

watch(activeMode, async () => {
    closeVideoPreview();
    await fetchPage(true);
    await nextTick();
    observeSentinel();
});

watch(sentinelRef, () => {
    observeSentinel();
});

onMounted(async () => {
    await fetchPage(true);
    await nextTick();
    observeSentinel();
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    if (observer) {
        observer.disconnect();
    }

    window.removeEventListener('keydown', handleKeyDown);
    closeVideoPreview();
});
</script>

<style scoped>
.short-page {
    min-height: calc(100vh - 68px);
    background: var(--bg-primary);
    color: var(--text-primary);
}

.profile-hero {
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
}

.hero-overlay {
    background: linear-gradient(180deg, rgba(12, 12, 12, 0.12), rgba(12, 12, 12, 0.76));
}

.hero-content {
    max-width: 1240px;
    margin: 0 auto;
    padding: 48px 24px 36px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 24px;
    align-items: end;
}

.avatar {
    width: 112px;
    height: 112px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid rgba(255, 255, 255, 0.88);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
}

.profile-copy {
    min-width: 0;
    color: #ffffff;
}

.name-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}

.name-row h1 {
    margin: 0;
    font-size: 32px;
    line-height: 1.1;
}

.handle {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    font-size: 13px;
}

.profile-bio {
    margin: 0 0 14px;
    max-width: 680px;
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
}

.profile-stats,
.mask-bottom {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.profile-stats {
    gap: 28px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.stat-item strong {
    font-size: 20px;
    color: #ffffff;
}

.stat-item span {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.72);
}

.profile-actions {
    display: flex;
    align-self: center;
}

.follow-action,
.feed-tab,
.close-button {
    border: none;
    cursor: pointer;
    transition: all 0.24s ease;
}

.follow-action {
    min-width: 96px;
    height: 42px;
    padding: 0 20px;
    border-radius: 999px;
    font-size: 14px;
    background: #fe2c55;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
}

.short-toolbar {
    max-width: 1240px;
    margin: 0 auto;
    padding: 18px 24px 24px;
    border-bottom: 1px solid var(--border-color);
}

.feed-tabs {
    position: relative;
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
    gap: 0;
    padding: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    overflow: hidden;
}

.feed-tab-indicator {
    position: absolute;
    top: 4px;
    left: 4px;
    bottom: 4px;
    width: calc((100% - 8px) / 2);
    border-radius: 999px;
    background: var(--text-primary);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.feed-tab {
    position: relative;
    z-index: 1;
    min-width: 92px;
    height: 40px;
    padding: 0 18px;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
}

.feed-tab.active {
    color: var(--bg-primary);
}

.video-grid {
    max-width: 1240px;
    margin: 0 auto;
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
}

.video-card {
    background: var(--bg-primary);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.video-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
}

.video-cover {
    position: relative;
    aspect-ratio: 9 / 16;
    background: #111111;
    overflow: hidden;
}

.video-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.video-mask {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: 12px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.72));
    color: #ffffff;
    transition: background 0.2s ease;
}

.play-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}

.mask-top,
.mask-bottom {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 12px;
}

.mask-top {
    justify-content: space-between;
}

.mask-bottom {
    justify-content: flex-start;
    margin-top: auto;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.video-title-overlay {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
}

.video-title-overlay h3 {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.video-card:hover .video-mask {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.84));
}

.video-card:hover .video-title-overlay {
    opacity: 1;
    transform: translateY(0);
}

.author-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 58%;
}

.author-chip img {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.author-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.duration-badge {
    position: absolute;
    right: 12px;
    bottom: 12px;
    z-index: 2;
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 12px;
    color: #ffffff;
    background: rgba(0, 0, 0, 0.62);
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.video-card:hover .mask-bottom,
.video-card:hover .duration-badge {
    opacity: 0;
    transform: translateY(8px);
}

.loading-mask {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: rgba(0, 0, 0, 0.55);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

.empty-state,
.scroll-sentinel {
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text-secondary);
    font-size: 14px;
}

.empty-state {
    min-height: 160px;
}

.scroll-sentinel {
    height: 56px;
}

.video-modal {
    position: fixed;
    inset: 0;
    z-index: 1100;
    padding: 24px;
    background: rgba(0, 0, 0, 0.82);
    display: flex;
    align-items: center;
    justify-content: center;
}

.video-player-shell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dplayer-container {
    width: auto;
    height: auto;
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.close-button {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    color: #ffffff;
    z-index: 3;
}

.skeleton-grid {
    align-items: start;
}

.skeleton-card {
    padding: 0 0 16px;
}

.skeleton-cover,
.skeleton-line {
    background: var(--skeleton-end);
    animation: skeleton-loading 1.5s infinite;
}

.skeleton-cover {
    aspect-ratio: 9 / 16;
}

.skeleton-line {
    height: 12px;
    margin: 12px 14px 0;
    border-radius: 999px;
}

.skeleton-line.short {
    width: 48%;
}

@keyframes skeleton-loading {
    0% {
        opacity: 0.56;
    }

    50% {
        opacity: 1;
    }

    100% {
        opacity: 0.56;
    }
}

@media (max-width: 900px) {
    .hero-content {
        grid-template-columns: 1fr;
        padding-top: 36px;
    }

    .profile-actions {
        justify-content: flex-start;
    }
}

@media (max-width: 768px) {
    .hero-content,
    .short-toolbar,
    .video-grid {
        padding-left: 16px;
        padding-right: 16px;
    }

    .hero-content {
        gap: 18px;
    }

    .avatar {
        width: 84px;
        height: 84px;
    }

    .name-row h1 {
        font-size: 26px;
    }

    .short-toolbar {
        padding-bottom: 20px;
    }

    .feed-tabs {
        width: 100%;
    }

    .feed-tab {
        min-width: 0;
    }

    .video-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }
}

@media (max-width: 480px) {
    .video-grid {
        grid-template-columns: 1fr;
    }

    .profile-stats {
        gap: 18px;
    }

    .profile-actions {
        width: 100%;
    }

    .follow-action {
        width: 100%;
    }

    .author-chip {
        max-width: 52%;
    }
}
</style>
