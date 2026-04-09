<template>
  <div class="session-page">

    <!-- ── Summary screen ─────────────────────────────────── -->
    <div v-if="done" class="summary">
      <h2 class="summary-title">Session Complete</h2>
      <p class="summary-sub">{{ results.length }} card{{ results.length !== 1 ? 's' : '' }} reviewed</p>

      <div class="summary-grid">
        <div
          v-for="r in RATINGS"
          :key="r.value"
          class="summary-cell"
          :style="{ borderColor: r.color }"
        >
          <span class="summary-count" :style="{ color: r.color }">
            {{ ratingCount(r.value) }}
          </span>
          <span class="summary-label">{{ r.label }}</span>
        </div>
      </div>

      <button class="btn-primary" @click="$router.push('/study')">Back to Study</button>
    </div>

    <!-- ── Active session ─────────────────────────────────── -->
    <template v-else>
      <!-- Header -->
      <div class="session-header">
        <button class="btn-ghost" @click="$router.push('/study')">✕ End</button>
        <span class="session-title">{{ session.title }}</span>
        <span class="progress-text">{{ currentIndex + 1 }} / {{ cards.length }}</span>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>

      <!-- Card -->
      <div class="card-area">
        <FlashcardDisplay :card="currentCard" @flip="showRatings = true" />
      </div>

      <!-- Rating buttons (visible after flip) -->
      <Transition name="fade">
        <div v-if="showRatings" class="ratings">
          <button
            v-for="r in RATINGS"
            :key="r.value"
            class="rating-btn"
            :style="{ '--rating-color': r.color }"
            @click="rate(r.value)"
          >
            {{ r.label }}
          </button>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script>
import FlashcardDisplay from '@/components/FlashcardComponents/FlashcardDisplay.vue';
import session          from '@/studySession.js';
import { reviewCard, RATINGS } from '@/anki';

export default {
  name: 'StudySession',
  components: { FlashcardDisplay },

  data() {
    return {
      session,
      cards: [],
      currentIndex: 0,
      showRatings: false,
      done: false,
      results: [],  // [{ card, rating }]
      RATINGS,
    };
  },

  computed: {
    currentCard() { return this.cards[this.currentIndex] ?? null; },
    progressPct()  { return this.cards.length ? (this.currentIndex / this.cards.length) * 100 : 0; },
  },

  created() {
    if (!session.cards.length) {
      this.$router.replace('/study');
      return;
    }
    this.cards = [...session.cards];
  },

  methods: {
    rate(rating) {
      const card = this.currentCard;
      if (!card) return;

      const updatedAnki = reviewCard(card.anki, rating);
      this.results.push({ card, rating });

      if (session.onRate) session.onRate(card.id, card.setId, updatedAnki);

      this.advance();
    },

    advance() {
      if (this.currentIndex < this.cards.length - 1) {
        this.currentIndex++;
        this.showRatings = false;
      } else {
        this.done = true;
      }
    },

    ratingCount(value) {
      return this.results.filter(r => r.rating === value).length;
    },
  },
};
</script>

<style scoped>
.session-page {
  min-height: 100vh;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 0.0625rem solid var(--secondaryColor);
}
.session-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accentColor);
}
.progress-text {
  font-size: 0.85rem;
  opacity: 0.55;
}
.btn-ghost {
  background: none;
  border: none;
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.875rem;
  opacity: 0.55;
  transition: opacity 0.2s;
  padding: 0.25rem 0.5rem;
}
.btn-ghost:hover { opacity: 1; }

/* ── Progress bar ── */
.progress-bar-track {
  height: 0.25rem;
  background: var(--secondaryColor);
}
.progress-bar-fill {
  height: 100%;
  background: var(--accentColor);
  transition: width 0.3s ease;
}

/* ── Card area ── */
.card-area {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 2rem 1.5rem 1rem;
}

/* ── Rating buttons ── */
.ratings {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem 2.5rem;
  flex-wrap: wrap;
}
.rating-btn {
  padding: 0.6rem 1.4rem;
  border: 0.125rem solid var(--rating-color);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--rating-color);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  min-width: 5rem;
}
.rating-btn:hover {
  background: var(--rating-color);
  color: #fff;
}

/* ── Summary ── */
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  flex: 1;
  padding: 3rem 1.5rem;
  text-align: center;
}
.summary-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}
.summary-sub {
  font-size: 1rem;
  opacity: 0.6;
  margin: 0;
}
.summary-grid {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}
.summary-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 1rem 1.5rem;
  border: 0.125rem solid;
  border-radius: 0.75rem;
  min-width: 5rem;
}
.summary-count {
  font-size: 2rem;
  font-weight: 700;
}
.summary-label {
  font-size: 0.8rem;
  opacity: 0.65;
}
.btn-primary {
  padding: 0.7rem 2rem;
  background: var(--accentColor);
  color: var(--primaryColor);
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.85; }

/* ── Fade transition ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
</style>
