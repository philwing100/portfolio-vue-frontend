<template>
  <div>
    <!-- Top row: Hero text and navigation buttons -->
    <div class="top-row" :style="{ 'background-color': 'var(--primaryColor)' }">
      <div class="button-container">
        <!-- <MultiplayerToggle v-model="isChecked" label="Multiplayer"/>-->
        <!--Need to put these in a v-if is bound to the emits of multiplayer toggle-->
        <div class="bigButton" id="previousDay" @click="decrementDay"
          :style="{ 'background-color': 'var(--primaryColor)' }">&lt;&lt;</div>
        <DateInput :style="{ margin: '0rem', color: 'white' }" @date-selected="handleDateChange" v-model="currentDate" />
        <div class="bigButton" id="nextDay" @click="incrementDay" :style="{ 'background-color': 'var(--primaryColor)' }">
          >>
        </div>
      </div>
    </div>

    <div class="page-container" :style="{ 'background-color': 'var(--primaryColor)' }">
      <div
        class="lists-container"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <!-- Pomodoro is only visible on non-mobile layouts -->
        <Pomodoro v-if="!isMobile" />

        <!-- Desktop / tablet: show calendar and list side by side -->
        <template v-if="!isMobile">
          <DailyCalendar v-model:lists="dailyLists" :date="currentDate" />
          <ListElement
            listName="Daily List"
            v-model="dailyLists"
            :initialDate="currentDate"
          />
        </template>

        <!-- Mobile: only one of calendar or list is visible at a time -->
        <template v-else>
          <DailyCalendar
            v-if="activeMobileView === 'calendar'"
            v-model:lists="dailyLists"
            :date="currentDate"
          />
          <ListElement
            v-else
            listName="Daily List"
            v-model="dailyLists"
            :initialDate="currentDate"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable*/
//       <DailyCalendar/>
import colors from '@/assets/colors.json';
import ListElement from '@/components/ListItems/ListElement.vue';
import DailyCalendar from '@/components/CalendarComponents/DailyCalendar.vue';
import DateInput from '@/components/ListItems/DateInput.vue';
import './cssViews/Dashboard.css';
import MultiplayerToggle from '@/components/DashboardComponents/MultiplayerToggle.vue';
import Pomodoro from '@/components/LearnComponents/Pomodoro.vue';
import { getTodayDate, incrementDate, decrementDate } from '../date.js'
import { mapState } from 'vuex';
import { getList, createList } from '../api.js';

const DASHBOARD_LIST_STORAGE_PREFIX = 'dashboard-list-object:';

