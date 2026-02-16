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

// The refresh-token endpoint is currently unreliable. We keep this
// function defined for backwards compatibility, but make it a
// no-op that never calls the backend.
async function refreshToken() {
  return null;
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
    // Do not attempt to auto-refresh tokens. If a request is
    // unauthorized, let the caller handle it (e.g. by logging
    // out or showing a message).
    return Promise.reject(error);
  }
);

export { instance, baseURL, refreshToken }; // Export both the instance and base URL
