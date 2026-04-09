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
   * Callback set by Study.vue.
   * @type {((cardId: number, setId: number, updatedAnki: object) => void) | null}
   */
  onRate: null,
};

export default session;
