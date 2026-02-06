<template>
  <div class="life-calendar-root">
    <div class="singleColumn">
      <div class="calendar-weeks-label">
        <div>Weeks</div>
        <span class="arrow">&#8594;</span>
      </div>
      <div class="calendar-columns">
        <div class="calendar-age-label">
          <span>A</span>
          <span>g</span>
          <span>e</span>
          <span style="font-size: 2rem;">&#8595;</span>
        </div>
        <div class="calendar-grid-wrapper">
          <div class="calendar-grid">
            <div class="header-row-cells">
              <div v-for="week in 26" :key="week" class="header-row-cell">
                {{ week }}
              </div>
            </div>

            <div v-for="row in Array.from({ length: 91 }, (_, i) => i)" :key="row" class="calendar-row">
              <div class="calendar-row-label">
                {{ row === 0 ? 'Birth' : row }}
              </div>
              <div v-for="cell in 26" :key="cell" class="calendar-cell"
                :class="{ filled: isFilled(row, cell, 1), 'on-fire': isLastFilled(row, cell, 1) }, { 'calendar-row-gap': row !== 0 && row % 10 === 0 }">
                <div v-if="isLastFilled(row, cell, 1)" class="fire-effect">
                  <div class="flame flame-1"></div>
                  <div class="flame flame-2"></div>
                  <div class="flame flame-3"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
        <div class="calendar-grid-wrapper">
          <div class="calendar-grid">
            <div class="header-row-cells">
              <div v-for="week in 26" :key="week" class="header-row-cell">
                {{ week + 26 }}
              </div>
            </div>

            <div v-for="row in Array.from({ length: 91 }, (_, i) => i)" :key="row" class="calendar-row">
              <div class="calendar-row-label"></div>
              <div v-for="cell in 26" :key="cell" class="calendar-cell"
                :class="{ filled: isFilled(row, cell, 2), 'on-fire': isLastFilled(row, cell, 2) }, { 'calendar-row-gap': row !== 0 && row % 10 === 0 }">
                <div v-if="isLastFilled(row, cell, 2)" class="fire-effect">
                  <div class="flame flame-1"></div>
                  <div class="flame flame-2"></div>
                  <div class="flame flame-3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LifeCalendar',
  props: {
    startDate: {
      type: String,
      required: true,
    },
  },
  computed: {
    weeksSinceStart() {
      const now = new Date();
      const start = new Date(this.startDate);
      const diffMs = now - start;
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    },
    lastFilledWeek() {
      return this.weeksSinceStart - 1;
    },
  },
  methods: {
    isFilled(row, cell, col) {
      // Calculate the week number for this cell
      // Each row represents 52 weeks (26 per column)
      // First column: weeks 1-26 of each year, second column: weeks 27-52 of each year
      const weekInYear = (col === 1) ? cell : cell + 26;
      const weekIndex = (row - 1) * 52 + weekInYear - 1;
      return weekIndex < this.weeksSinceStart;
    },
    isLastFilled(row, cell, col) {
      const weekInYear = (col === 1) ? cell : cell + 26;
      const weekIndex = (row - 1) * 52 + weekInYear - 1;
      return weekIndex === this.lastFilledWeek;
    },
  },
};
</script>

<style scoped>
.life-calendar-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--primaryColor);
  padding: 2rem 0;
}

.calendar-labels {
  display: flex;
  width: 100%;
  align-items: flex-start;
  margin-bottom: 1rem;
  max-width: 60rem;
  position: relative;
}

.calendar-age-label {
  padding-top: 2.5rem;
  ;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.1rem;
  color: var(--accentColor);
}

.calendar-weeks-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 1.1rem;
  color: var(--accentColor);
  width: 100%;
  margin-bottom: 1rem;
  justify-content: flex-start;
  /* Remove position, left, top */
}

.arrow {
  font-size: 2rem;
  margin-bottom: 0.25rem;
  margin-left: 0.5rem;
}

.calendar-columns {
  display: flex;
  gap: 2rem;
  justify-content: center;
  width: 100%;
  max-width: 60rem;
}

.calendar-grid-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.calendar-grid {
  display: flex;
  flex-direction: column;
  background: transparent; /* was var(--secondaryColor) -> make transparent */
  border-radius: 0.5rem;
  padding: 0.5rem 0.25rem;
  box-shadow: none; /* remove shadow so it sits directly on page background */
}

.calendar-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.4rem; /* increased vertical spacing between rows */
}

.calendar-row-label {
  width: 2.2rem;
  min-width: 1.75rem;
  max-width: 2.375rem;
  text-align: right;
  font-size: 0.85rem;
  color: var(--accentColor);
  margin-right: 0.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 1.2rem;
  min-height: 1.125rem;
  max-height: 2rem;
}

