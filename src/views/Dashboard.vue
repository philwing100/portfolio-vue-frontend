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
      <div class="lists-container">
        <DailyCalendar v-model:list2="dailyList" :date="currentDate" />
        <ListElement listName="Daily List" v-model="dailyList" :initialDate="currentDate" />
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
import { getTodayDate, incrementDate, decrementDate } from '../date.js'
import { mapState } from 'vuex'; // Importing Vuex to access state

export default {
  name: 'DashboardWorld',
  components: {
    ListElement,
    DailyCalendar,
    DateInput,
    MultiplayerToggle,
  },
  data() {
    return {
      colors: colors,
      dailyList: [],
      currentDate: getTodayDate(),
      isChecked: false,
    };
  },
  computed: {
    ...mapState(['isAuthenticated', 'user']),
  },
  watch: {
    dailyList(newVal) {
      //console.log('Daily list updated:', newVal);
    }
  },
  methods: {
    handleDateChange(date) {
      this.scheduledDate = date;
      this.itemsArray[this.selectedItemIndex].scheduledDate = date;
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
  },
  mounted() {

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