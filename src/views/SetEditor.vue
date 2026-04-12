<template>
  <div class="set-editor-page">
    <!-- Header -->
    <div class="editor-header">
      <button class="header-btn" @click="cancel">← Back</button>
      <h1 class="editor-title">{{ isEdit ? 'Edit Set' : 'New Set' }}</h1>
      <div class="header-actions">
        <button v-if="isEdit" class="header-btn study-btn" @click="studySet">▶ Study</button>
        <button v-if="isEdit" class="header-btn delete-btn" @click="confirmDelete">🗑</button>
      </div>
    </div>

    <!-- Editor container -->
    <div class="editor-container">
      <div class="editor-content">
        <TextField v-model="local.title" label="Set Title" :maxLength="80" />

        <Tabs :tabs="TABS">
          <!-- ── Cards ──────────────────────────────────────────── -->
          <template #cards>
            <div class="cards-editor">
              <div class="cards-list">
                <div
                  v-for="(card, i) in local.cards"
                  :key="card.id ?? `new-${i}`"
                  class="card-row"
                >
                  <span class="card-num">{{ i + 1 }}</span>
                  <textarea
                    v-model="card.front"
                    class="card-textarea"
                    placeholder="Front"
                    rows="2"
                  />
                  <span class="card-sep">↔</span>
                  <textarea
                    v-model="card.back"
                    class="card-textarea"
                    placeholder="Back"
                    rows="2"
                  />
                  <button class="icon-btn" @click="removeCard(i)" title="Remove card">✕</button>
                </div>

                <button class="add-card-btn" @click="addCard">+ Add Card</button>
              </div>
            </div>
          </template>

          <!-- ── Options ───────────────────────────────────────── -->
          <template #options>
            <div class="options-form">
              <IntInput
                v-model="local.options.newPerDay"
                label="New cards per day"
                :min="1"
                :max="500"
              />
              <div class="field-row">
                <label class="field-label">Order</label>
                <Dropdown
                  v-model="local.options.orderMode"
                  :options="ORDER_MODES"
                  labelKey="label"
                  valueKey="value"
                />
              </div>
              <div v-if="folderOptions.length > 1" class="field-row">
                <label class="field-label">Folder</label>
                <Dropdown
                  v-model="local.folderId"
                  :options="folderOptions"
                  labelKey="label"
                  valueKey="value"
                />
              </div>
            </div>
          </template>

          <!-- ── Import / Export ───────────────────────────────── -->
          <template #importexport>
            <div class="io-form">
              <div class="io-guide">
                <p>
                  Each card is separated by the <strong>card delimiter</strong>. Within a card,
                  the front and back are split by the <strong>term delimiter</strong>.
                </p>
                <p class="io-example">
                  Example with tab/newline defaults:<br>
                  <code>Hello&nbsp;&nbsp;&nbsp;&nbsp;Hola<br>Goodbye&nbsp;&nbsp;&nbsp;Adiós</code>
                </p>
              </div>

              <div class="delimiter-row">
                <div class="delim-field">
                  <label class="field-label">Term delimiter <span class="delim-hint">(between front/back)</span></label>
                  <input
                    v-model="termDelimiter"
                    class="delim-input"
                    placeholder="\t"
                  />
                </div>
                <div class="delim-field">
                  <label class="field-label">Card delimiter <span class="delim-hint">(between cards)</span></label>
                  <input
                    v-model="cardDelimiter"
                    class="delim-input"
                    placeholder="\n"
                  />
                </div>
              </div>

              <textarea
                v-model="bulkText"
                class="bulk-textarea"
                :placeholder="`front${termDelimiter}back${cardDelimiter}front${termDelimiter}back`"
                rows="8"
              />

              <div class="io-actions">
                <button class="io-btn import-btn" @click="doImport">
                  ↓ Import
                  <span v-if="importPreviewCount" class="io-preview">{{ importPreviewCount }} card{{ importPreviewCount !== 1 ? 's' : '' }}</span>
                </button>
                <button class="io-btn export-btn" :disabled="!local.cards.length" @click="doExport">
                  ↑ Export
                </button>
                <button v-if="bulkText && !importPreviewCount" class="io-btn copy-btn" @click="copyToClipboard">
                  📋 Copy
                </button>
              </div>

              <p v-if="importError" class="import-error">{{ importError }}</p>
              <p v-if="copySuccess" class="copy-success">Copied to clipboard!</p>
            </div>
          </template>
        </Tabs>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="editor-footer">
      <button class="action-btn cancel-btn" @click="cancel">Cancel</button>
      <button class="action-btn save-btn" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save Set' }}
      </button>
    </div>

    <!-- Delete confirmation -->
    <ConfirmDialog
      :isOpen="showDeleteConfirm"
      title="Delete Set?"
      :message="`Are you sure you want to delete &quot;${local.title}&quot;? This cannot be undone.`"
      confirmLabel="Delete"
      @confirm="executeDelete"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>

