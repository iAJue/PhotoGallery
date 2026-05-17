<template>
    <div class="header" :class="{ hidden: isHeaderHidden }">
        <div class="search-icon" @click="toggleSearchModal">
            <i class="fas fa-search"></i>
        </div>
        <div ref="tabsRef" class="tabs">
            <div class="tab-indicator" :style="indicatorStyle"></div>
            <router-link
                v-for="tab in tabs"
                :key="tab.to"
                :to="tab.to"
                :ref="(el) => setTabRef(el, tab.to)"
                class="tab"
                :class="{ active: route.path === tab.to }"
            >
                {{ tab.label }}
            </router-link>
        </div>
        <div class="more-icon" @click="toggleDropdown" @mouseover="showDropdown = true"
            @mouseleave="showDropdown = false">
            <i class="fas fa-ellipsis-h"></i>
            <transition name="dropdown-fade">
                <div v-if="showDropdown" class="dropdown-menu">
                    <div @click="$emit('toggle-dark-mode')">
                        <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
                        {{ isDarkMode ? '浅色模式' : '深色模式' }}
                    </div>
                    <a href="https://github.com/iAJue/PhotoGallery" target="_blank"><i class="fab fa-github"></i> GitHub</a>
                    <a href="https://jq.qq.com/?_wv=1027&k=5cvR0GN" target="_blank"><i class="fas fa-users"></i> 社区官群</a>
                    <a href="http://moejue.cn/" target="_blank"><i class="fas fa-blog"></i> 博客</a>
                    <div @click="toggleAboutModal"><i class="fas fa-info-circle"></i> 关于</div>
                </div>
            </transition>
        </div>
    </div>
    <transition name="search-modal-fade">
        <div v-if="showSearchModal" class="search-modal" @click.self="toggleSearchModal">
            <input
                type="text"
                class="search-input"
                placeholder="搜索照片或相册..."
                v-model="searchQuery"
                @keyup.enter="navigateToPhotos"
                ref="searchInput"
            />
        </div>
    </transition>
    <div v-if="showAboutModal" class="about-modal" @click.self="toggleAboutModal">
        <div class="about-content">
            <h2>关于我们</h2>
            <p>这里是阿珏酱的私人相册,保存着阿珏在平常收集的图片,和各大平台中点赞收藏的视频.</p>
            <p>包括但不限于B站,YouTube,抖音,X,facebook,pixiv等平台的视频或图片,相关的数据信息版权归原作者所有.</p>
            <p>数据将不定期手动更新,并且存在10分钟的缓存,如果你想要某些图片或者视频,请直接联系阿珏酱获取.</p>
            <button @click="toggleAboutModal">关闭</button>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// 添加 props 定义
defineProps({
    isDarkMode: Boolean
});
defineEmits(['toggle-dark-mode']);

const searchQuery = ref(''); 
const router = useRouter();
const route = useRoute();
const showSearchModal = ref(false);
const showDropdown = ref(false);
const showAboutModal = ref(false);
const searchInput = ref(null);
const tabsRef = ref(null);
const tabRefs = ref({});
const isHeaderHidden = ref(false);
const lastScrollY = ref(0);
const tabs = [
    { to: '/photos', label: '照片' },
    { to: '/albums', label: '相册' },
    { to: '/random', label: '随机' },
    { to: '/short', label: 'Short' },
];

const indicatorStyle = computed(() => {
    const activeTab = tabRefs.value[route.path];
    const tabsEl = tabsRef.value;

    if (!activeTab || !tabsEl) {
        return {
            opacity: 0,
            width: '0px',
            transform: 'translateX(0px)',
        };
    }

    return {
        opacity: 1,
        width: `${activeTab.offsetWidth}px`,
        transform: `translateX(${activeTab.offsetLeft - tabsEl.scrollLeft - 4}px)`,
    };
});

function setTabRef(el, path) {
    const target = el?.$el || el;

    if (target) {
        tabRefs.value[path] = target;
    }
}

function navigateToPhotos() {
    if (searchQuery.value.trim()) {
        toggleSearchModal()
        router.push({ name: 'Photos', query: { search: searchQuery.value } });
    }
}

async function toggleSearchModal() {
    showSearchModal.value = !showSearchModal.value;
    if (showSearchModal.value) {
        isHeaderHidden.value = false;
        await nextTick();
        searchInput.value.focus();
    }
}

function toggleDropdown() {
    showDropdown.value = !showDropdown.value;
}

function toggleAboutModal() {
    showAboutModal.value = !showAboutModal.value;
}

function syncIndicator() {
    tabRefs.value = { ...tabRefs.value };
}

function handleScroll() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY.value;

    if (showSearchModal.value || showAboutModal.value) {
        isHeaderHidden.value = false;
        lastScrollY.value = currentScrollY;
        return;
    }

    if (currentScrollY <= 24) {
        isHeaderHidden.value = false;
    } else if (scrollDelta > 8) {
        isHeaderHidden.value = true;
    } else if (scrollDelta < -8) {
        isHeaderHidden.value = false;
    }

    lastScrollY.value = currentScrollY;
}

onMounted(() => {
    lastScrollY.value = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', syncIndicator);
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', syncIndicator);
});

