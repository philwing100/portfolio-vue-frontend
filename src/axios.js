// axios.js
import axios from 'axios';
import store from './store.js';
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://portfolio-backend-pi-liart.vercel.app";

const baseURL = API_URL + '/api'; // Define the base URL here
  
let instance = axios.create({
  baseURL, // Use the base URL here
  withCredentials: true, // Include credentials with requests
  credentials: 'include',
});

let refreshPromise = null;

function getToken() {
  return store?.state?.token || localStorage.getItem('token');
}

function setToken(token) {
  if (token) {
    store.commit('SET_TOKEN', token);
  }
}

async function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = instance
      .post('/auth/refresh', {}, { skipAuthRefresh: true })
      .then((response) => {
        const newToken = response?.data?.token || response?.data?.accessToken;
        if (newToken) {
          setToken(newToken);
        }
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.authorization = `${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};
    const status = response?.status;

    if (
      config &&
      !config._retry &&
      !config.skipAuthRefresh &&
      (status === 401 || status === 403)
    ) {
      config._retry = true;

      try {
        const newToken = await refreshToken();
        if (newToken) {
          config.headers = config.headers || {};
          config.headers.authorization = `${newToken}`;
        }
        return instance(config);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { instance, baseURL, refreshToken }; // Export both the instance and base URL