export default {
  name: 'DashboardWorld',
  components: {
    Pomodoro,
    ListElement,
    DailyCalendar,
    DateInput,
    MultiplayerToggle,
  },
  data() {
    return {
      colors: colors,
      dailyLists: [],
      currentDate: getTodayDate(),
      isChecked: false,
      isMobile: false,
      activeMobileView: 'list', // 'list' or 'calendar' when on mobile
      touchStartX: 0,
      touchStartY: 0,
    };
  },
  computed: {
    ...mapState(['isAuthenticated', 'user']),
  },
  watch: {
    async currentDate(newDate, oldDate) {
      if (oldDate && newDate !== oldDate) {
        await this.persistDateState(oldDate);
        this.clearDashboardState();
      }

      if (newDate) {
        this.loadDateState(newDate);
      }
    },
  },
  methods: {
    handleDateChange(date) {
      this.currentDate = date;
    },
    decrementDay() {
      this.currentDate = decrementDate(this.currentDate);
    },
    incrementDay() {
      this.currentDate = incrementDate(this.currentDate);
    },
    onEventClicked({ event, listType, index }) {
      console.log(`Event clicked:`, event);
    },
    updateIsMobile() {
      this.isMobile = window.innerWidth <= 768;
      // Ensure a valid default when switching into mobile view
      if (this.isMobile && !['list', 'calendar'].includes(this.activeMobileView)) {
        this.activeMobileView = 'list';
      }
    },
    handleTouchStart(event) {
      if (!this.isMobile || !event.changedTouches || event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      this.touchStartX = touch.screenX;
      this.touchStartY = touch.screenY;
    },
    handleTouchEnd(event) {
      if (!this.isMobile || !event.changedTouches || event.changedTouches.length === 0) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.screenX - this.touchStartX;
      const deltaY = touch.screenY - this.touchStartY;

      const horizontalThreshold = 50; // minimum px to consider it a swipe

      // Ignore if swipe is too small or mostly vertical
      if (Math.abs(deltaX) < horizontalThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      // Swipe left from list -> calendar
      if (deltaX < 0 && this.activeMobileView === 'list') {
        this.activeMobileView = 'calendar';
      }
      // Swipe right from calendar -> list
      else if (deltaX > 0 && this.activeMobileView === 'calendar') {
        this.activeMobileView = 'list';
      }
    },
    getStorageKey(date) {
      return `${DASHBOARD_LIST_STORAGE_PREFIX}${date}`;
    },
    getStoredList(date) {
      try {
        const raw = localStorage.getItem(this.getStorageKey(date));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.lists)) return null;
        return parsed;
      } catch (error) {
        console.warn('Failed to read stored dashboard list:', error);
        return null;
      }
    },
    extractTimestamp(listObject) {
      if (!listObject) return null;
      return listObject.timestamp || listObject.updated_at || null;
    },
    areListsEqual(a, b) {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      return JSON.stringify(a) === JSON.stringify(b);
    },
    buildListObject(date, lists, timestamp) {
      return {
        parent_page: 'dashboard',
        date,
        lists,
        timestamp: timestamp || new Date().toISOString(),
      };
    },
    async persistDateState(date) {
      try {
        const normalized = this.normalizeLists(
          Array.isArray(this.dailyLists) ? this.dailyLists : []
        );
        const stored = this.getStoredList(date);
        const storedLists = stored && Array.isArray(stored.lists)
          ? this.normalizeLists(stored.lists)
          : null;

        // If we have never stored anything for this date on this device
        // and the current normalized lists are empty, treat this as
        // "no data yet" and avoid persisting an empty payload.
        // This prevents a brand-new device (or tab) from overwriting
        // an existing non-empty list in the backend with an empty one
        // before the backend data has finished loading.
        if ((!storedLists || storedLists.length === 0) && normalized.length === 0) {
          return;
        }

        if (storedLists && this.areListsEqual(normalized, storedLists) && this.extractTimestamp(stored)) {
          return;
        }

        const listObject = this.buildListObject(date, normalized);

        localStorage.setItem(this.getStorageKey(date), JSON.stringify(listObject));
        console.info('[dashboard] saved lists to localStorage', {
          date,
          timestamp: listObject.timestamp,
        });

        await this.$store.dispatch('checkAuth');
        await createList(listObject);
        console.info('[dashboard] saved lists to backend', {
          date,
          timestamp: listObject.timestamp,
        });
      } catch (error) {
        console.warn('Failed to persist dashboard state:', error);
      }
    },
    clearDashboardState() {
      this.dailyLists = [];
    },
    hydrateFromLocalStorage(date) {
      try {
        const parsed = this.getStoredList(date);
        if (!parsed) return false;

        if (Array.isArray(parsed.lists)) {
          this.dailyLists = JSON.parse(JSON.stringify(parsed.lists));
          console.info('[dashboard] loaded lists from localStorage', {
            date,
            timestamp: this.extractTimestamp(parsed),
          });
          return true;
        }
      } catch (error) {
        console.warn('Failed to hydrate dashboard state:', error);
      }

      return false;
    },
    normalizeLists(lists) {
      return lists.map((list, index) => ({
        title: list.title || `List ${index + 1}`,
        items: Array.isArray(list.items) ? list.items : [],
        visible: list.visible !== false,
        color: list.color || '#2196f3',
      }));
    },
    async refreshFromBackend(date) {
      try {
        await this.$store.dispatch('checkAuth');
        const response = await getList({ parent_page: 'dashboard', date });
        const data = response && response.data;

        if (data && Array.isArray(data.lists)) {
          const normalized = this.normalizeLists(data.lists);
          const stored = this.getStoredList(date);
          const storedLists = stored && Array.isArray(stored.lists)
            ? this.normalizeLists(stored.lists)
            : null;

          if (storedLists && this.areListsEqual(normalized, storedLists)) {
            if (!this.extractTimestamp(stored)) {
              const listObject = this.buildListObject(
                date,
                storedLists,
                this.extractTimestamp(data)
              );
              localStorage.setItem(this.getStorageKey(date), JSON.stringify(listObject));
              console.info('[dashboard] saved lists to localStorage (timestamp backfill)', {
                date,
                timestamp: listObject.timestamp,
              });
            }
            return;
          }

          this.dailyLists = normalized;
          const listObject = this.buildListObject(
            date,
            normalized,
            this.extractTimestamp(data)
          );
          localStorage.setItem(this.getStorageKey(date), JSON.stringify(listObject));
          console.info('[dashboard] loaded lists from backend', {
            date,
            timestamp: listObject.timestamp,
          });
        }
      } catch (error) {
        console.warn('Failed to refresh dashboard lists:', error);
      }
    },
    async loadDateState(date) {
      this.hydrateFromLocalStorage(date);
      await this.refreshFromBackend(date);
    },
  },
  mounted() {
    this.updateIsMobile();
    window.addEventListener('resize', this.updateIsMobile);
    this.loadDateState(this.currentDate);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateIsMobile);
  }
};
</script>

<style scoped>
.signup-container {
  background-color: var(--primary);
  color: var(--accentColor);
  padding: 2rem;
  border-radius: 0.5rem;
}

button {
  background-color: var(--accentColor);
  color: var(--primary);
  border: 0.0625rem solid var(--secondaryColor);
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.message {
  margin-top: 0.625rem;
  color: var(--accentColor);
}
</style>