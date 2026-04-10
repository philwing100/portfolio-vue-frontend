/**
 * Lightweight singleton that bridges Study.vue → StudySession.vue.
 *
 * Study.vue populates `cards`, sets `title`, and attaches `onRate` before
 * navigating to /study/session.  StudySession.vue reads `cards` and calls
 * `onRate` after each rating so the source data is kept in sync.
 */
const session = {
  /** @type {Array<{id, setId, front, back, anki}>} */
  cards: [],

  /** Human-readable label shown in the session header. */
  title: 'Study Session',

  /**
   * Async callback set by Study.vue.
   * Receives (cardId, setId, rating) where rating is 0=Again/1=Hard/2=Good/3=Easy.
   * Posts review to the backend (if authenticated) or applies local SM-2 as fallback.
   * @type {((cardId: string|number, setId: string|number, rating: 0|1|2|3) => Promise<void>) | null}
   */
  onRate: null,
};

export default session;