<script>
import TextField    from '@/components/GeneralComponents/TextField.vue';
import Tabs         from '@/components/GeneralComponents/Tabs.vue';
import Dropdown     from '@/components/GeneralComponents/Dropdown.vue';
import IntInput     from '@/components/GeneralComponents/IntInput.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { flashcardApi } from '@/api/flashcards';
import session from '@/studySession.js';
import { buildSession, reviewCard } from '@/anki';

const TABS = [
  { label: 'Cards',           slotName: 'cards' },
  { label: 'Options',         slotName: 'options' },
  { label: 'Import / Export', slotName: 'importexport' },
];

const ORDER_MODES = [
  { label: 'Random',     value: 'random' },
  { label: 'Sequential', value: 'sequential' },
];

const DELIMITER_LS_KEY = 'flashcard-import-delimiters';
const LS_KEY           = 'study-data';

const emptySet = () => ({
  id:       null,
  title:    '',
  folderId: null,
  options:  { newPerDay: 20, orderMode: 'random' },
  cards:    [],
});

let nextTmpId = -1;
const newCard = () => ({ id: nextTmpId--, front: '', back: '', anki: null });

function parseDelim(str) {
  return str.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
}

function loadSavedDelimiters() {
  try {
    const raw = localStorage.getItem(DELIMITER_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default {
  name: 'SetEditor',
  components: { TextField, Tabs, Dropdown, IntInput, ConfirmDialog },

  props: {
    setId: { type: Number, default: null },
  },

  data() {
    const saved = loadSavedDelimiters();
    return {
      local:             emptySet(),
      originalCards:     [],   // snapshot for backend diff
      termDelimiter:     saved?.termDelimiter ?? '\\t',
      cardDelimiter:     saved?.cardDelimiter ?? '\\n',
      bulkText:          '',
      importError:       '',
      copySuccess:       false,
      showDeleteConfirm: false,
      saving:            false,
      TABS,
      ORDER_MODES,
    };
  },

  computed: {
    isEdit()     { return this.setId != null; },
    isAuth()     { return this.$store.state.isAuthenticated; },
    allSets()    { return this.$store.state.allSets    || []; },
    allFolders() { return this.$store.state.allFolders || []; },

    folderOptions() {
      return [
        { label: '(none)', value: null },
        ...this.allFolders.map(f => ({ label: f.title, value: f.id })),
      ];
    },

    importPreviewCount() {
      if (!this.bulkText.trim()) return 0;
      const cd = parseDelim(this.cardDelimiter) || '\n';
      return this.bulkText.split(cd).map(s => s.trim()).filter(Boolean).length;
    },
  },

  watch: {
    termDelimiter() { this._persistDelimiters(); },
    cardDelimiter()  { this._persistDelimiters(); },
  },

  created() {
    this.loadSet();
  },

  methods: {
    loadSet() {
      if (!this.isEdit) return;
      const set = this.allSets.find(s => s.id === this.setId);
      if (!set) { this.$router.push('/study'); return; }
      this.local         = { ...set, options: { ...set.options }, cards: set.cards.map(c => ({ ...c })) };
      this.originalCards = set.cards.map(c => ({ ...c }));
    },

    addCard()          { this.local.cards.push(newCard()); },
    removeCard(idx)    { this.local.cards.splice(idx, 1); },

    _persistDelimiters() {
      try {
        localStorage.setItem(DELIMITER_LS_KEY, JSON.stringify({
          termDelimiter: this.termDelimiter,
          cardDelimiter: this.cardDelimiter,
        }));
      } catch { /* ignore */ }
    },

    doImport() {
      this.importError = '';
      const td = parseDelim(this.termDelimiter) || '\t';
      const cd = parseDelim(this.cardDelimiter) || '\n';
      const rows = this.bulkText.split(cd).map(s => s.trim()).filter(Boolean);

      if (!rows.length) {
        this.importError = 'No cards found — check your delimiters.';
        return;
      }

      const parsed = rows.map(raw => {
        const idx = raw.indexOf(td);
        return {
          front: idx >= 0 ? raw.slice(0, idx).trim() : raw.trim(),
          back:  idx >= 0 ? raw.slice(idx + td.length).trim() : '',
        };
      });

      const missing = parsed.filter(c => !c.front || !c.back).length;
      if (missing) this.importError = `${missing} card(s) are missing a front or back.`;

      parsed.forEach(p => this.local.cards.push({ ...newCard(), ...p }));
      this.bulkText = '';
    },

    doExport() {
      const td = parseDelim(this.termDelimiter) || '\t';
      const cd = parseDelim(this.cardDelimiter) || '\n';
      this.bulkText = this.local.cards.map(c => `${c.front}${td}${c.back}`).join(cd);
    },

    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.bulkText);
        this.copySuccess = true;
        setTimeout(() => { this.copySuccess = false; }, 2000);
      } catch {
        this.importError = 'Copy failed — please select and copy manually.';
      }
    },

    // ── Save ──────────────────────────────────────────────────────────────

    async save() {
      if (!this.local.title.trim() || this.saving) return;
      this.saving = true;

      this._persistDelimiters();

      const setData = {
        ...this.local,
        cards: this.local.cards.filter(c => c.front.trim() || c.back.trim()),
      };

      try {
        if (this.isAuth) {
          await this._syncToBackend(setData);
        }
      } catch (err) {
        console.warn('Backend save failed, saving locally:', err);
      }

      this._saveLocally(setData);
      this.saving = false;
      this.$router.push('/study');
    },

    async _syncToBackend(set) {
      if (!this.isEdit) {
        // Create new set
        const res = await flashcardApi.createSet(set);
        set.id = res.set_id ?? res.id;

        // Batch-add all cards
        if (set.cards.length) {
          const cardRes = await flashcardApi.addCards(set.id, set.cards);
          // Re-normalize so local ids match backend ids
          if (Array.isArray(cardRes)) {
            set.cards = set.cards.map((c, i) => ({
              ...c,
              id: cardRes[i]?.card_id ?? c.id,
            }));
          }
        }
      } else {
        // Update metadata
        await flashcardApi.updateSet(set.id, set);

        const origIds = new Set(this.originalCards.map(c => c.id));
        const currIds = new Set(set.cards.filter(c => c.id > 0).map(c => c.id));

        // Delete removed cards
        const removed = this.originalCards.filter(c => !currIds.has(c.id));
        await Promise.all(removed.map(c => flashcardApi.deleteCard(c.id).catch(() => {})));

        // Add new cards (negative tmp ids)
        const newCards = set.cards.filter(c => c.id < 0);
        if (newCards.length) {
          const res = await flashcardApi.addCards(set.id, newCards);
          if (Array.isArray(res)) {
            newCards.forEach((c, i) => { c.id = res[i]?.card_id ?? c.id; });
          }
        }

        // Update changed existing cards
        const changed = set.cards.filter(c => c.id > 0 && origIds.has(c.id) && this._cardChanged(c));
        await Promise.all(changed.map(c => flashcardApi.updateCard(c.id, c).catch(() => {})));
      }
    },

    _cardChanged(card) {
      const orig = this.originalCards.find(c => c.id === card.id);
      return orig && (orig.front !== card.front || orig.back !== card.back);
    },

    _saveLocally(set) {
      try {
        const raw  = localStorage.getItem(LS_KEY);
        const data = raw ? JSON.parse(raw) : { folders: [], sets: [] };

        const idx = data.sets.findIndex(s => s.id === set.id);
        if (idx !== -1) {
          data.sets[idx] = set;
        } else {
          if (set.id == null) {
            set.id = data.sets.length ? Math.max(...data.sets.map(s => s.id)) + 1 : 1;
          }
          data.sets.push(set);
        }

        localStorage.setItem(LS_KEY, JSON.stringify(data));
        this.$store.commit('SET_SETS',    data.sets);
        this.$store.commit('SET_FOLDERS', data.folders);
      } catch { /* ignore */ }
    },

    // ── Study directly from editor ────────────────────────────────────────

    studySet() {
      const cards = buildSession([this.local], 'study');
      if (!cards.length) return;
      session.cards  = cards;
      session.title  = this.local.title;
      const isAuth   = this.isAuth;
      session.onRate = async (cardId, setId, rating) => {
        if (isAuth) {
          try {
            const res = await flashcardApi.reviewCard(cardId, rating);
            const card = this.local.cards.find(c => c.id === cardId);
            if (card) card.anki = { easeFactor: res.ease_factor, interval: res.interval_days, repetitions: res.repetitions, nextReview: res.due_date };
          } catch {
            this._localReview(cardId, rating);
          }
        } else {
          this._localReview(cardId, rating);
        }
      };
      this.$router.push({ name: 'StudySession' });
    },

    _localReview(cardId, rating) {
      const card = this.local.cards.find(c => c.id === cardId);
      if (card) card.anki = reviewCard(card.anki, rating);
    },

    // ── Delete ────────────────────────────────────────────────────────────

    cancel()        { this.$router.push('/study'); },
    confirmDelete() { this.showDeleteConfirm = true; },

    async executeDelete() {
      if (!this.isEdit || this.local.id == null) { this.$router.push('/study'); return; }

      if (this.isAuth) {
        try { await flashcardApi.deleteSet(this.local.id); } catch (err) { console.warn('Backend delete failed:', err); }
      }

      await this._deleteLocally(this.local.id);
      this.$router.push('/study');
    },

    async _deleteLocally(setId) {
      try {
        const raw  = localStorage.getItem(LS_KEY);
        const data = raw ? JSON.parse(raw) : { folders: [], sets: [] };
        data.sets  = data.sets.filter(s => s.id !== setId);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        this.$store.commit('SET_SETS', data.sets);
      } catch { /* ignore */ }
    },
  },
};
</script>

