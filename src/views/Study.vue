<template>
  <div class="study-page">
    <!-- Top row ─────────────────────────────────────── -->
    <div class="top-row">
      <div class="breadcrumb">
        <router-link v-if="folderId" to="/study" class="back-link">← Study</router-link>
        <span class="page-title">
          {{ folderId ? (currentFolder ? currentFolder.title : 'Folder') : 'Study' }}
        </span>
      </div>

      <button
        class="anki-all-btn"
        :disabled="totalDue === 0 || loading"
        @click="startAnkiAll"
      >
        ANKI All
        <span v-if="totalDue > 0" class="anki-badge">{{ totalDue }}</span>
      </button>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="loading-bar" />

    <!-- Content grid ────────────────────────────────── -->
    <div class="content-grid">
      <!-- Folders (root level only) -->
      <template v-if="!folderId">
        <FolderCard
          v-for="folder in folders"
          :key="folder.id"
          :folder="folder"
          :setCount="setsInFolder(folder.id).length"
          @click="$router.push(`/study/folder/${folder.id}`)"
          @edit="openFolderModal"
          @delete="deleteFolder"
        />
      </template>

      <!-- Sets -->
      <SetCard
        v-for="set in visibleSets"
        :key="set.id"
        :set="set"
        :dueCount="getDueCount(set.cards)"
        @study="startSetStudy(set)"
        @edit="openSetModal"
        @delete="deleteSet"
      />

      <!-- Add-tile: New Folder (root only) -->
      <div v-if="!folderId" class="add-tile" @click="openFolderModal(null)">
        <span class="add-tile-icon">📁</span>
        New Folder
      </div>

      <!-- Add-tile: New Set -->
      <div class="add-tile" @click="openSetModal(null)">
        <span class="add-tile-icon">📚</span>
        New Set
      </div>
    </div>

    <!-- Modals ───────────────────────────────────────── -->
    <FolderModal
      :isOpen="showFolderModal"
      :folder="selectedFolder"
      @save="saveFolder"
      @delete="deleteFolder"
      @close="showFolderModal = false"
    />
    <SetModal
      :isOpen="showSetModal"
      :set="selectedSet"
      :folders="folders"
      @save="saveSet"
      @delete="deleteSet"
      @close="showSetModal = false"
    />
  </div>
</template>

<script>
import FolderCard  from '@/components/FlashcardComponents/FolderCard.vue';
import SetCard     from '@/components/FlashcardComponents/SetCard.vue';
import FolderModal from '@/components/FlashcardComponents/FolderModal.vue';
import SetModal    from '@/components/FlashcardComponents/SetModal.vue';
import session     from '@/studySession.js';
import { getDueCount, buildSession, reviewCard } from '@/anki';
import { flashcardApi, normalizeSet, normalizeAnkiResponse } from '@/api/flashcards';

const LS_KEY = 'study-data';

const DEFAULT_FOLDERS = [
  { id: 1, title: 'Languages',        color: '#4CAF50' },
  { id: 2, title: 'Computer Science', color: '#2196F3' },
];

const DEFAULT_SETS = [
  {
    id: 1, title: 'Spanish Vocabulary', folderId: 1,
    options: { newPerDay: 20, orderMode: 'random' },
    cards: [
      { id: 1, front: 'Hello',     back: 'Hola',    anki: null },
      { id: 2, front: 'Goodbye',   back: 'Adiós',   anki: null },
      { id: 3, front: 'Thank you', back: 'Gracias', anki: null },
    ],
  },
  {
    id: 2, title: 'Data Structures', folderId: 2,
    options: { newPerDay: 10, orderMode: 'sequential' },
    cards: [
      { id: 1, front: 'Stack', back: 'LIFO — last in, first out',  anki: null },
      { id: 2, front: 'Queue', back: 'FIFO — first in, first out', anki: null },
    ],
  },
];

