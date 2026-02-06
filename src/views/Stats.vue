<template>
  <div>
    <div class="stats-container">
      <h1>Life Calendar Stats</h1>

      <div class="date-picker-container">
        <label>Birth Date:</label>
        <DateInput v-model="startDate" />
        <!-- weeks remaining text -->
        <div class="weeks-remaining">
          <em>{{ weeksRemaining }} weeks remaining, the future approaches</em>
        </div>
      </div>

      <LifeCalendar :start-date="startDate" />
    </div>
  </div>
</template>

<script>
import LifeCalendar from '@/components/StatsComponents/LifeCalendar.vue';
import DateInput from '@/components/ListItems/DateInput.vue'

export default {
  name: 'Stats',
  components: {
    LifeCalendar,
    DateInput,
  },
  data() {
    return {
      startDate: '1990-01-01', // Default birth date
    };
  },
  computed: {
    weeksSinceStart() {
      const now = new Date();
      const start = new Date(this.startDate);
      const diffMs = now - start;
      const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      return Math.max(0, weeks);
    },
    weeksRemaining() {
      const totalWeeks = 91 * 52; // matches LifeCalendar grid (91 rows * 52 weeks)
      return Math.max(0, totalWeeks - this.weeksSinceStart);
    }
  },
  mounted() {
    // Load saved birth date from localStorage if available
    const savedDate = localStorage.getItem('lifecalendar-birth-date');
    if (savedDate) {
      this.startDate = savedDate;
    }
  },
  watch: {
    startDate(newDate) {
      // Save birth date to localStorage when changed
      localStorage.setItem('lifecalendar-birth-date', newDate);
    }
  }
};
</script>

<style scoped>
.stats-container {
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  background: var(--primaryColor, #343541);
  padding: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  overflow-x: hidden;
}

h1 {
  color: var(--accentColor, #fff);
  margin-bottom: 2rem;
  font-size: 2rem;
}

.date-picker-container {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.date-picker-container label {
  color: var(--accentColor, #fff);
  font-size: 1.1rem;
  font-weight: 600;
}

.date-input {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 0.0625rem solid var(--secondaryColor, #555);
  background: var(--secondaryColor, #555);
  color: var(--accentColor, #fff);
  font-size: 1rem;
  min-width: 9.375rem;
}

.date-input:focus {
  outline: none;
  border-color: var(--accentColor, #fff);
  box-shadow: 0 0 0 0.125rem rgba(255, 255, 255, 0.2);
}

/* small italicized info under the date selector */
.weeks-remaining {
  margin-top: 0.5rem;
  color: var(--accentColor, #fff);
  font-size: 0.95rem;
  font-style: italic;
}

/* Mobile / small tablet */
@media (max-width: 37.5rem) { /* 600px */
  .stats-container {
    padding: 1rem 0;
  }

  h1 {
    font-size: 1.4rem;
    margin-bottom: 1rem;
  }

  .date-picker-container {
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0 1rem;
    width: 100%;
  }

  .date-input {
    min-width: auto;
    width: 100%;
    max-width: 28rem;
  }

  .weeks-remaining {
    font-size: 0.85rem;
    text-align: left;
    margin-left: 0.125rem;
  }
}

@media (max-width: 23.75rem) { /* 380px */
  h1 {
    font-size: 1.15rem;
  }

  .date-input {
    font-size: 0.95rem;
    padding: 0.4rem 0.75rem;
  }
}
</style>