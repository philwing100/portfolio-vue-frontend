<template>
  <div class="study-page">
    <!-- Top row ─────────────────────────────────────────── -->
    <div class="top-row">
      <div class="breadcrumb">
        <router-link to="/study" class="breadcrumb-link">Study</router-link>
        <template v-for="folder in getFolderPath()" :key="folder.id">
          <span class="breadcrumb-sep">›</span>
          <router-link :to="`/study/folder/${folder.id}`" class="breadcrumb-link">{{ folder.title }}</router-link>
        </template>
      </div>

      <div class="top-actions">
        <button
          class="anki-all-btn"
          :disabled="totalDue === 0 || loading"
          @click="startAnkiAll"
        >
          ANKI All
          <span v-if="totalDue > 0" class="anki-badge">{{ totalDue }}</span>
        </button>
        <button
          class="settings-btn"
          @click="showSettingsModal = true"
          title="Study settings"
          aria-label="Study settings"
        >
          <i class="fa-solid fa-gear"></i>
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="loading-bar" />

    <!-- ANKI explanation (root only, dismissible) -->
    <Transition name="fade">
      <div v-if="showAnkiInfo && !folderId" class="anki-info">
        <div class="anki-info-body">
          <div class="anki-info-icon">🧠</div>
          <div class="anki-info-text">
            <strong>Spaced Repetition</strong> — Cards you find hard reappear sooner; easy ones
            come back days or weeks later. Rate each card <em>Again / Hard / Good / Easy</em> after
            flipping to let the algorithm schedule the next review.
          </div>
          <button class="anki-info-close" @click="dismissAnkiInfo" title="Dismiss">✕</button>
        </div>
      </div>
    </Transition>

    <!-- Folder structure / drop zones ───────────────────── -->
    <FolderTree
      :folders="folders"
      :currentFolderId="folderId"
      @navigate="navigateToFolder"
      @reparent="handleReparent"
    />

    <!-- Content grid ────────────────────────────────────── -->
    <draggable
      class="content-grid"
      :list="draggableFolderItems"
      :group="{ name: 'flashcard-items', pull: 'clone', put: false }"
      :sort="false"
      :clone="cloneItem"
      item-key="id"
      v-if="visibleFolders.length"
    >
      <template #item="{ element }">
        <FolderCard
          :folder="element"
          :setCount="setsInFolder(element.id).length"
          @click="$router.push(`/study/folder/${element.id}`)"
          @edit="openFolderModal"
          @delete="confirmDeleteFolder"
        />
      </template>
    </draggable>

    <draggable
      class="content-grid"
      :list="draggableSetItems"
      :group="{ name: 'flashcard-items', pull: 'clone', put: false }"
      :sort="false"
      :clone="cloneItem"
      item-key="id"
      v-if="visibleSets.length"
    >
      <template #item="{ element }">
        <SetCard
          :set="element"
          :dueCount="element.dueCount ?? getDueCount(element.cards)"
          @study="startSetStudy(element)"
          @edit="openSetModal"
          @delete="confirmDeleteSet"
        />
      </template>
    </draggable>

    <div class="content-grid">
      <!-- Add-tile: New Folder -->
      <div class="add-tile" @click="openFolderModal(null)">
        <span class="add-tile-icon">📁</span>
        New Folder
      </div>

      <!-- Add-tile: New Set -->
      <div class="add-tile" @click="openSetModal(null)">
        <span class="add-tile-icon">📚</span>
        New Set
      </div>
    </div>

    <!-- Modals ───────────────────────────────────────────── -->
    <FolderModal
      :isOpen="showFolderModal"
      :folder="selectedFolder"
      :allFolders="folders"
      @save="saveFolder"
      @close="showFolderModal = false"
    />
    <ConfirmDialog
      :isOpen="showDeleteConfirm"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      confirmLabel="Delete"
      @confirm="executeDelete"
      @close="showDeleteConfirm = false"
    />
    <StudySettingsModal
      :isOpen="showSettingsModal"
      :settings="studySettings"
      :isMobile="isMobile"
      @save="onSettingsSave"
      @close="showSettingsModal = false"
    />
  </div>
</template>