watch(() => route.path, async () => {
    isHeaderHidden.value = false;
    await nextTick();
    syncIndicator();
}, { immediate: true });
</script>

<style scoped>
.header {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: min(780px, calc(100vw - 28px));
    min-height: 68px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 999px;
    background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.62)),
        rgba(255, 255, 255, 0.65);
    backdrop-filter: blur(22px) saturate(160%);
    box-shadow:
        0 18px 45px rgba(15, 23, 42, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    z-index: 120;
    transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease, box-shadow 0.28s ease;
}

.header.hidden {
    transform: translate(-50%, -110%);
    opacity: 0;
    pointer-events: none;
}

.search-icon,
.more-icon {
    position: relative;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    font-size: 17px;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 50%;
    transition: transform 0.26s ease, background-color 0.26s ease, color 0.26s ease, box-shadow 0.26s ease;
    background: rgba(255, 255, 255, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.54);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.search-icon:hover,
.more-icon:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.62);
    color: var(--primary-blue);
    box-shadow:
        0 10px 20px rgba(59, 130, 246, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.tabs {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    padding: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.46);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.tab-indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--primary-blue), color-mix(in srgb, var(--primary-blue) 70%, #8ec5ff 30%));
    box-shadow:
        0 10px 24px rgba(59, 130, 246, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.26);
    transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), width 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
    z-index: 0;
}

.tab {
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 11px 18px;
    text-align: center;
    color: var(--text-secondary);
    cursor: pointer;
    position: relative;
    transition: color 0.26s ease, transform 0.26s ease;
    font-weight: 600;
    font-size: 15px;
    text-decoration: none;
    border-radius: 999px;
    white-space: nowrap;
}

.tab:hover {
    color: var(--text-primary);
    transform: translateY(-1px);
}

.tab.active {
    color: #ffffff;
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 14px);
    right: 0;
    width: 188px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.76);
    backdrop-filter: blur(22px) saturate(160%);
    box-shadow: 0 24px 46px rgba(15, 23, 42, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 20px;
    overflow: hidden;
    z-index: 200;
    text-align: left;
}

.dropdown-menu a,
.dropdown-menu div {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    color: var(--text-primary);
    text-decoration: none;
    font-size: 14px;
    cursor: pointer;
    border-radius: 14px;
    transition: background 0.22s ease, color 0.22s ease, transform 0.22s ease;
}

.dropdown-menu a:hover,
.dropdown-menu div:hover {
    transform: translateX(2px);
    background: rgba(255, 255, 255, 0.56);
    color: var(--primary-blue);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
    transform-origin: top right;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
}

.search-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(241, 245, 249, 0.32);
    backdrop-filter: blur(14px);
    display: flex;
    justify-content: center;
    padding-top: 200px;
    z-index: 200;
}

.search-input {
    height: 26px;
    width: min(720px, calc(100vw - 34px));
    padding: 18px 24px;
    border: 1px solid rgba(255, 255, 255, 0.78);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.78);
    font-size: 16px;
    color: var(--text-primary);
    transition: all 0.3s ease;
    box-shadow:
        0 22px 55px rgba(15, 23, 42, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.search-modal-fade-enter-active,
.search-modal-fade-leave-active {
    transition: opacity 0.28s ease, backdrop-filter 0.28s ease;
}

.search-modal-fade-enter-active .search-input,
.search-modal-fade-leave-active .search-input {
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, box-shadow 0.32s ease;
}

.search-modal-fade-enter-from,
.search-modal-fade-leave-to {
    opacity: 0;
    backdrop-filter: blur(0px);
}

.search-modal-fade-enter-from .search-input,
.search-modal-fade-leave-to .search-input {
    opacity: 0;
    transform: translateY(-18px) scale(0.96);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.search-modal-fade-enter-to .search-input,
.search-modal-fade-leave-from .search-input {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.search-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.94);
    box-shadow:
        0 26px 60px rgba(15, 23, 42, 0.16),
        0 0 0 4px color-mix(in srgb, var(--primary-blue) 10%, transparent);
}

.about-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 300;
}

.about-content {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    padding: 28px;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.72);
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.18);
    width: 90%;
    max-width: 400px;
    text-align: center;
}

.about-content h2 {
    font-size: 24px;
    margin-bottom: 16px;
    color: #1a73e8;
}

.about-content p {
    font-size: 16px;
    color: #555;
    margin-bottom: 24px;
}

.about-content button {
    background: #1a73e8;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.3s ease;
}

.about-content button:hover {
    background: #155ab5;
}

/* 响应式布局 */
@media (max-width: 768px) {
    .header {
        top: 12px;
        width: calc(100vw - 20px);
        padding: 8px 10px;
        gap: 8px;
    }

    .tabs {
        gap: 4px;
        justify-content: flex-start;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .tabs::-webkit-scrollbar {
        display: none;
    }

    .tab {
        padding: 10px 13px;
        font-size: 14px;
        white-space: nowrap;
    }

    .search-input {
        width: calc(100vw - 24px);
        padding: 16px 20px;
    }

    .search-icon,
    .more-icon {
        width: 42px;
        height: 42px;
        font-size: 15px;
    }

    .dropdown-menu {
        top: calc(100% + 10px);
        width: 172px;
    }
}
</style>
