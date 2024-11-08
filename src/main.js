import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import Photos from './views/Photos.vue';
import Albums from './views/Albums.vue';
import Random from './views/Random.vue';

const routes = [
  { path: '/', redirect: '/photos' },
  { path: '/photos', name: 'Photos', component: Photos },
  { path: '/albums', name: 'Albums', component: Albums },
  { path: '/random', name: 'Random', component: Random },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');