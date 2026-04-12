/**
 * Flashcard REST API client.
 *
 * Endpoints (all under /api/flashcards/*):
 *   GET    /sets                  — list all sets (metadata + card_count)
 *   POST   /sets                  — create set
 *   GET    /sets/:id              — get set + all cards with SM-2 state
 *   PUT    /sets/:id              — update set metadata
 *   DELETE /sets/:id              — delete set (cascades to cards)
 *   POST   /sets/:id/cards        — add one or many cards
 *   PUT    /cards/:id             — update card term/definition
 *   DELETE /cards/:id             — delete card
 *   POST   /cards/:id/review      — submit review grade, returns updated SM-2 state
 *   GET    /study                 — get due + new cards across all sets
 *
 * MISSING BACKEND ROUTES (flag to backend dev):
 *   - GET /sets should include due_count per set to avoid N+1 fetches on page load
 *   - GET /study should include set_id per card so reviews can update the correct set
 *   - No folder endpoints; folderId is serialized into the set's description JSON instead
 */

import { instance as axios } from '@/axios';

// Backend wraps all responses as { success, data, ... }. Unwrap to the payload.
const unwrap = r => (r.data && 'data' in r.data ? r.data.data : r.data);

// Map frontend 4-point rating → backend 6-point SM-2 grade
// 0=Again→1(fail), 1=Hard→3(pass/hard), 2=Good→4(pass/good), 3=Easy→5(pass/easy)
const GRADE_MAP = [1, 3, 4, 5];

// ── Normalization: backend shape → frontend shape ──────────────────────────

export function normalizeCard(c, setId) {
  return {
    id:    c.card_id,
    front: c.term,
    back:  c.definition,
    setId,
    anki: c.repetitions === 0 ? null : {
      easeFactor:  c.ease_factor,
      interval:    c.interval_days,
      repetitions: c.repetitions,
      nextReview:  c.due_date,
    },
  };
}

/**
 * Normalize a backend set (with cards array) to the frontend set shape.
 * folderId and options are stored as JSON in the set's description field.
 */
export function normalizeSet(s) {
  let meta = {};
  try { meta = JSON.parse(s.description || '{}'); } catch { /* ignore bad JSON */ }
  return {
    id:       s.set_id,
    title:    s.title,
    folderId: meta.folderId ?? null,
    options:  meta.options  ?? { newPerDay: 20, orderMode: 'random' },
    cards:    (s.cards || []).map(c => normalizeCard(c, s.set_id)),
  };
}

/** Normalize a backend folder to the frontend folder shape. */
export function normalizeFolder(f) {
  return {
    id:             f.folder_id,
    title:          f.title,
    color:          f.color,
    parentFolderId: f.parent_folder_id ?? null,
  };
}

/** Normalize the SM-2 fields returned by POST /cards/:id/review */
export function normalizeAnkiResponse(d) {
  return {
    easeFactor:  d.ease_factor,
    interval:    d.interval_days,
    repetitions: d.repetitions,
    nextReview:  d.due_date,
  };
}

// ── Serialization: frontend shape → backend payload ────────────────────────

function serializeSetMeta(set) {
  return {
    title:       set.title,
    description: JSON.stringify({
      folderId: set.folderId ?? null,
      options:  set.options,
    }),
    tags: [],
  };
}

// ── API methods ────────────────────────────────────────────────────────────

export const flashcardApi = {
  // Folders
  getFolders:    ()           => axios.get('/flashcards/folders').then(unwrap),
  createFolder:  (folder)     => axios.post('/flashcards/folders', { title: folder.title, color: folder.color }).then(unwrap),
  updateFolder:  (id, folder) => axios.put(`/flashcards/folders/${id}`, { title: folder.title, color: folder.color }).then(unwrap),
  deleteFolder:  (id)         => axios.delete(`/flashcards/folders/${id}`).then(unwrap),

  // Sets
  getSets:   ()        => axios.get('/flashcards/sets').then(unwrap),
  getSet:    (id)      => axios.get(`/flashcards/sets/${id}`).then(unwrap),
  createSet: (set)     => axios.post('/flashcards/sets', serializeSetMeta(set)).then(unwrap),
  updateSet: (id, set) => axios.put(`/flashcards/sets/${id}`, serializeSetMeta(set)).then(unwrap),
  deleteSet: (id)      => axios.delete(`/flashcards/sets/${id}`).then(unwrap),

  // Cards — backend accepts a single object or an array
  addCards:   (setId, cards) => axios.post(
    `/flashcards/sets/${setId}/cards`,
    cards.map(c => ({ term: c.front, definition: c.back }))
  ).then(unwrap),
  updateCard: (id, card)     => axios.put(
    `/flashcards/cards/${id}`,
    { term: card.front, definition: card.back }
  ).then(unwrap),
  deleteCard: (id)           => axios.delete(`/flashcards/cards/${id}`).then(unwrap),

  // Review — posts grade, returns updated SM-2 state
  reviewCard: (cardId, rating) => axios.post(
    `/flashcards/cards/${cardId}/review`,
    { grade: GRADE_MAP[rating] }
  ).then(unwrap),
};
