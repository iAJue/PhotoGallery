<template>
    <div id="app" :class="{ 'dark-mode': isDarkMode }">
        <Header @toggle-dark-mode="toggleDarkMode" :isDarkMode="isDarkMode" />
        <router-view class="container" />
    </div>
</template>

<script setup>
import Header from './components/Header.vue';
import { ref } from 'vue';
import './styles/dark-mode.css';

const isDarkMode = ref(localStorage.getItem('darkMode') === 'true');

function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem('darkMode', isDarkMode.value);
}
</script>

<style>
body {
    user-select: none;
    margin: 0;
    padding: 0;
}

#app {
    min-height: 100vh;
}

.container {
    margin-top: 68px;
    min-height: calc(100vh);
}
</style>