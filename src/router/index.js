// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import store from '@/store'; // Vuex store for authentication state

// Import route groups
import dashboardRoutes from './dashboardRoutes';
import accountRoutes from './accountRoutes';
import generalRoutes from './generalRoutes';

// Import the NotFound component
import NotFound from '@/views/NotFound.vue';

// Combine routes
const routes = [
  ...dashboardRoutes,
  ...accountRoutes,
  ...generalRoutes,
  // Catch-all route for 404 page
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// Navigation guard for protected routes
router.beforeEach(function beforeEach(to, from, next) {
  const isAuthenticated = store.state.isAuthenticated; // Get auth status from Vuex

  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Route requires auth and user is not authenticated
    if (!isAuthenticated) {
      next({ name: 'Login' }); // Redirect to login page
    } else {
      next(); // Proceed to route
    }
  } else {
    next(); // Proceed to route
  }
});

// Global after hook to manage the document title based on route
router.afterEach((to) => {
  if (typeof window === 'undefined') return;

  const baseTitle = to.name === 'AboutMe' ? 'Portfolio' : 'Finish This';

  // Store the base title so other parts of the app (e.g., pomodoro state)
  // can restore it when needed.
  window.__baseTitle = baseTitle;

  // If the pomodoro timer is not actively controlling the title, update it now.
  if (!window.__pomodoroRunning) {
    document.title = baseTitle;
  }
});

export default router;
