<template>
  <div class="study-page">
    <!-- Top row ─────────────────────────────────────── -->
    <div class="top-row">
      <div class="breadcrumb">
        <router-link to="/study" class="breadcrumb-link">Study</router-link>
        <template v-for="folder in getFolderPath()" :key="folder.id">
          <span class="breadcrumb-sep">→</span>
          <router-link :to="`/study/folder/${folder.id}`" class="breadcrumb-link">{{ folder.title }}</router-link>
        </template>
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
      <!-- Subfolders -->
      <FolderCard
        v-for="folder in visibleFolders"
        :key="folder.id"
        :folder="folder"
        :setCount="setsInFolder(folder.id).length"
        @click="$router.push(`/study/folder/${folder.id}`)"
        @edit="openFolderModal"
        @delete="confirmDeleteFolder"
      />

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

    <!-- Modals ───────────────────────────────────────── -->
    <FolderModal
      :isOpen="showFolderModal"
      :folder="selectedFolder"
      :allFolders="folders"
      @save="saveFolder"
      @delete="confirmDeleteFolder"
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
  </div>
</template>

<script>
import FolderCard  from '@/components/FlashcardComponents/FolderCard.vue';
import SetCard     from '@/components/FlashcardComponents/SetCard.vue';
import FolderModal from '@/components/FlashcardComponents/FolderModal.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import session     from '@/studySession.js';
import { getDueCount, buildSession, reviewCard } from '@/anki';
import { flashcardApi, normalizeSet, normalizeFolder, normalizeAnkiResponse } from '@/api/flashcards';

const LS_KEY = 'study-data';

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
  components: { FolderCard, SetCard, FolderModal, ConfirmDialog },

  props: {
    folderId: { type: Number, default: null },
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
      pendingDeleteType:    null,  // 'folder' or 'set'
      pendingDeleteId:      null,
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
      return src.reduce((n, s) => n + getDueCount(s.cards), 0);
    },
  },

  async created() {
    await this.loadData();
  },

  activated() {
    // Reload data when this component becomes active (e.g., returning from SetEditor)
    this.loadFromLocalStorage();
  },

  watch: {
    $route() {
      // Reload data when route changes within study
      this.loadFromLocalStorage();
    },
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
      this.$store.commit('SET_FOLDERS', this.folders);
      this.$store.commit('SET_SETS', this.sets);
    },

    async loadFromBackend() {
      this.loading = true;
      try {
        // Fetch folders + all sets in parallel
        const [foldersRes, setsOverviewRes] = await Promise.all([
          flashcardApi.getFolders(),
          flashcardApi.getSets(),
        ]);

        this.folders = (foldersRes.data ?? []).map(normalizeFolder);

        // Fetch full card data for each set in parallel
        const overview = setsOverviewRes.data ?? [];
        const fullSets = await Promise.all(
          overview.map(s =>
            flashcardApi.getSet(s.set_id)
              .then(r => normalizeSet(r.data))
              .catch(() => null)
          )
        );

        this.sets = fullSets.filter(Boolean);
        this.$store.commit('SET_FOLDERS', this.folders);
        this.$store.commit('SET_SETS', this.sets);
        this.persist();
      } finally {
        this.loading = false;
      }
    },

    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify({ folders: this.folders, sets: this.sets }));
      this.$store.commit('SET_FOLDERS', this.folders);
      this.$store.commit('SET_SETS', this.sets);
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

    // ── Folder CRUD ───────────────────────────────────────────────────────

    openFolderModal(folder) {
      // If creating a new folder within a subfolder, set the parent automatically
      if (!folder && this.folderId) {
        folder = { id: null, title: '', color: '#4CAF50', parentFolderId: this.folderId };
      }
      this.selectedFolder  = folder;
      this.showFolderModal = true;
    },

    async saveFolder(folder) {
      if (this.isAuthenticated) {
        try {
          if (folder.id == null) {
            const res = await flashcardApi.createFolder(folder);
            folder.id = res.data.folder_id;
          } else {
            await flashcardApi.updateFolder(folder.id, folder);
          }
        } catch (err) {
          console.warn('Backend folder save failed, saving locally:', err);
        }
      }
      if (folder.id == null) {
        folder.id = this.nextId(this.folders);
        this.folders.push(folder);
      } else {
        const idx = this.folders.findIndex(f => f.id === folder.id);
        if (idx !== -1) this.folders[idx] = folder;
        else this.folders.push(folder);
      }
      this.persist();
      this.showFolderModal = false;
    },

    confirmDeleteFolder(folderId) {
      const folder = this.folders.find(f => f.id === folderId);
      if (!folder) return;
      this.pendingDeleteType = 'folder';
      this.pendingDeleteId = folderId;
      this.deleteConfirmTitle = 'Delete Folder?';
      this.deleteConfirmMessage = `Are you sure you want to delete "${folder.title}"? All sets in this folder will be moved to the root level.`;
      this.showDeleteConfirm = true;
    },

    async _executeDeleteFolder(folderId) {
      if (this.isAuthenticated) {
        try {
          await flashcardApi.deleteFolder(folderId);
        } catch (err) {
          console.warn('Backend folder delete failed:', err);
        }
      }
      const deletedFolder = this.folders.find(f => f.id === folderId);
      
      // Move child folders to the parent of the deleted folder
      if (deletedFolder) {
        this.folders.forEach(f => {
          if (f.parentFolderId === folderId) {
            f.parentFolderId = deletedFolder.parentFolderId;
          }
        });
      }
      
      // Move sets to the parent of the deleted folder
      this.sets.forEach(s => {
        if (s.folderId === folderId) {
          s.folderId = deletedFolder?.parentFolderId ?? null;
        }
      });
      
      // Remove the folder
      this.folders = this.folders.filter(f => f.id !== folderId);
      this.persist();
    },

    // ── Set CRUD ──────────────────────────────────────────────────────────

    openSetModal(set) {
      if (set) {
        // Navigate to edit page
        this.$router.push(`/study/set/${set.id}`);
      } else {
        // Navigate to create new set page
        this.$router.push(`/study/set/new`);
      }
    },

    reloadFromStorage() {
      this.loadFromLocalStorage();
    },

    confirmDeleteSet(setId) {
      const set = this.sets.find(s => s.id === setId);
      if (!set) return;
      this.pendingDeleteType = 'set';
      this.pendingDeleteId = setId;
      this.deleteConfirmTitle = 'Delete Set?';
      this.deleteConfirmMessage = `Are you sure you want to delete "${set.title}"? This action cannot be undone.`;
      this.showDeleteConfirm = true;
    },

    async _executeDeleteSet(setId) {
      if (this.isAuthenticated) {
        try {
          await flashcardApi.deleteSet(setId);
        } catch (err) {
          console.warn('Backend delete failed:', err);
        }
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
      this.pendingDeleteId = null;
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
  flex-wrap: wrap;
}
.breadcrumb-link {
  color: var(--accentColor);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.breadcrumb-link:hover { opacity: 1; }
.breadcrumb-sep {
  color: var(--accentColor);
  opacity: 0.5;
  font-size: 0.85rem;
}
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