export default {
  name: 'StudyPage',
  components: { FolderCard, SetCard, FolderModal, SetModal },

  props: {
    folderId: { type: Number, default: null },
  },

  data() {
    return {
      folders:         [],
      sets:            [],
      loading:         false,
      showFolderModal: false,
      showSetModal:    false,
      selectedFolder:  null,
      selectedSet:     null,
    };
  },

  computed: {
    isAuthenticated() { return this.$store.state.isAuthenticated; },

    currentFolder() {
      return this.folderId
        ? this.folders.find(f => f.id === this.folderId) ?? null
        : null;
    },

    visibleSets() {
      return this.folderId
        ? this.sets.filter(s => s.folderId === this.folderId)
        : this.sets.filter(s => s.folderId == null);
    },

    totalDue() {
      const src = this.folderId ? this.visibleSets : this.sets;
      return src.reduce((n, s) => n + getDueCount(s.cards), 0);
    },
  },

  async created() {
    await this.loadData();
  },

  methods: {
    // ── Data loading ──────────────────────────────────────────────────────

    async loadData() {
      // Show cached data immediately for instant paint
      this.loadFromLocalStorage();

      try {
        await this.$store.dispatch('checkAuth');
        if (!this.isAuthenticated) return;
        await this.loadFromBackend();
      } catch {
        // Remain on cached data
      }
    },

    loadFromLocalStorage() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const { folders, sets } = JSON.parse(raw);
          this.folders = folders;
          this.sets    = sets;
        } else {
          this.folders = JSON.parse(JSON.stringify(DEFAULT_FOLDERS));
          this.sets    = JSON.parse(JSON.stringify(DEFAULT_SETS));
        }
      } catch {
        this.folders = JSON.parse(JSON.stringify(DEFAULT_FOLDERS));
        this.sets    = JSON.parse(JSON.stringify(DEFAULT_SETS));
      }
    },

    async loadFromBackend() {
      this.loading = true;
      try {
        // Fetch all sets (metadata) then load full card data in parallel
        const overviewRes = await flashcardApi.getSets();
        const overview    = overviewRes.data ?? [];

        const fullSets = await Promise.all(
          overview.map(s =>
            flashcardApi.getSet(s.set_id)
              .then(r => normalizeSet(r.data))
              .catch(() => null)
          )
        );

        this.sets = fullSets.filter(Boolean);
        this.persist(); // keep localStorage in sync with backend
      } finally {
        this.loading = false;
      }
    },

    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify({ folders: this.folders, sets: this.sets }));
    },

    // ── Helpers ───────────────────────────────────────────────────────────

    getDueCount,
    setsInFolder(folderId) { return this.sets.filter(s => s.folderId === folderId); },
    nextId(arr)            { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; },

    // ── Session launchers ─────────────────────────────────────────────────

    startAnkiAll() {
      const src = this.folderId ? this.visibleSets : this.sets;
      this.launchSession(src, 'due', 'ANKI All');
    },

    startSetStudy(set) {
      this.launchSession([set], 'study', set.title);
    },

    launchSession(sets, mode, title) {
      const cards = buildSession(sets, mode);
      if (!cards.length) return;

      session.cards = cards;
      session.title = title;

      const isAuth = this.isAuthenticated;

      session.onRate = async (cardId, setId, rating) => {
        if (isAuth) {
          try {
            const res = await flashcardApi.reviewCard(cardId, rating);
            this._applyAnkiUpdate(cardId, setId, normalizeAnkiResponse(res.data));
          } catch (err) {
            console.warn('Review sync failed, applying local SM-2:', err);
            this._localReview(cardId, setId, rating);
          }
        } else {
          this._localReview(cardId, setId, rating);
        }
        this.persist();
      };

      this.$router.push({ name: 'StudySession' });
    },

    _applyAnkiUpdate(cardId, setId, updatedAnki) {
      const set  = this.sets.find(s => s.id === setId);
      const card = set?.cards.find(c => c.id === cardId);
      if (card) card.anki = updatedAnki;
    },

    _localReview(cardId, setId, rating) {
      const set  = this.sets.find(s => s.id === setId);
      const card = set?.cards.find(c => c.id === cardId);
      if (card) card.anki = reviewCard(card.anki, rating);
    },

    // ── Folder CRUD (client-side only — no backend folder support) ─────────

    openFolderModal(folder) {
      this.selectedFolder  = folder;
      this.showFolderModal = true;
    },

    saveFolder(folder) {
      if (folder.id == null) {
        folder.id = this.nextId(this.folders);
        this.folders.push(folder);
      } else {
        const idx = this.folders.findIndex(f => f.id === folder.id);
        if (idx !== -1) this.folders[idx] = folder;
      }
      this.persist();
      this.showFolderModal = false;
    },

    deleteFolder(folderId) {
      this.folders = this.folders.filter(f => f.id !== folderId);
      this.sets.forEach(s => { if (s.folderId === folderId) s.folderId = null; });
      this.persist();
      this.showFolderModal = false;
    },

    // ── Set CRUD ──────────────────────────────────────────────────────────

    openSetModal(set) {
      this.selectedSet  = set ? { ...set, cards: set.cards.map(c => ({ ...c })) } : null;
      this.showSetModal = true;
    },

    async saveSet(set) {
      if (!this.isAuthenticated) {
        this._saveSetLocal(set);
        return;
      }
      try {
        if (set.id == null) {
          await this._createSetRemote(set);
        } else {
          await this._updateSetRemote(set);
        }
        this.persist();
        this.showSetModal = false;
      } catch (err) {
        console.warn('Backend save failed, saving locally:', err);
        this._saveSetLocal(set);
      }
    },

    async _createSetRemote(set) {
      if (this.folderId && set.folderId == null) set.folderId = this.folderId;
      const setRes  = await flashcardApi.createSet(set);
      const newId   = setRes.data.set_id;

      const validCards = set.cards.filter(c => c.front.trim() || c.back.trim());
      let savedCards = [];
      if (validCards.length) {
        const cardsRes = await flashcardApi.addCards(newId, validCards);
        savedCards = Array.isArray(cardsRes.data) ? cardsRes.data : [cardsRes.data];
      }

      this.sets.push({
        ...set,
        id:    newId,
        cards: savedCards.map((c, i) => ({ ...validCards[i], id: c.card_id, anki: null })),
      });
    },

    async _updateSetRemote(set) {
      await flashcardApi.updateSet(set.id, set);

      const oldSet     = this.sets.find(s => s.id === set.id);
      const oldCardIds = new Set(oldSet?.cards.map(c => c.id) ?? []);
      const keptIds    = new Set(set.cards.filter(c => c.id > 0).map(c => c.id));

      // Delete removed cards
      const deletedIds = [...oldCardIds].filter(id => !keptIds.has(id));
      await Promise.all(deletedIds.map(id => flashcardApi.deleteCard(id)));

      // Update existing cards (backend handles change detection via content hash)
      const existing = set.cards.filter(c => c.id > 0);
      await Promise.all(existing.map(c => flashcardApi.updateCard(c.id, c)));

      // Add new cards (negative tmp ids)
      const newCards    = set.cards.filter(c => c.id < 0);
      let addedCards    = [];
      if (newCards.length) {
        const res  = await flashcardApi.addCards(set.id, newCards);
        addedCards = Array.isArray(res.data) ? res.data : [res.data];
      }

      // Rebuild cards array preserving existing SM-2 state
      const finalCards = [
        ...existing.map(c => ({ ...c, anki: oldSet?.cards.find(o => o.id === c.id)?.anki ?? c.anki })),
        ...addedCards.map((c, i) => ({ ...newCards[i], id: c.card_id, anki: null })),
      ];

      const idx = this.sets.findIndex(s => s.id === set.id);
      if (idx !== -1) this.sets[idx] = { ...set, cards: finalCards };
    },

    _saveSetLocal(set) {
      if (set.id == null) {
        set.id = this.nextId(this.sets);
        if (this.folderId && set.folderId == null) set.folderId = this.folderId;
        let nextCardId = 1;
        set.cards.forEach(c => { c.id = nextCardId++; });
        this.sets.push(set);
      } else {
        const idx = this.sets.findIndex(s => s.id === set.id);
        if (idx !== -1) {
          const maxId = set.cards.reduce((m, c) => (c.id > 0 ? Math.max(m, c.id) : m), 0);
          let next = maxId + 1;
          set.cards.forEach(c => { if (c.id < 0) c.id = next++; });
          this.sets[idx] = set;
        }
      }
      this.persist();
      this.showSetModal = false;
    },

    async deleteSet(setId) {
      if (this.isAuthenticated) {
        try {
          await flashcardApi.deleteSet(setId);
        } catch (err) {
          console.warn('Backend delete failed:', err);
        }
      }
      this.sets = this.sets.filter(s => s.id !== setId);
      this.persist();
      this.showSetModal = false;
    },
  },
};
</script>

