<template>
    <div id="app">
        <Header />
        <router-view class="container" />
    </div>
</template>

<script setup>
import Header from './components/Header.vue';
</script>

<style>
body {
    user-select: none;
}

.container {
    margin-top: 80px;
}
</style>