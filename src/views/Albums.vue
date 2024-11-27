<template>
    <div class="gallery albums">
        <!-- 骨架屏 -->
        <template v-if="loading">
            <div v-for="i in 12" :key="i" class="album skeleton">
                <div class="album-cover">
                    <div class="skeleton-img"></div>
                </div>
                <div class="album-info">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text" style="width: 60%"></div>
                </div>
            </div>
        </template>

        <!-- 实际内容 -->
        <template v-else>
            <div class="album" v-for="(album, index) in albums" :key="index" @click="handleAlbumClick(album)">
                <div class="album-cover">
                    <div v-if="album.attribute != 0" class="blur-overlay"><i class="fa-solid fa-eye-slash"></i> 限制级</div>
                    <img :src="album.cover" :alt="album.title" v-if="isImage(album.cover)" />
                    <div v-else class="video-overlay">
                        <div class="play-icon"><i class="fa-solid fa-play"></i></div>
                    </div>
                </div>
                <div class="album-info">
                    <div class="album-title">{{ album.title }}</div>
                    <div class="album-count">{{ album.count }} {{ isImage(album.cover) ? '张照片' : '个视频' }}</div>
                </div>
            </div>
        </template>

        <!-- 警告对话框 -->
        <div v-if="showWarningDialog" class="warning-dialog">
            <div class="dialog-content">
                <h2>18+ 内容警告</h2>
                <p>此相册包含18+内容，请确认您已年满18岁并在非公共场合下浏览。</p>
                <div class="dialog-actions">
                    <button @click="confirmAccess">确认</button>
                    <button @click="cancelAccess">取消</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>

import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
const showWarningDialog = ref(false);
const selectedFolder = ref(null);
const router = useRouter();
const albums = ref([]);
const loading = ref(false);

async function fetchAlbums() {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=albums`);
        if (!response.ok) throw new Error('网络请求失败');

        const data = await response.json();
        const newAlbums = data.map(album => ({
            cover: album.latest_image,
            title: album.folder_name,
            count: album.photo_count,
            attribute: album.attribute,
            folder_id: album.folder_id,
            ispassword: album.ispassword
        }));

        albums.value = newAlbums;
        return newAlbums;
    } catch (error) {
        console.error("获取相册数据失败:", error);
        return [];
    } finally {
        loading.value = false;
    }
}

function handleAlbumClick(album) {
    if (album.attribute == 2) {
        selectedFolder.value = album;
        showWarningDialog.value = true;
    } else {
        router.push({ name: 'Photos', query: { folder_id: album.folder_id, ispassword: album.ispassword } });
    }
}
function isImage(src) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const extension = src.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
}
function confirmAccess() {
    showWarningDialog.value = false;
    router.push({
        name: 'Photos',
        query: { folder_id: selectedFolder.value.folder_id, ispassword: selectedFolder.value.ispassword }
    });
}

function cancelAccess() {
    showWarningDialog.value = false;
}
onMounted(() => {
    fetchAlbums();
});

</script>

<style scoped>
.gallery.albums {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    padding: 24px;
}

.album {
    background: var(--bg-primary);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    cursor: pointer;
    height: 328px;
}

.album:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.album-cover {
    aspect-ratio: 1;
    overflow: hidden;
    backdrop-filter: blur(10px);
}

.album-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.album:hover .album-cover img {
    transform: scale(1.05);
}

.album-info {
    padding: 16px;
}

.album-title {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
    color: var(--text-secondary);
}

.album-count {
    font-size: 13px;
    color: var(--text-secondary);
}

/* 骨架屏样式 */
.skeleton {
    background: var(--bg-secondary);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px var(--shadow-color);
}

.skeleton .album-cover {
    aspect-ratio: 1;
    background: var(--skeleton-start);
}

.skeleton-img {
    width: 100%;
    height: 100%;
    background: var(--skeleton-end);
    animation: skeleton-loading 1.5s infinite;
}

.skeleton .album-info {
    padding: 16px;
}

.skeleton-text {
    height: 14px;
    background: var(--skeleton-end);
    margin-bottom: 8px;
    border-radius: 4px;
    animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

.warning-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.dialog-content {
    background: #fff;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 400px;
    text-align: center;
}

.dialog-content h2 {
    font-size: 20px;
    margin-bottom: 16px;
    color: #d9534f;
    /* 警告色 */
}

.dialog-content p {
    font-size: 16px;
    color: #555;
    margin-bottom: 24px;
}

.dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.dialog-actions button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 15px;
    transition: background 0.3s ease;
}

.dialog-actions button:first-child {
    background-color: #1a73e8;
    color: white;
}

.dialog-actions button:first-child:hover {
    background-color: #0f6de8;
}

.dialog-actions button:last-child {
    background-color: #d9534f;
    color: white;
}

.dialog-actions button:last-child:hover {
    background-color: #c9302c;
}

.album-cover {
    background-color: #171717eb;
}

.video-overlay {
    position: relative;
    height: 100%;
    width: 100%;
}

.play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 32px;
    color: white;
    background: rgba(0, 0, 0, 0.6);
    padding: 8px 12px;
    border-radius: 50%;
}



.blur-overlay{
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    z-index: 1;
    text-align: center;
    padding-top: 50%;
    color: #ff0c0c;
}


</style>