<style scoped>
.study-page {
  min-height: 100vh;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  overflow: auto;
}

/* ── Top row ── */
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 4rem;
  background-color: var(--primaryColor);
  border-bottom: 0.0625rem solid var(--secondaryColor);
  position: sticky;
  top: 0;
  z-index: 3;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.back-link {
  color: var(--accentColor);
  text-decoration: none;
  opacity: 0.6;
  font-size: 0.9rem;
  transition: opacity 0.2s;
}
.back-link:hover { opacity: 1; }
.page-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--accentColor);
}
.anki-all-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.2rem;
  background: var(--accentColor);
  color: var(--primaryColor);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.anki-all-btn:hover    { opacity: 0.85; }
.anki-all-btn:disabled { opacity: 0.35; cursor: default; }
.anki-badge {
  background: #e53935;
  color: #fff;
  padding: 0.1rem 0.45rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
}

/* ── Loading bar ── */
.loading-bar {
  height: 0.1875rem;
  background: linear-gradient(90deg, transparent, var(--accentColor), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* ── Grid ── */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
}
.add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 0.125rem dashed var(--accentColor);
  border-radius: 0.75rem;
  padding: 1.25rem;
  min-height: 5rem;
  cursor: pointer;
  color: var(--accentColor);
  opacity: 0.45;
  font-size: 0.9rem;
  transition: opacity 0.2s, transform 0.15s;
  user-select: none;
}
.add-tile:hover { opacity: 0.85; transform: translateY(-2px); }
.add-tile-icon  { font-size: 1.4rem; }
</style>
