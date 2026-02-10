import { createApp } from 'vue';
import App from './App.vue';
import store from './store'; // Ensure the correct path
import router from './router'; // Assuming you have a router
import axios from 'axios';

axios.defaults.withCredentials = true;

const app = createApp(App);

app.use(store);
app.use(router);
app.mount('#app');

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

function scheduleTokenRefresh() {
	if (store?.state?.token || localStorage.getItem('token')) {
		store.dispatch('refreshToken');
	}
	setInterval(() => {
		if (store?.state?.token || localStorage.getItem('token')) {
			store.dispatch('refreshToken');
		}
	}, REFRESH_INTERVAL_MS);
}

scheduleTokenRefresh();
