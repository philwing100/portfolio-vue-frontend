<template>
  <div class="collapse-container">
    <div @click="toggleWidth" class="collapse-icon"
      :style="{ width: toggleButtonWidth + 'rem'}">
      <div class="collapse-icon" :class="{ 'rotate-180': !toggleBar }">
        >
      </div>
    </div>
  </div>
  <div :style="{ width: sidebarWidth + 'rem' }" class="sidebar">
    <nav class="needPadding">
      <router-link
        v-for="(route, index) in routes"
        :to="route.path"
        :key="index"
        ref="routerLinks"
        class="sidebarItem"
        :class="{ 'active': $route.path === route.path }"
        @click="route.isAuth ? handleAuthClick : setActiveItem(route.path)"
      >
        {{ route.label }}
      </router-link>
    </nav>
  </div>
  <router-view :class="{ 'paddingWithSidebar': !toggleBar, 'paddingWithoutSidebar': toggleBar }"></router-view>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'SideBar',
  setup() {
    const store = useStore();
    const router = useRouter();

    const isAuthenticated = computed(() => store.state.isAuthenticated);

    const baseRoutes = [
      { path: '/', label: 'Dashboard' },
      { path: '/Streaks', label: 'Streaks' },
      { path: '/About-me', label: 'About Me' },
      { path: '/Stats', label: 'Stats' },
      { path: '/Settings', label: 'Settings' },
    ];

    const routes = computed(() => [
      ...baseRoutes,
      {
        path: '/login',
        label: isAuthenticated.value ? 'Logout' : 'Login',
        isAuth: true,
      },
    ]);

    const getColorVar = (name, fallback) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    // Use reactive so updates propagate
    const sidebarColors = reactive({
      sideBar: '',
      text: '',
      hover: ''
    });

    const toggleBar = ref(false);
    const sidebarWidth = ref(11.25);
    const toggleButtonWidth = ref(11.25);
    const isMobile = ref(false);
    const activeItem = ref(null);
    const routerLinks = ref([]);

    const getOpenWidth = () => (isMobile.value ? 16 : 11.25);

    const updateSidebarDimensions = () => {
      const openWidth = getOpenWidth();
      sidebarWidth.value = toggleBar.value ? 0 : openWidth;
      toggleButtonWidth.value = toggleBar.value ? 3.125 : openWidth;
    };

    const toggleWidth = () => {
      toggleBar.value = !toggleBar.value;
      updateSidebarDimensions();
      localStorage.setItem('isSideBarExtended', JSON.stringify(toggleBar.value));
    };

    const setActiveItem = (item) => {
      activeItem.value = item;
    };

    const handleAuthClick = async (event) => {
      if (!event) return;
      event.preventDefault();

      if (isAuthenticated.value) {
        try {
          await store.dispatch('logout');
          await router.push({ name: 'Login' });
        } catch (error) {
          console.warn('Logout error from sidebar:', error);
        }
      } else {
        router.push({ name: 'Login' });
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        toggleWidth();
      }
    };

    const handleHover = (link) => {
      link.style.backgroundColor = sidebarColors.hover;
    };

    const handleMouseLeave = (link) => {
      link.style.backgroundColor = '';
      /*console.log('Sidebar Colors:', {
        sideBar: sidebarColors.sideBar,
        text: sidebarColors.text,
        hover: sidebarColors.hover
      });*/
    };

    const updateIsMobile = () => {
      if (typeof window === 'undefined') return;
      isMobile.value = window.innerWidth <= 768;
      updateSidebarDimensions();
    };

    onMounted(() => {
      // Now CSS variables are available
      sidebarColors.sideBar = getColorVar('--primaryColor');
      sidebarColors.text = getColorVar('--accentColor');
      sidebarColors.hover = getColorVar('--secondaryColor');

      document.addEventListener('keyup', handleEscapeKey);

      updateIsMobile();

      const storedSideBarBool = localStorage.getItem('isSideBarExtended');
      if (storedSideBarBool !== null) {
        toggleBar.value = JSON.parse(storedSideBarBool);
        updateSidebarDimensions();
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateIsMobile);
      }

      nextTick(() => {
        routerLinks.value = Array.from(document.querySelectorAll('.sidebarItem'));

        routerLinks.value.forEach((item) => {
          item.style.color = sidebarColors.text;
        });

        routerLinks.value.forEach((link) => {
          link.addEventListener('mouseenter', () => handleHover(link));
          link.addEventListener('mouseleave', () => handleMouseLeave(link));
        });
      });
    });

    onUnmounted(() => {
      document.removeEventListener('keyup', handleEscapeKey);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateIsMobile);
      }
      routerLinks.value.forEach((link) => {
        link.removeEventListener('mouseenter', () => handleHover(link));
        link.removeEventListener('mouseleave', () => handleMouseLeave(link));
      });
    });

    return {
      routes,
      toggleBar,
      sidebarWidth,
      toggleButtonWidth,
      toggleWidth,
      activeItem,
      setActiveItem,
      sidebarColors,
      routerLinks,
      isMobile,
      handleAuthClick,
      isAuthenticated,
    };
  },
  beforeRouteUpdate(to, from, next) {
    this.setActiveItem(to.path);
    next();
  }
};
</script>

<style>
.sidebar {
  height: 100vh;
  position: fixed;
  z-index: 4;
  top: 0;
  left: 0;
  overflow-x: hidden;
  transition: 0.4s ease-out;
  padding-top: 0.625rem;
  /* 10px */
  display: flex;
  flex-direction: column;
  background-color: var(--primaryColor);
}

.sidebarItem {
  width: 100%;
  padding: 0.625rem 0 0.625rem 0.625rem;
  /* 10px */
  white-space: nowrap;
  text-decoration: none;
  font-size: 1.25rem;
  /* 20px */
  display: block;
  transition: 0.3s ease-out;
  color: var(--accentColor);
}

.sidebarItem.active {
  border-radius: 0.75rem;
  /* 12px */
  width: 85%;
  padding-left: 0.9375rem;
  /* 15px */
  padding-right: 0.3125rem;
  /* 5px */
  background-color: var(--secondaryColor);
  /* Use CSS var for hover color */
  color: var(--accentColor);
}

.needPadding {
  padding-top: 1.875rem;
  /* 30px */
}

.paddingWithoutSidebar {
  padding-left: 0;
  transition: 0.4s ease-out;
}

.paddingWithSidebar {
  padding-left: 11.25rem;
  /* 180px */
  transition: 0.4s ease-out;
}

.collapse-icon {
  cursor: pointer;
  display: flex;
  font-size: 1.25rem;
  /* 20px */
  color: var(--accentColor);
  justify-content: center;
  transition: 0.3s ease-out;
}

.collapse-container {
  padding-top: 0.5rem;
  /* 15px */
  position: fixed;
  top: 0;
  left: 0;
  justify-content: center;
  z-index: 5;
  background-color: var(--primaryColor);
  border-bottom-right-radius: 0.5rem;
  user-select: none;
}

.rotate-180 {
  transform: rotate(180deg);
}

.standout {
  background-color: red;
}
</style>