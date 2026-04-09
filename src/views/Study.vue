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
        :disabled="totalDue === 0"
        @click="startAnkiAll"
      >
        ANKI All
        <span v-if="totalDue > 0" class="anki-badge">{{ totalDue }}</span>
      </button>
    </div>

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
import FolderCard   from '@/components/FlashcardComponents/FolderCard.vue';
import SetCard      from '@/components/FlashcardComponents/SetCard.vue';
import FolderModal  from '@/components/FlashcardComponents/FolderModal.vue';
import SetModal     from '@/components/FlashcardComponents/SetModal.vue';
import session      from '@/studySession.js';
import { getDueCount, buildSession } from '@/anki';

const LS_KEY = 'study-data';

// ── Default data shown when not authenticated / no backend data ──────────
const DEFAULT_FOLDERS = [
  { id: 1, title: 'Languages',         color: '#4CAF50' },
  { id: 2, title: 'Computer Science',  color: '#2196F3' },
];

const DEFAULT_SETS = [
  {
    id: 1, title: 'Spanish Vocabulary', folderId: 1,
    options: { newPerDay: 20, orderMode: 'random' },
    cards: [
      { id: 1, front: 'Hello',   back: 'Hola',     anki: null },
      { id: 2, front: 'Goodbye', back: 'Adiós',    anki: null },
      { id: 3, front: 'Thank you', back: 'Gracias', anki: null },
    ],
  },
  {
    id: 2, title: 'Data Structures', folderId: 2,
    options: { newPerDay: 10, orderMode: 'sequential' },
    cards: [
      { id: 1, front: 'Stack',  back: 'LIFO — last in, first out', anki: null },
      { id: 2, front: 'Queue',  back: 'FIFO — first in, first out', anki: null },
    ],
  },
];

export default {
  name: 'StudyPage',
  components: { FolderCard, SetCard, FolderModal, SetModal },

  props: {
    // Set by /study/folder/:id route
    folderId: { type: Number, default: null },
  },

  data() {
    return {
      folders: [],
      sets:    [],
      showFolderModal: false,
      showSetModal:    false,
      selectedFolder:  null,
      selectedSet:     null,
    };
  },

  computed: {
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
      try {
        await this.$store.dispatch('checkAuth');
        if (this.$store.state.isAuthenticated) {
          // TODO: replace with real API calls once backend is ready
          // const res = await getStudyData();
          // this.folders = res.folders; this.sets = res.sets;
          this.loadFromLocalStorage();
        } else {
          this.loadFromLocalStorage();
        }
      } catch {
        this.loadFromLocalStorage();
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

    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify({ folders: this.folders, sets: this.sets }));
      // TODO: await saveStudyData({ folders: this.folders, sets: this.sets });
    },

    // ── Helpers ───────────────────────────────────────────────────────────
    getDueCount,
    setsInFolder(folderId) { return this.sets.filter(s => s.folderId === folderId); },

    nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; },

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

      session.cards  = cards;
      session.title  = title;
      session.onRate = (cardId, setId, updatedAnki) => {
        const targetSet = this.sets.find(s => s.id === setId);
        if (!targetSet) return;
        const card = targetSet.cards.find(c => c.id === cardId);
        if (card) card.anki = updatedAnki;
        this.persist();
      };

      this.$router.push({ name: 'StudySession' });
    },

    // ── Folder CRUD ───────────────────────────────────────────────────────
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
      // Un-assign sets that belonged to this folder
      this.sets.forEach(s => { if (s.folderId === folderId) s.folderId = null; });
      this.persist();
      this.showFolderModal = false;
    },

    // ── Set CRUD ──────────────────────────────────────────────────────────
    openSetModal(set) {
      this.selectedSet  = set ? { ...set, cards: set.cards.map(c => ({ ...c })) } : null;
      this.showSetModal = true;
    },

    saveSet(set) {
      if (set.id == null) {
        set.id = this.nextId(this.sets);
        // Assign to current folder if we're inside one
        if (this.folderId && set.folderId == null) set.folderId = this.folderId;
        // Assign proper IDs to new cards
        let nextCardId = 1;
        set.cards.forEach(c => { c.id = nextCardId++; });
        this.sets.push(set);
      } else {
        const idx = this.sets.findIndex(s => s.id === set.id);
        if (idx !== -1) {
          // Assign IDs to any new cards (negative tmp ids)
          const maxId = set.cards.reduce((m, c) => (c.id > 0 ? Math.max(m, c.id) : m), 0);
          let nextCardId = maxId + 1;
          set.cards.forEach(c => { if (c.id < 0) c.id = nextCardId++; });
          this.sets[idx] = set;
        }
      }
      this.persist();
      this.showSetModal = false;
    },

    deleteSet(setId) {
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
