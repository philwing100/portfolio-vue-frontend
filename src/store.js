import { createStore } from 'vuex';
import { instance as axios } from './axios';
import { baseURL } from './axios';

const store = createStore({
  state: {
    user: null,
    isAuthenticated: false,
    token: localStorage.getItem('token') || null,  // Load token from localStorage
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user;
      state.isAuthenticated = !!user;
    },
    LOGOUT(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      localStorage.removeItem('token');  // Remove token from localStorage
    },
    SET_TOKEN(state, token) {
      state.token = token;
      localStorage.setItem('token', token);  // Store token in localStorage
    },
  },
  actions: {
    async checkAuth({ commit }) {
      const token = localStorage.getItem('token');
      console.log('token: ' + token);
      if (token) {
        try {
          const response = await axios.get('/auth/check-auth', {
            headers: { authorization: `${token}` }  // Send JWT in header
          });

          // Commit the user and token from response
          commit('SET_USER', response.data.user);
          commit('SET_TOKEN', token);
        } catch (error) {
          console.warn('Not authenticated:', error);
          commit('LOGOUT');
        }
      } else {
        commit('LOGOUT');
      }
    },

    async handleGoogleLogin({ commit }) {
      const urlParams = new URLSearchParams(window.location.search);  // Capture URL parameters
      const token =
        urlParams.get('token') ||
        urlParams.get('access_token') ||
        urlParams.get('accessToken');  // Get the JWT token from the URL

      console.log(token);

      if (token) {
        commit('SET_TOKEN', token);  // Save the token in Vuex state and localStorage
        window.location.href = window.location.origin;
      } else {
        console.warn('Token not found in the URL after Google login');
      }
    },

    async refreshToken({ commit }) {
      try {
        const response = await axios.post('/auth/refresh', {}, { skipAuthRefresh: true });
        const newToken = response?.data?.token || response?.data?.accessToken;
        if (newToken) {
          commit('SET_TOKEN', newToken);
          return newToken;
        }
        return null;
      } catch (error) {
        console.warn('Refresh token error:', error);
        return null;
      }
    },


    async logout({ commit }) {
      try {
        await axios.post('/auth/logout');
        commit('LOGOUT');
      } catch (error) {
        console.warn('Logout error:', error);
      }
    },
  },
});

export default store;