<script>
import FolderCard    from '@/components/FlashcardComponents/FolderCard.vue';
import SetCard       from '@/components/FlashcardComponents/SetCard.vue';
import FolderModal   from '@/components/FlashcardComponents/FolderModal.vue';
import FolderTree    from '@/components/FlashcardComponents/FolderTree.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import StudySettingsModal from '@/components/FlashcardComponents/StudySettingsModal.vue';
import draggable     from 'vuedraggable';
import session       from '@/studySession.js';
import { getDueCount, buildSession, reviewCard } from '@/anki';
import { flashcardApi, normalizeSet, normalizeCard, flattenFolderTree, normalizeAnkiResponse } from '@/api/flashcards';
import { loadSettings, saveSettings } from '@/studySettings.js';

const LS_KEY        = 'study-data';
const ANKI_INFO_KEY = 'study-anki-info-dismissed';

const DEFAULT_FOLDERS = [
  { id: 1, title: 'Languages',        color: '#4CAF50', parentFolderId: null },
  { id: 2, title: 'Computer Science', color: '#2196F3', parentFolderId: null },
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
  components: { FolderCard, SetCard, FolderModal, FolderTree, ConfirmDialog, StudySettingsModal, draggable },

  props: {
    folderId: { type: [String, Number], default: null },
  },

  data() {
    return {
      folders:              [],
      sets:                 [],
      loading:              false,
      showFolderModal:      false,
      selectedFolder:       null,
      showDeleteConfirm:    false,
      deleteConfirmTitle:   '',
      deleteConfirmMessage: '',
      pendingDeleteType:    null,
      pendingDeleteId:      null,
      showAnkiInfo:         !localStorage.getItem(ANKI_INFO_KEY),
      showSettingsModal:    false,
      studySettings:        loadSettings(),
      isMobile:             typeof window !== 'undefined' && window.innerWidth <= 768,
    };
  },

  computed: {
    isAuthenticated() { return this.$store.state.isAuthenticated; },

    currentFolder() {
      return this.folderId
        ? this.folders.find(f => f.id === this.folderId) ?? null
        : null;
    },

    visibleFolders() {
      return this.folderId
        ? this.folders.filter(f => f.parentFolderId === this.folderId)
        : this.folders.filter(f => f.parentFolderId == null);
    },

    visibleSets() {
      return this.folderId
        ? this.sets.filter(s => s.folderId === this.folderId)
        : this.sets.filter(s => s.folderId == null);
    },

    totalDue() {
      const src = this.folderId ? this.visibleSets : this.sets;
      return src.reduce((n, s) => n + (s.dueCount ?? getDueCount(s.cards)), 0);
    },

    draggableFolderItems() {
      return this.visibleFolders.map(f => ({ ...f, __type: 'folder' }));
    },
    draggableSetItems() {
      return this.visibleSets.map(s => ({ ...s, __type: 'set' }));
    },
  },

  async created() {
    await this.loadData();
  },

  activated() {
    this.loadFromLocalStorage();
  },

  mounted() {
    window.addEventListener('resize', this.updateIsMobile);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.updateIsMobile);
  },

  watch: {
    // Folder navigation — refetch sets for the new scope (direct children only).
    folderId: {
      handler() {
        this.loadFromLocalStorage();
        if (this.isAuthenticated) this.refreshCurrentFolderSets();
      },
    },
  },

  methods: {
    // ── Data loading ──────────────────────────────────────────────────────

    async loadData() {
      this.loadFromLocalStorage();
      try {
        await this.$store.dispatch('checkAuth');
        if (!this.isAuthenticated) return;
        await this.loadFromBackend();
      } catch { /* remain on cached data */ }
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
      this.$store.commit('SET_FOLDERS', this.folders);
      this.$store.commit('SET_SETS',    this.sets);
    },

    async loadFromBackend() {
      // Two calls replace the old (1 + 1 + N) fan-out:
      //   1) GET /folders/tree      — authoritative folder structure (no client-side tree building)
      //   2) GET /folders/:id       — sets that are direct children of the current view (root if folderId is null)
      // Set cards are fetched lazily at study time (startSetStudy / startAnkiAll).
      this.loading = true;
      try {
        await Promise.all([this.refreshFolderTree(), this.refreshCurrentFolderSets()]);
        this.persist();
      } finally {
        this.loading = false;
      }
    },

    async refreshFolderTree() {
      try {
        const tree = await flashcardApi.getFolderTree();
        this.folders = flattenFolderTree(tree);
        this.$store.commit('SET_FOLDERS', this.folders);
        this.persist();
      } catch (err) {
        console.warn('Folder tree fetch failed; keeping cached structure:', err);
      }
    },

    async refreshCurrentFolderSets() {
      try {
        const view = await flashcardApi.getFolderView(this.folderId ?? 'root');
        const directSets = Array.isArray(view?.sets) ? view.sets.map(normalizeSet) : [];
        // Merge: replace any sets for this scope, keep sets from other scopes cached
        const scope = this.folderId ?? null;
        const otherScopeSets = this.sets.filter(s => (s.folderId ?? null) !== scope);
        this.sets = [...otherScopeSets, ...directSets];
        this.$store.commit('SET_SETS', this.sets);
        this.persist();
      } catch (err) {
        console.warn('Folder view fetch failed; keeping cached sets:', err);
      }
    },

    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify({ folders: this.folders, sets: this.sets }));
      this.$store.commit('SET_FOLDERS', this.folders);
      this.$store.commit('SET_SETS',    this.sets);
    },

    // ── Helpers ───────────────────────────────────────────────────────────

    getDueCount,
    setsInFolder(folderId) { return this.sets.filter(s => s.folderId === folderId); },
    nextId(arr)            { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; },

    getFolderPath() {
      const path = [];
      let current = this.folderId;
      while (current) {
        const folder = this.folders.find(f => f.id === current);
        if (!folder) break;
        path.unshift(folder);
        current = folder.parentFolderId;
      }
      return path;
    },

    dismissAnkiInfo() {
      this.showAnkiInfo = false;
      localStorage.setItem(ANKI_INFO_KEY, '1');
    },

    updateIsMobile() {
      this.isMobile = window.innerWidth <= 768;
    },

    onSettingsSave(settings) {
      this.studySettings = saveSettings(settings);
      this.showSettingsModal = false;
    },

    launchMediaSession(sets, title) {
      const cards = buildSession(sets, 'study');
      if (!cards.length) return;
      session.cards  = cards;
      session.title  = title;
      session.onRate = null;  // media mode never updates ANKI state
      this.$router.push({ name: 'MediaStudy' });
    },

    // ── Drag & drop ───────────────────────────────────────────────────────

    cloneItem(item) { return { ...item }; },

    navigateToFolder(id) {
      this.$router.push(id == null ? '/study' : `/study/folder/${id}`);
    },

    handleReparent({ type, id, targetFolderId }) {
      if (type === 'folder') {
        if (id === targetFolderId) return;
        if (this._isDescendant(targetFolderId, id)) return;
        const folder = this.folders.find(f => f.id === id);
        if (!folder || folder.parentFolderId === targetFolderId) return;

        const previousParentId = folder.parentFolderId;
        folder.parentFolderId = targetFolderId;
        this.persist();

        if (this.isAuthenticated) {
          flashcardApi.moveFolder(id, targetFolderId)
            .then(() => this.refreshFolderTree())
            .catch(err => {
              console.warn('Reparent folder sync failed:', err);
              folder.parentFolderId = previousParentId; // Revert local change
              this.persist();
            });
        }
      } else if (type === 'set') {
        const set = this.sets.find(s => s.id === id);
        if (!set || set.folderId === targetFolderId) return;

        const previousFolderId = set.folderId;
        set.folderId = targetFolderId;
        this.persist();

        if (this.isAuthenticated) {
          flashcardApi.moveSet(id, targetFolderId).catch(err => {
            console.warn('Reparent set sync failed:', err);
            set.folderId = previousFolderId; // Revert local change
            this.persist();
          });
        }
      }
    },

    _isDescendant(candidateId, ancestorId) {
      let cur = candidateId;
      while (cur != null) {
        if (cur === ancestorId) return true;
        const f = this.folders.find(x => x.id === cur);
        cur = f ? f.parentFolderId : null;
      }
      return false;
    },

    // ── Session launchers ─────────────────────────────────────────────────

    async startAnkiAll() {
      // Offline: fall back to whatever sets we have loaded locally.
      if (!this.isAuthenticated) {
        this.launchSession(this.folderId ? this.visibleSets : this.sets, 'due', 'ANKI All');
        return;
      }
      // Online: ask the backend for the recursive due/new card list directly — no need
      // to have sets' cards hydrated locally.
      this.loading = true;
      try {
        const res = this.folderId
          ? await flashcardApi.getFolderStudy(this.folderId)
          : await flashcardApi.getAllCards();
        const rawCards = Array.isArray(res) ? res : (res?.cards ?? []);
        const cards = rawCards.map(c => normalizeCard(c, c.set_id));
        this.launchCardsSession(cards, 'ANKI All');
      } catch (err) {
        console.warn('ANKI All fetch failed, falling back to local cache:', err);
        this.launchSession(this.folderId ? this.visibleSets : this.sets, 'due', 'ANKI All');
      } finally {
        this.loading = false;
      }
    },

    async startSetStudy(set) {
      // Cards are lazy-loaded. If this set's cards aren't hydrated yet, fetch now.
      let full = set;
      if (this.isAuthenticated && (!set.cards || set.cards.length === 0)) {
        this.loading = true;
        try {
          const data = await flashcardApi.getSet(set.id);
          full = normalizeSet(data);
          // Cache the hydrated cards for subsequent launches without a refetch.
          const idx = this.sets.findIndex(s => s.id === set.id);
          if (idx !== -1) this.sets[idx] = full;
          this.persist();
        } catch (err) {
          console.warn('Set fetch failed, using cached data:', err);
        } finally {
          this.loading = false;
        }
      }
      if (this.isMobile && this.studySettings.flashcardsType === 'media') {
        this.launchMediaSession([full], full.title);
      } else {
        this.launchSession([full], 'study', full.title);
      }
    },

    launchCardsSession(cards, title) {
      if (!cards.length) return;
      // Shuffle so the order isn't predictable across launches.
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      session.cards = cards;
      session.title = title;
      const isAuth  = this.isAuthenticated;
      session.onRate = async (cardId, setId, rating) => {
        if (isAuth) {
          try {
            const res = await flashcardApi.reviewCard(cardId, rating);
            this._applyAnkiUpdate(cardId, setId, normalizeAnkiResponse(res));
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
            this._applyAnkiUpdate(cardId, setId, normalizeAnkiResponse(res));
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

    // ── Folder CRUD ───────────────────────────────────────────────────────

    openFolderModal(folder) {
      if (!folder && this.folderId) {
        folder = { id: null, title: '', color: '#4CAF50', parentFolderId: this.folderId };
      }
      this.selectedFolder  = folder;
      this.showFolderModal = true;
    },

    saveFolder(folder) {
      const isNew = folder.id == null;
      if (isNew) {
        folder.id = this.nextId(this.folders);
        this.folders.push(folder);
      } else {
        const idx = this.folders.findIndex(f => f.id === folder.id);
        if (idx !== -1) this.folders[idx] = folder;
      }
      this.persist();
      this.showFolderModal = false;

      if (this.isAuthenticated) this._syncFolderToBackend(folder, isNew);
    },

    async _syncFolderToBackend(folder, isNew) {
      try {
        if (isNew) {
          const res = await flashcardApi.createFolder(folder);
          const backendId = res?.folder_id ?? res?.id;
          if (backendId && backendId !== folder.id) {
            const oldId = folder.id;
            const f = this.folders.find(x => x.id === oldId);
            if (f) f.id = backendId;
            this.folders.forEach(c => { if (c.parentFolderId === oldId) c.parentFolderId = backendId; });
            this.sets.forEach(s => { if (s.folderId === oldId) s.folderId = backendId; });
            this.persist();
          }
        } else {
          await flashcardApi.updateFolder(folder.id, folder);
        }
        // Always reconcile the local tree with the backend after a folder write.
        await this.refreshFolderTree();
      } catch (err) {
        console.warn('Backend folder save failed:', err);
      }
    },

    confirmDeleteFolder(folderId) {
      const folder = this.folders.find(f => f.id === folderId);
      if (!folder) return;
      this.pendingDeleteType    = 'folder';
      this.pendingDeleteId      = folderId;
      this.deleteConfirmTitle   = 'Delete Folder?';
      this.deleteConfirmMessage = `Delete "${folder.title}"? Sub-folders and sets will be moved up one level.`;
      this.showDeleteConfirm    = true;
    },

    async _executeDeleteFolder(folderId) {
      if (this.isAuthenticated) {
        try {
          await flashcardApi.deleteFolder(folderId);
          await this.refreshFolderTree();
        } catch (err) { console.warn('Backend folder delete failed:', err); }
      }
      const deleted = this.folders.find(f => f.id === folderId);
      // Reparent child folders
      this.folders.forEach(f => {
        if (f.parentFolderId === folderId) f.parentFolderId = deleted?.parentFolderId ?? null;
      });
      // Reparent sets
      this.sets.forEach(s => {
        if (s.folderId === folderId) s.folderId = deleted?.parentFolderId ?? null;
      });
      this.folders = this.folders.filter(f => f.id !== folderId);
      this.persist();
    },

    // ── Set CRUD ──────────────────────────────────────────────────────────

    openSetModal(set) {
      if (set) { this.$router.push(`/study/set/${set.id}`); return; }
      // When creating a new set from inside a folder, inherit the current folder as the parent
      this.$router.push({
        path: '/study/set/new',
        query: this.folderId ? { folderId: this.folderId } : {},
      });
    },

    confirmDeleteSet(setId) {
      const set = this.sets.find(s => s.id === setId);
      if (!set) return;
      this.pendingDeleteType    = 'set';
      this.pendingDeleteId      = setId;
      this.deleteConfirmTitle   = 'Delete Set?';
      this.deleteConfirmMessage = `Delete "${set.title}"? This cannot be undone.`;
      this.showDeleteConfirm    = true;
    },

    async _executeDeleteSet(setId) {
      if (this.isAuthenticated) {
        try { await flashcardApi.deleteSet(setId); } catch (err) { console.warn('Backend delete failed:', err); }
      }
      this.sets = this.sets.filter(s => s.id !== setId);
      this.persist();
    },

    async executeDelete() {
      if (this.pendingDeleteType === 'folder') {
        await this._executeDeleteFolder(this.pendingDeleteId);
      } else if (this.pendingDeleteType === 'set') {
        await this._executeDeleteSet(this.pendingDeleteId);
      }
      this.pendingDeleteType = null;
      this.pendingDeleteId   = null;
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
  height: 3.75rem;
  background-color: var(--primaryColor);
  border-bottom: 0.0625rem solid var(--secondaryColor);
  position: sticky;
  top: 0;
  z-index: 3;
  gap: 1rem;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: nowrap;
  overflow: hidden;
  min-width: 0;
}
.breadcrumb-link {
  color: var(--accentColor);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.7;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.breadcrumb-link:hover { opacity: 1; }
.breadcrumb-link:last-child { opacity: 1; }
.breadcrumb-sep {
  color: var(--accentColor);
  opacity: 0.4;
  font-size: 1rem;
  flex-shrink: 0;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.anki-all-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1.1rem;
  background: var(--accentColor);
  color: var(--primaryColor);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: transparent;
  color: var(--accentColor);
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.15s, opacity 0.15s;
  flex-shrink: 0;
}
.settings-btn:hover {
  background: var(--secondaryColor);
}
.anki-all-btn:hover    { opacity: 0.85; }
.anki-all-btn:disabled { opacity: 0.3; cursor: default; }
.anki-badge {
  background: #e53935;
  color: #fff;
  padding: 0.08rem 0.4rem;
  border-radius: 0.75rem;
  font-size: 0.72rem;
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

/* ── ANKI info banner ── */
.anki-info {
  margin: 1rem 1.5rem 0;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 0.0625rem solid var(--secondaryColor);
}
.anki-info-body {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--secondaryColor);
}
.anki-info-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
  line-height: 1.4;
}
.anki-info-text {
  flex: 1;
  font-size: 0.85rem;
  color: var(--accentColor);
  opacity: 0.85;
  line-height: 1.6;
}
.anki-info-close {
  background: none;
  border: none;
  color: var(--accentColor);
  opacity: 0.45;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.15rem;
  flex-shrink: 0;
  transition: opacity 0.15s;
  line-height: 1;
  align-self: flex-start;
}
.anki-info-close:hover { opacity: 0.9; }

/* ── Grid ── */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
}
.add-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 0.125rem dashed var(--accentColor);
  border-radius: 0.75rem;
  padding: 1.25rem;
  min-height: 4.5rem;
  cursor: pointer;
  color: var(--accentColor);
  opacity: 0.38;
  font-size: 0.85rem;
  transition: opacity 0.15s, transform 0.12s;
  user-select: none;
}
.add-tile:hover { opacity: 0.75; transform: translateY(-2px); }
.add-tile-icon  { font-size: 1.3rem; }

/* ── Transitions ── */
.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 36rem) {
  .top-row {
    padding: 0 1rem;
  }
  .content-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 0.6rem;
  }
  .anki-info {
    margin: 0.75rem 1rem 0;
  }
}
</style>
