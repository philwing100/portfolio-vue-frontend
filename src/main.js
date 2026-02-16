import { createApp } from 'vue';
import App from './App.vue';
import store from './store';
import router from './router';
import axios from 'axios';

axios.defaults.withCredentials = true;

const app = createApp(App);

app.use(store);
app.use(router);

// On initial load, derive auth state from any existing token
// without relying on the broken refresh-token endpoint.
store.dispatch('checkAuth').finally(() => {
	app.mount('#app');
});
