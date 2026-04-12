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
      <div class="card-area" @click="flipCard">
        <FlashcardDisplay ref="flashcard" :card="currentCard" @flip="showRatings = true" />
        <p v-if="!showRatings" class="flip-hint">click or press <kbd>Space</kbd> to reveal</p>
      </div>

      <!-- Rating buttons (visible after flip) -->
      <Transition name="slide-up">
        <div v-if="showRatings" class="ratings">
          <button
            v-for="r in RATINGS"
            :key="r.value"
            class="rating-btn"
            :style="{ '--rating-color': r.color }"
            @click="rate(r.value)"
          >
            <span class="rating-label">{{ r.label }}</span>
            <span class="rating-key">{{ r.value + 1 }}</span>
          </button>
        </div>
      </Transition>

      <!-- Keyboard hint -->
      <p v-if="showRatings" class="key-hint">Press 1–4 to rate</p>
    </template>
  </div>
</template>

<script>
import FlashcardDisplay from '@/components/FlashcardComponents/FlashcardDisplay.vue';
import session          from '@/studySession.js';
import { RATINGS } from '@/anki';

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
      results: [],
      RATINGS,
      rating: false,  // debounce flag
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

  mounted() {
    window.addEventListener('keydown', this.onKeyDown);
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  },

  methods: {
    flipCard() {
      this.$refs.flashcard?.flip();
    },

    onKeyDown(e) {
      if (this.done) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.$router.push('/study');
        }
        return;
      }

      if (e.code === 'Space' && !this.showRatings) {
        e.preventDefault();
        this.flipCard();
        return;
      }

      if (this.showRatings && !this.rating) {
        const keyRating = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key];
        if (keyRating !== undefined) {
          e.preventDefault();
          this.rate(keyRating);
        }
      }

      if (e.code === 'Escape') {
        this.$router.push('/study');
      }
    },

    async rate(rating) {
      if (this.rating) return;  // prevent double-tap
      this.rating = true;

      const card = this.currentCard;
      if (!card) { this.rating = false; return; }

      this.results.push({ card, rating });
      if (session.onRate) await session.onRate(card.id, card.setId, rating);
      this.advance();

      this.rating = false;
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
  transition: opacity 0.15s;
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
  transition: width 0.25s ease;
}

/* ── Card area ── */
.card-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem 0.5rem;
  cursor: pointer;
}
.flip-hint {
  margin-top: 1rem;
  font-size: 0.78rem;
  color: var(--accentColor);
  opacity: 0.4;
  user-select: none;
}
kbd {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  border: 0.0625rem solid currentColor;
  border-radius: 0.2rem;
  font-size: 0.72rem;
  font-family: inherit;
}

/* ── Rating buttons ── */
.ratings {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  padding: 1rem 1rem 1.5rem;
  flex-wrap: wrap;
}
.rating-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 1.2rem;
  border: 0.125rem solid var(--rating-color);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--rating-color);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.08s, color 0.08s, transform 0.05s;
  min-width: 4.5rem;
}
.rating-btn:hover {
  background: var(--rating-color);
  color: #fff;
}
.rating-btn:active {
  background: var(--rating-color);
  color: #fff;
  transform: scale(0.95);
}
.rating-key {
  font-size: 0.65rem;
  opacity: 0.6;
  font-weight: 400;
}
.key-hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--accentColor);
  opacity: 0.35;
  padding-bottom: 1.5rem;
  margin: 0;
  user-select: none;
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
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.85; }

/* ── Transitions ── */
.slide-up-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.slide-up-leave-active { transition: opacity 0.1s ease; }
.slide-up-enter-from   { opacity: 0; transform: translateY(0.75rem); }
.slide-up-leave-to     { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 36rem) {
  .ratings {
    gap: 0.4rem;
    padding: 0.75rem 0.5rem 1.25rem;
  }
  .rating-btn {
    min-width: 3.75rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.82rem;
  }
}
</style>
