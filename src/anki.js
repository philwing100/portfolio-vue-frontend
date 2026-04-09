import { getTodayDate } from '@/date';

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

export const RATINGS = [
  { value: 0, label: 'Again', color: '#e53935' },
  { value: 1, label: 'Hard',  color: '#fb8c00' },
  { value: 2, label: 'Good',  color: '#43a047' },
  { value: 3, label: 'Easy',  color: '#1e88e5' },
];

/** Default ANKI state for a brand-new card. */
export function initAnki() {
  return { easeFactor: DEFAULT_EASE, interval: 0, repetitions: 0, nextReview: null };
}

/**
 * SM-2 review algorithm.
 * @param {Object|null} ankiState - Current ANKI state (or null for new card).
 * @param {0|1|2|3}     rating    - 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns Updated ANKI state.
 */
export function reviewCard(ankiState, rating) {
  let { easeFactor, interval, repetitions } = ankiState ?? initAnki();

  if (rating === 0) {
    // Again — reset streak
    interval = 1;
    repetitions = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1)      interval = 1;
    else if (repetitions === 2) interval = 6;
    else                        interval = Math.round(interval * easeFactor);

    const delta = 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02);
    easeFactor = Math.max(MIN_EASE, easeFactor + delta);
  }

  const nextReview = addDays(getTodayDate(), interval);
  return { easeFactor, interval, repetitions, nextReview };
}

/** True if the card has been reviewed before and is due today or overdue. */
export function isDue(card) {
  return !!(card.anki?.nextReview && card.anki.nextReview <= getTodayDate());
}

/** True if the card has never been reviewed. */
export function isNew(card) {
  return !card.anki || card.anki.repetitions === 0;
}

/** Count of due cards in an array. */
export function getDueCount(cards) {
  return cards.filter(isDue).length;
}

/**
 * Build a shuffled session card list from one or more sets.
 * @param {Array}   sets  - Array of set objects with .cards
 * @param {'due'|'study'} mode
 *   'due'   = only cards already due (ANKI All)
 *   'study' = due cards + new cards up to set.options.newPerDay
 */
export function buildSession(sets, mode = 'due') {
  const sessionCards = [];
  for (const set of sets) {
    const due = set.cards
      .filter(isDue)
      .map(c => ({ ...c, setId: set.id }));
    sessionCards.push(...due);

    if (mode === 'study') {
      const limit = set.options?.newPerDay ?? 20;
      const newCards = set.cards
        .filter(isNew)
        .slice(0, limit)
        .map(c => ({ ...c, setId: set.id }));
      sessionCards.push(...newCards);
    }
  }
  return shuffle(sessionCards);
}

// ── helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
