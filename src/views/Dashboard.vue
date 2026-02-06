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
  },
  mounted() {
    this.updateIsMobile();
    window.addEventListener('resize', this.updateIsMobile);
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