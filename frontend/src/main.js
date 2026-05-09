import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '@fontsource/zcool-kuaile/400.css';
import '@fontsource/zcool-kuaile/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/700.css';
import './style.css';

createApp(App).use(router).mount('#app');