.calendar-cell {
  width: 1.2rem;
  height: 1.2rem;
  min-width: 1.125rem;
  min-height: 1.125rem;
  max-width: 2rem;
  max-height: 2rem;
  background: transparent; /* make unfilled cells transparent */
  border-radius: 0.2rem;
  border: 0.0625rem solid var(--secondaryColor);
  margin-right: 0.3rem; /* increased horizontal spacing between cells */
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.calendar-cell:hover {
  transform: scale(1.2);
  background: var(--accentColor);
  border-color: var(--accentColor);
  box-shadow: 0 0.25rem 0.75rem rgba(255, 255, 255, 0.3);
  z-index: 10;
  animation: pulse 0.6s ease-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }

  50% {
    transform: scale(1.15);
    box-shadow: 0 0 0 0.5rem rgba(255, 255, 255, 0.3);
  }

  100% {
    transform: scale(1.2);
    box-shadow: 0 0.25rem 0.75rem rgba(255, 255, 255, 0.3);
  }
}

.calendar-cell.filled {
  background: var(--accentColor); /* filled cells remain highlighted */
  border: 0.0625rem solid var(--accentColor);
}

.calendar-cell.on-fire {
  position: relative;
  overflow: visible;
  z-index: 5;
}

.fire-effect {
  position: absolute;
  top: -0.25rem;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 150%;
  pointer-events: none;
}

.flame {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
}

.flame-1 {
  width: 0.8rem;
  height: 1.2rem;
  background: linear-gradient(45deg, #ff6b35, #ff8e35, #ffaa35);
  animation: flicker1 0.5s ease-in-out infinite alternate;
}

.flame-2 {
  width: 0.6rem;
  height: 1rem;
  background: linear-gradient(45deg, #ff8e35, #ffaa35, #ffd635);
  animation: flicker2 0.7s ease-in-out infinite alternate;
  z-index: 1;
}

.flame-3 {
  width: 0.4rem;
  height: 0.8rem;
  background: linear-gradient(45deg, #ffaa35, #ffd635, #ffff35);
  animation: flicker3 0.3s ease-in-out infinite alternate;
  z-index: 2;
}

@keyframes flicker1 {
  0% {
    transform: translateX(-50%) scale(1) rotate(-2deg);
    opacity: 0.9;
  }

  100% {
    transform: translateX(-50%) scale(1.1) rotate(2deg);
    opacity: 1;
  }
}

@keyframes flicker2 {
  0% {
    transform: translateX(-50%) scale(0.9) rotate(1deg);
    opacity: 0.8;
  }

  100% {
    transform: translateX(-50%) scale(1.2) rotate(-1deg);
    opacity: 1;
  }
}

@keyframes flicker3 {
  0% {
    transform: translateX(-50%) scale(0.8) rotate(-1deg);
    opacity: 0.7;
  }

  100% {
    transform: translateX(-50%) scale(1.3) rotate(1deg);
    opacity: 1;
  }
}

/* Tablet and below: stack columns and allow scroll where appropriate */
@media (max-width: 56.25rem) { /* 900px - slightly larger tablet breakpoint */
  .calendar-columns {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .calendar-grid-wrapper {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .calendar-grid {
    padding: 0.25rem;
    display: inline-block; /* allow horizontal scroll of grid content */
  }

  .header-row-cells {
    justify-content: flex-start;
    overflow-x: auto;
  }
}

/* Mobile: reduce cell sizes and spacing */
@media (max-width: 37.5rem) { /* 600px */
  .calendar-row {
    margin-bottom: 0.32rem;
  }

  .calendar-row-label {
    width: 1.6rem;
    min-width: 1.2rem;
    font-size: 0.75rem;
    margin-right: 0.35rem;
  }

  .calendar-cell,
  .header-row-cell {
    width: 0.95rem;
    height: 0.95rem;
    min-width: 0.75rem;
    min-height: 0.75rem;
    margin-right: 0.18rem;
  }

  .header-row-cell {
    margin-right: 0.18rem;
    font-size: 0.75rem;
  }

  .flame-1 { width: 0.65rem; height: 1rem; }
  .flame-2 { width: 0.5rem; height: 0.8rem; }
  .flame-3 { width: 0.35rem; height: 0.65rem; }
}

/* Very small phones: tighten further */
@media (max-width: 22.5rem) { /* 360px */
  .calendar-cell,
  .header-row-cell {
    width: 0.85rem;
    height: 0.85rem;
    margin-right: 0.12rem;
  }

  .header-row-cell {
    font-size: 0.7rem;
  }

  .arrow {
    font-size: 1.6rem;
  }

  .calendar-age-label span {
    font-size: 0.95rem;
  }
}

.singleColumn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: auto;
}

.header-row-cells {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 0.25rem;
}

.header-row-cell {
  width: 1.2rem;
  height: 1.2rem;
  min-width: 1.125rem;
  min-height: 1.125rem;
  max-width: 2rem;
  max-height: 2rem;
  background: transparent !important;
  border-radius: 0.2rem;
  border: 0.0625rem solid transparent;
  margin-right: 0.3rem; /* match spacing with cells */
  font-size: 0.85rem;
  color: var(--accentColor);
  font-weight: 600;
  cursor: default !important;
  pointer-events: none;
  box-shadow: none !important;
  transition: none !important;
}

.calendar-row-gap {
  margin-top: 0.5rem;
}
</style>