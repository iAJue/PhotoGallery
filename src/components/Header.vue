<template>
    <div class="header">
        <div class="search-icon" @click="toggleSearchModal">
            <i class="fas fa-search"></i>
        </div>
        <div class="tabs">
            <router-link to="/photos" class="tab" :class="{ active: $route.path === '/photos' }">照片</router-link>
            <router-link to="/albums" class="tab" :class="{ active: $route.path === '/albums' }">相册</router-link>
            <router-link to="/random" class="tab" :class="{ active: $route.path === '/random' }">随机</router-link>
        </div>
        <div class="more-icon" @click="toggleDropdown" @mouseover="showDropdown = true"
            @mouseleave="showDropdown = false">
            <i class="fas fa-ellipsis-h"></i>
            <div v-if="showDropdown" class="dropdown-menu">
                <a href="https://github.com/iAJue/PhotoGallery" target="_blank"><i class="fab fa-github"></i> GitHub</a>
                <a href="https://jq.qq.com/?_wv=1027&k=5cvR0GN" target="_blank"><i class="fas fa-users"></i> 社区官群</a>
                <a href="http://moejue.cn/" target="_blank"><i class="fas fa-blog"></i> 博客</a>
                <div @click="toggleAboutModal"><i class="fas fa-info-circle"></i> 关于</div>
            </div>
        </div>
    </div>
    <div v-if="showSearchModal" class="search-modal" @click.self="toggleSearchModal">
        <input type="text" class="search-input" placeholder="搜索照片或相册..." v-model="searchQuery"
            @keyup.enter="navigateToPhotos" ref="searchInput"/>
    </div>
    <div v-if="showAboutModal" class="about-modal" @click.self="toggleAboutModal">
        <div class="about-content">
            <h2>关于我们</h2>
            <p>这里是阿珏酱的私人相册,保存着阿珏在平常收集的图片,和各大平台中点赞收藏的视频.</p>
            <p>包括但不限于B站,YouTube,抖音,X,facebook,pixiv等平台的视频或图片,相关的数据信息版权归原作者所有.</p>
            <p>数据将不定期手动更新,如果你想要某些图片或者视频,请直接联系阿珏酱获取.</p>
            <button @click="toggleAboutModal">关闭</button>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
const searchQuery = ref(''); 
const router = useRouter();
const showSearchModal = ref(false);
const showDropdown = ref(false);
const showAboutModal = ref(false);
const searchInput = ref(null);
function navigateToPhotos() {
    if (searchQuery.value.trim()) {
        toggleSearchModal()
        router.push({ name: 'Photos', query: { search: searchQuery.value } });
    }
}

async function toggleSearchModal() {
    showSearchModal.value = !showSearchModal.value;
    if(showSearchModal.value){
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
</script>

<style scoped>
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 68px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    padding: 0 24px;
    z-index: 100;
}

.search-icon,
.more-icon {
    font-size: 21px;
    color: #2c3e50;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.3s ease;
    width: 25px;
    height: 30px;
    padding-left: 14px;
}

.search-icon:hover,
.more-icon:hover {
    background: rgba(26, 115, 232, 0.1);
    color: #1a73e8;
}

.tabs {
    flex: 1;
    display: flex;
    justify-content: center;
    gap: 40px;
}

.tab {
    padding: 10px 20px;
    color: #64748b;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
    font-weight: 500;
    font-size: 15px;
    text-decoration: none;
}

.tab:hover,
.tab.active {
    color: #1a73e8;
}

.tab.active::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 100%;
    height: 3px;
    background: #1a73e8;
    border-radius: 3px;
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-menu {
    position: absolute;
    top: 50px;
    right: 0;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
    z-index: 200;
    width: 150px;
    text-align: left;
}

.dropdown-menu a,
.dropdown-menu div {
    display: block;
    padding: 12px 16px;
    color: #1e293b;
    text-decoration: none;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.dropdown-menu a:hover,
.dropdown-menu div:hover {
    background: #f1f5f9;
    color: #1a73e8;
}

.search-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    padding-top: 120px;
    z-index: 200;
}

.search-input {
    height: 24px;
    width: 85%;
    max-width: 680px;
    padding: 16px 24px;
    border: none;
    border-radius: 16px;
    background: #f1f5f9;
    font-size: 16px;
    color: #1e293b;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
    outline: none;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
    background: white;
    padding: 24px;
    border-radius: 12px;
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
    .tabs {
        gap: 20px;
        font-size: 14px;
    }

    .header {
        padding: 0 16px;
    }

    .search-input {
        width: 95%;
    }

    .more-icon {
        padding: 6px;
    }
}
</style>