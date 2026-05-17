<template>
    <div class="random-page">
        <MediaGallery
            :groups="randomGroups"
            :loading="loading"
            :has-more="hasMore"
            :show-load-more="true"
            :show-group-heading="false"
            :skeleton-count="12"
            load-more-text="加载更多"
            empty-description="暂时没有随机内容，稍后再来看看。"
            @load-more="loadMoreItems"
        />
    </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import MediaGallery from '../components/MediaGallery.vue';

const randomItems = ref([]);
const loading = ref(false);
const page = ref(1);
const limit = 12;
const hasMore = ref(true);

const randomGroups = computed(() => [{ items: randomItems.value }]);

async function shuffleGallery(targetPage) {
    loading.value = true;
    try {
        const response = await fetch(`https://photo.moejue.cn/api/?action=random&page=${targetPage}&limit=${limit}`);
        if (!response.ok) throw new Error('网络请求失败');
        const data = await response.json();
        if (data.length === 0) {
            hasMore.value = false;
            return [];
        }
        return data.map(item => ({
            src: item.type === 1 ? item.data.split('\n') : item.data,
            alt: item.name,
            isVideo: item.type === 1,
            duration: item.duration || null,
        }));
    } catch (error) {
        console.error('获取随机数据失败:', error);
        return [];
    } finally {
        loading.value = false;
    }
}

async function loadMoreItems() {
    if (loading.value || !hasMore.value) return;
    const newItems = await shuffleGallery(page.value);
    if (newItems.length === 0) return;
    randomItems.value.push(...newItems);
    page.value += 1;
}

onMounted(() => {
    loadMoreItems();
});
</script>

<style scoped>
.random-page {
    padding: 24px 24px 40px;
}

@media (max-width: 768px) {
    .random-page {
        padding: 18px 14px 40px;
    }
}
</style>
