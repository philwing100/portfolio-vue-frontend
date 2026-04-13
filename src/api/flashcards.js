/**
 * Flashcard REST API client.
 *
 * Endpoints (all under /api/flashcards/*):
 *   GET    /sets                    — list all sets; accepts ?folder_id= to scope
 *   POST   /sets                    — create set; accepts folder_id in body
 *   GET    /sets/:id                — get set + all cards with SM-2 state
 *   PUT    /sets/:id                — update set; accepts folder_id (null removes folder)
 *   DELETE /sets/:id                — delete set (cascades to cards)
 *   POST   /sets/:id/cards          — add one or many cards
 *   PUT    /cards/:id               — update card term/definition
 *   DELETE /cards/:id               — delete card
 *   POST   /cards/:id/review        — submit review grade, returns updated SM-2 state
 *   GET    /cards/all               — all due+new cards; optional ?page=&limit=
 *   GET    /study/folder/:folderId  — folder-scoped study session (recursive)
 *   GET    /folders                 — list folders; returns parent_folder_id per folder
 *   POST   /folders                 — create folder; accepts parent_folder_id
 *   PUT    /folders/:id             — update folder; parent_folder_id key triggers reparent
 *   DELETE /folders/:id             — delete (ON DELETE SET NULL cleans up children)
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
 * folder_id is now a first-class backend field; options are still in description JSON.
 */
export function normalizeSet(s) {
  let meta = {};
  try { meta = JSON.parse(s.description || '{}'); } catch { /* ignore bad JSON */ }
  return {
    id:       s.set_id,
    title:    s.title,
    // Prefer backend's folder_id; fall back to legacy description JSON for older records
    folderId: s.folder_id ?? meta.folderId ?? null,
    options:  meta.options ?? { newPerDay: 20, orderMode: 'random' },
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

function serializeSetPayload(set) {
  return {
    title:     set.title,
    folder_id: set.folderId ?? null,
    // options remain in description; backend has no native field for them
    description: JSON.stringify({ options: set.options }),
    tags: [],
  };
}

// ── API methods ────────────────────────────────────────────────────────────

export const flashcardApi = {
  // Folders
  getFolders:   ()           => axios.get('/flashcards/folders').then(unwrap),
  createFolder: (folder)     => axios.post('/flashcards/folders', {
    title:            folder.title,
    color:            folder.color,
    parent_folder_id: folder.parentFolderId ?? null,
  }).then(unwrap),
  updateFolder: (id, folder) => axios.put(`/flashcards/folders/${id}`, {
    title:            folder.title,
    color:            folder.color,
    // Always include parent_folder_id (even as null) so the backend triggers a reparent
    parent_folder_id: folder.parentFolderId ?? null,
  }).then(unwrap),
  deleteFolder: (id)         => axios.delete(`/flashcards/folders/${id}`).then(unwrap),

  // Sets
  getSets:   (params)  => axios.get('/flashcards/sets', { params }).then(unwrap),
  getSet:    (id)      => axios.get(`/flashcards/sets/${id}`).then(unwrap),
  createSet: (set)     => axios.post('/flashcards/sets', serializeSetPayload(set)).then(unwrap),
  updateSet: (id, set) => axios.put(`/flashcards/sets/${id}`, serializeSetPayload(set)).then(unwrap),
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

  // All due+new cards across all sets (optional pagination)
  getAllCards: (params) => axios.get('/flashcards/cards/all', { params }).then(unwrap),

  // Folder-scoped study session — returns due+new cards recursively for a folder
  getFolderStudy: (folderId) => axios.get(`/flashcards/study/folder/${folderId}`).then(unwrap),
};