<style scoped>
.set-editor-page {
  min-height: 100vh;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.5rem;
  border-bottom: 0.0625rem solid var(--secondaryColor);
  gap: 0.75rem;
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: var(--primaryColor);
}
.editor-title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accentColor);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.header-btn {
  background: none;
  border: none;
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.4rem 0.65rem;
  border-radius: 0.375rem;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
}
.header-btn:hover    { background: var(--secondaryColor); }
.study-btn           { color: var(--accentColor); font-weight: 600; }
.delete-btn          { color: #e53935; }
.delete-btn:hover    { background: rgba(229, 57, 53, 0.12); }

/* ── Content ── */
.editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
.editor-content {
  max-width: 52rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Cards editor ── */
.cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.card-row {
  display: grid;
  grid-template-columns: 1.5rem 1fr auto 1fr auto;
  align-items: start;
  gap: 0.5rem;
}
.card-num {
  color: var(--accentColor);
  opacity: 0.45;
  font-size: 0.78rem;
  padding-top: 0.55rem;
  text-align: right;
}
.card-sep {
  color: var(--accentColor);
  opacity: 0.4;
  padding-top: 0.55rem;
  font-size: 1rem;
}
.card-textarea {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border-radius: 0.375rem;
  border: 0.0625rem solid var(--secondaryColor);
  background-color: var(--primaryColor);
  color: var(--accentColor);
  font-family: inherit;
  font-size: 0.875rem;
  resize: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.card-textarea:focus {
  outline: none;
  border-color: var(--accentColor);
}
.icon-btn {
  background: none;
  border: none;
  color: #e53935;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.3rem;
  transition: opacity 0.15s;
  line-height: 1;
}
.icon-btn:hover { opacity: 0.65; }
.add-card-btn {
  padding: 0.65rem 1rem;
  margin-top: 0.25rem;
  border: 0.0625rem dashed var(--accentColor);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.875rem;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}
.add-card-btn:hover { opacity: 1; background: var(--secondaryColor); }

/* ── Options ── */
.options-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.field-label {
  color: var(--accentColor);
  font-size: 0.875rem;
  font-weight: 500;
}

/* ── Import/Export ── */
.io-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.io-guide {
  background: var(--secondaryColor);
  border-radius: 0.5rem;
  padding: 0.875rem 1rem;
  font-size: 0.85rem;
  color: var(--accentColor);
  opacity: 0.85;
  line-height: 1.6;
}
.io-guide p { margin: 0 0 0.5rem; }
.io-guide p:last-child { margin: 0; }
.io-example {
  font-size: 0.8rem !important;
  opacity: 0.7;
}
.io-example code {
  display: block;
  margin-top: 0.25rem;
  font-family: 'Courier New', monospace;
  white-space: pre;
}
.delimiter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.delim-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.delim-hint {
  font-weight: 400;
  opacity: 0.55;
  font-size: 0.78rem;
}
.delim-input {
  padding: 0.45rem 0.6rem;
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  transition: border-color 0.15s;
}
.delim-input:focus { outline: none; border-color: var(--accentColor); }
.bulk-textarea {
  width: 100%;
  min-height: 10rem;
  padding: 0.75rem;
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  resize: vertical;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.bulk-textarea:focus { outline: none; border-color: var(--accentColor); }
.io-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.io-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.15s;
}
.io-btn:disabled { opacity: 0.35; cursor: default; }
.import-btn { background: var(--accentColor); color: var(--primaryColor); }
.export-btn { background: var(--secondaryColor); color: var(--accentColor); }
.copy-btn   { background: var(--secondaryColor); color: var(--accentColor); }
.io-btn:not(:disabled):hover { opacity: 0.8; }
.io-preview {
  background: rgba(255,255,255,0.2);
  border-radius: 0.75rem;
  padding: 0.05rem 0.4rem;
  font-size: 0.72rem;
}
.import-error  { color: #e53935; font-size: 0.85rem; margin: 0; }
.copy-success  { color: #43a047; font-size: 0.85rem; margin: 0; }

/* ── Footer ── */
.editor-footer {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 0.0625rem solid var(--secondaryColor);
  background-color: var(--primaryColor);
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.action-btn {
  padding: 0.65rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  min-width: 8rem;
}
.action-btn:disabled { opacity: 0.45; cursor: default; }
.cancel-btn {
  background: transparent;
  color: var(--accentColor);
  border: 0.0625rem solid var(--accentColor);
}
.cancel-btn:hover { background: var(--secondaryColor); }
.save-btn { background: var(--accentColor); color: var(--primaryColor); }
.save-btn:not(:disabled):hover { opacity: 0.85; }

/* ── Responsive ── */
@media (max-width: 48rem) {
  .editor-header    { padding: 0.75rem 1rem; }
  .editor-container { padding: 1rem; }
  .delimiter-row    { grid-template-columns: 1fr; }
  .editor-footer    { flex-direction: column; padding: 1rem; }
  .action-btn       { width: 100%; }

  /* Stack front/back vertically */
  .card-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    background: var(--secondaryColor);
    border-radius: 0.5rem;
    padding: 0.5rem 0.6rem;
  }
  .card-num { align-self: flex-end; margin-bottom: -0.25rem; }
  .card-sep { display: none; }
  .icon-btn { align-self: flex-end; margin-top: -0.25rem; }
}
</style>
