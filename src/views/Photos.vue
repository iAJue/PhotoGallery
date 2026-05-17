<template>
    <div class="photos-page">
        <MediaGallery
            :key="galleryInstanceKey"
            :groups="groupedPhotos"
            :loading="loading"
            :has-more="hasMore"
            :show-load-more="true"
            @load-more="loadMore"
        />

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
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import MediaGallery from '../components/MediaGallery.vue';

const route = useRoute();
const folderId = ref(null);
const showPasswordPrompt = ref(false);
const password = ref('');
const groupedPhotos = ref([]);
const loading = ref(false);
const page = ref(1);
const searchQuery = ref('');
const limit = 26
const hasMore = ref(true);

const galleryInstanceKey = computed(() => `${folderId.value || 'all'}::${searchQuery.value || ''}`);

async function fetchPhotos(targetPage) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=photos&page=${targetPage}&limit=${limit}&folder_id=${folderId.value}&password=${password.value}&search=${searchQuery.value}`);
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

        if (newIsPassword === 'true') {
            showPasswordPrompt.value = true;
            return;
        }

        showPasswordPrompt.value = false;
        fetchPhotos(page.value);
    }
);

onMounted(() => {
    syncRouteState();

    if (route.query.ispassword === 'true') {
        showPasswordPrompt.value = true;
    } else {
        fetchPhotos(page.value);
    }
});
</script>

<style scoped>
.photos-page {
    padding: 50px 24px 48px;
}

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

.password-modal {
    box-sizing: border-box;
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

@media (max-width: 768px) {
    .photos-page {
        padding: 45px 14px 40px;
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
