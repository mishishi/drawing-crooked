import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import WaitingRoom from '../views/WaitingRoom.vue';
import PlayCanvas from '../views/PlayCanvas.vue';
import WaitingNext from '../views/WaitingNext.vue';
import Reveal from '../views/Reveal.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/waiting/:roomId', name: 'waiting', component: WaitingRoom },
    { path: '/play/:roomId', name: 'play', component: PlayCanvas },
    { path: '/waiting-next/:roomId', name: 'waiting-next', component: WaitingNext },
    { path: '/reveal/:roomId', name: 'reveal', component: Reveal }
  ]
});

export default router;
