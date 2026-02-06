<template>
  <div class="time-picker">
    <input
      type="text"
      v-model="formattedTime"
      @focus="showDropdown"
      @click="showDropdown"
      @input="onInputChange"
      @blur="handleBlur"
      @keydown.down.prevent="navigateDown"
      @keydown.up.prevent="navigateUp"
      @keydown.enter.prevent="selectCurrentTime"
      class="time-input"
      ref="timeInput"
    />
    <div v-if="isDropdownVisible" class="time-dropdown">
      <div
        v-for="(time, index) in selectableTimes"
        :key="time"
        class="time-option"
        :class="{ selected: time === selectedTime, highlighted: index === highlightedIndex }"
        @click="selectTime(time)"
        @mousedown.prevent
        @mouseover="highlightedIndex = index"
      >
        {{ time }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: String,
      default: null,
    },
    minTime: {
      type: String,
      default: null,
    },
    maxTime: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      isDropdownVisible: false,
      selectedTime: this.modelValue || this.getDefaultTime(),
      formattedTime: '',
      highlightedIndex: 0,
    };
  },
  computed: {
    selectableTimes() {
      const times = [];
      for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
          const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
          const period = i < 12 ? 'am' : 'pm';
          const formattedTime = `${hour}:${String(j).padStart(2, '0')}${period}`;
          times.push(formattedTime);
        }
      }
      // Filter based on minTime and maxTime
      return times.filter(time => this.isTimeInRange(time));
    },
  },
  methods: {
    getDefaultTime() {
      // If modelValue exists, use it
      if (this.modelValue) return this.modelValue;
      
      // Otherwise return current time rounded to nearest 30 min
      return this.getNearestTime();
    },
    getNearestTime() {
      const now = new Date();
      let minutes = Math.ceil(now.getMinutes() / 30) * 30;
      let hours = now.getHours();
      
      if (minutes >= 60) {
        minutes = 0;
        hours = (hours + 1) % 24;
      }
      
      const nearestTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      return this.formatTime(nearestTime);
    },
    formatTime(date) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours < 12 ? 'am' : 'pm';
      const formattedHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${formattedHour}:${String(minutes).padStart(2, '0')}${period}`;
    },
    
    showDropdown() {
      this.isDropdownVisible = true;
      this.highlightedIndex = this.selectableTimes.findIndex(time => time === this.selectedTime);
      this.$nextTick(() => {
        const dropdown = this.$el.querySelector('.time-dropdown');
        if (dropdown) {
          dropdown.scrollTop = this.highlightedIndex * dropdown.children[0].offsetHeight; // Scroll to the highlighted time
        }
      });
    },
    onInputChange(event) {
      this.formattedTime = event.target.value;
    },
    handleBlur() {
      if (this.isValidTime(this.formattedTime)) {
        this.selectedTime = this.formattedTime;
      } else {
        this.formattedTime = this.selectedTime;
      }
      this.isDropdownVisible = false;
      this.updateParent(); // Update parent with the selected time
    },
    isValidTime(timeString) {
      const timeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])(am|pm)$/;
      return timeRegex.test(timeString);
    },
    selectTime(time) {
      this.selectedTime = time;
      this.formattedTime = time;
      this.isDropdownVisible = false;
      this.updateParent(); // Update parent when a time is selected
      this.$nextTick(() => {
        this.$refs.timeInput.focus();
      });
    },
    navigateDown() {
      if (this.highlightedIndex < this.selectableTimes.length - 1) {
        this.highlightedIndex++;
      }
    },
    navigateUp() {
      if (this.highlightedIndex > 0) {
        this.highlightedIndex--;
      }
    },
    selectCurrentTime() {
      const time = this.selectableTimes[this.highlightedIndex];
      if (time) {
        this.selectTime(time);
      }
    },
    updateParent() {
      this.$emit('update:modelValue', this.selectedTime); // Emit to update v-model in parent
    },
    isTimeInRange(time) {
      if (!this.minTime && !this.maxTime) return true;
      
      const timeMinutes = this.timeToMinutes(time);
      
      if (this.minTime) {
        const minMinutes = this.timeToMinutes(this.minTime);
        if (timeMinutes < minMinutes) return false;
      }
      
      if (this.maxTime) {
        const maxMinutes = this.timeToMinutes(this.maxTime);
        if (timeMinutes > maxMinutes) return false;
      }
      
      return true;
    },
    timeToMinutes(timeString) {
      const match = timeString.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
      if (!match) return 0;
      
      let [_, hour, minute, period] = match;
      hour = parseInt(hour, 10);
      minute = parseInt(minute, 10);
      
      if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
      
      return hour * 60 + minute;
    },
  },
  watch: {
    modelValue(newValue) {
      this.selectedTime = newValue || this.getDefaultTime();
      this.formattedTime = this.selectedTime;
    },
    minTime() {
      // Re-validate selected time when constraints change
      if (!this.isTimeInRange(this.selectedTime)) {
        const validTimes = this.selectableTimes;
        if (validTimes.length > 0) {
          this.selectTime(validTimes[0]);
        }
      }
    },
    maxTime() {
      // Re-validate selected time when constraints change
      if (!this.isTimeInRange(this.selectedTime)) {
        const validTimes = this.selectableTimes;
        if (validTimes.length > 0) {
          this.selectTime(validTimes[validTimes.length - 1]);
        }
      }
    },
  },
  mounted() {
    this.formattedTime = this.selectedTime;
  },
};
</script>

<style scoped>
.time-picker {
  position: relative;
}

.time-input {
  background-color: var(--secondaryColor);
  color: var(--accentColor);
  border: 0.0625rem solid var(--accentColor);
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  width: 7.5rem;
  cursor: text;
  font-size: 0.875rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.time-input:focus {
  outline: none;
  border-color: var(--accentColor);
  box-shadow: 0 0 0 0.125rem rgba(255, 255, 255, 0.2);
}

.time-input:hover {
  border-color: var(--primaryColor);
}

.time-dropdown {
  position: absolute;
  top: 40px;
  left: 0;
  background-color: var(--secondaryColor);
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.25rem;
  max-height: 150px;
  overflow-y: auto;
  overflow-x: hidden; /* Disable horizontal scrollbar */
  z-index: 10;
}

.time-option {
  padding: 0.625rem;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.time-option:hover {
  background-color: var(--accentColor);
  color: var(--primaryColor);
}

.time-option.selected {
  background-color: var(--primaryColor);
  color: var(--accentColor);
}

.time-option.highlighted {
  background-color: var(--primaryColor);
  color: var(--accentColor);
}
</style>