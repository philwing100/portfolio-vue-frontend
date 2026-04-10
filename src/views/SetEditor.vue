<template>
  <div class="set-editor-page">
    <!-- Header -->
    <div class="editor-header">
      <button class="header-btn" @click="cancel" title="Back to Study">← Back</button>
      <h1 class="editor-title">{{ isEdit ? 'Edit Set' : 'New Set' }}</h1>
      <button class="header-btn delete-btn" v-if="isEdit" @click="confirmDelete" title="Delete set">🗑 Delete</button>
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
              <div class="delimiter-row">
                <div class="delim-field">
                  <label class="field-label">Term delimiter</label>
                  <input
                    v-model="termDelimiter"
                    class="delim-input"
                    placeholder="\t (tab)"
                  />
                </div>
                <div class="delim-field">
                  <label class="field-label">Card delimiter</label>
                  <input
                    v-model="cardDelimiter"
                    class="delim-input"
                    placeholder="\n (newline)"
                  />
                </div>
              </div>

              <textarea
                v-model="bulkText"
                class="bulk-textarea"
                placeholder="front[term delim]back[card delim]front[term delim]back..."
                rows="8"
              />

              <div class="io-actions">
                <button class="modal-btn" @click="doImport">Import</button>
                <button class="modal-btn" @click="doExport">Export</button>
              </div>

              <p v-if="importError" class="import-error">{{ importError }}</p>
            </div>
          </template>
        </Tabs>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="editor-footer">
      <button class="action-btn cancel-btn" @click="cancel">Cancel</button>
      <button class="action-btn save-btn" @click="save">Save Set</button>
    </div>

    <!-- Delete confirmation modal -->
    <ConfirmDialog
      :isOpen="showDeleteConfirm"
      title="Delete Set?"
      :message="`Are you sure you want to delete \"${local.title}\"? This action cannot be undone.`"
      confirmLabel="Delete"
      @confirm="executeDelete"
      @close="showDeleteConfirm = false"
    />
  </div>
</template>

<script>
import TextField from '@/components/GeneralComponents/TextField.vue';
import Tabs from '@/components/GeneralComponents/Tabs.vue';
import Dropdown from '@/components/GeneralComponents/Dropdown.vue';
import IntInput from '@/components/GeneralComponents/IntInput.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { flashcardApi } from '@/api/flashcards';

const TABS = [
  { label: 'Cards', slotName: 'cards' },
  { label: 'Options', slotName: 'options' },
  { label: 'Import / Export', slotName: 'importexport' },
];

const ORDER_MODES = [
  { label: 'Random', value: 'random' },
  { label: 'Sequential', value: 'sequential' },
];

const emptySet = () => ({
  id: null,
  title: '',
  folderId: null,
  options: { newPerDay: 20, orderMode: 'random' },
  cards: [],
});

let nextTmpCardId = -1;
const newCard = () => ({
  id: nextTmpCardId--,
  front: '',
  back: '',
  anki: null,
});

function parseDelimiter(str) {
  return str.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
}

const DELIMITER_LS_KEY = 'flashcard-import-export-delimiters';

export default {
  name: 'SetEditor',
  components: { TextField, Tabs, Dropdown, IntInput, ConfirmDialog },

  props: {
    setId: { type: Number, default: null },
  },

  data() {
    const saved = (() => {
      try {
        const raw = localStorage.getItem(DELIMITER_LS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    return {
      local: emptySet(),
      termDelimiter: saved?.termDelimiter ?? '\\t',
      cardDelimiter: saved?.cardDelimiter ?? '\\n',
      bulkText: '',
      importError: '',
      showDeleteConfirm: false,
      TABS,
      ORDER_MODES,
    };
  },

  computed: {
    isEdit() {
      return this.setId != null;
    },

    allSets() {
      return this.$store.state.allSets || [];
    },

    allFolders() {
      return this.$store.state.allFolders || [];
    },

    folderOptions() {
      return [
        { label: '(none)', value: null },
        ...this.allFolders.map(f => ({ label: f.title, value: f.id })),
      ];
    },
  },

  created() {
    this.loadSet();
  },

  methods: {
    loadSet() {
      if (this.isEdit) {
        const set = this.allSets.find(s => s.id === this.setId);
        if (set) {
          this.local = {
            ...set,
            options: { ...set.options },
            cards: set.cards.map(c => ({ ...c })),
          };
        } else {
          // Set not found, redirect back
          this.$router.push('/study');
        }
      }
    },

    addCard() {
      this.local.cards.push(newCard());
    },

    removeCard(idx) {
      this.local.cards.splice(idx, 1);
    },

    _persistDelimiters() {
      try {
        localStorage.setItem(DELIMITER_LS_KEY, JSON.stringify({
          termDelimiter: this.termDelimiter,
          cardDelimiter: this.cardDelimiter,
        }));
      } catch {
        // Ignore localStorage errors
      }
    },

    doImport() {
      this.importError = '';
      const td = parseDelimiter(this.termDelimiter) || '\t';
      const cd = parseDelimiter(this.cardDelimiter) || '\n';

      const rawCards = this.bulkText
        .split(cd)
        .map(s => s.trim())
        .filter(Boolean);

      if (!rawCards.length) {
        this.importError = 'No cards found — check your delimiters.';
        return;
      }

      const parsed = rawCards.map(raw => {
        const idx = raw.indexOf(td);
        return {
          front: idx >= 0 ? raw.slice(0, idx).trim() : raw.trim(),
          back: idx >= 0 ? raw.slice(idx + td.length).trim() : '',
        };
      });

      const incomplete = parsed.filter(c => !c.front || !c.back).length;
      if (incomplete)
        this.importError = `${incomplete} card(s) are missing a term or definition.`;

      parsed.forEach(p => this.local.cards.push({ ...newCard(), ...p }));
      this.bulkText = '';
    },

    doExport() {
      const td = parseDelimiter(this.termDelimiter) || '\t';
      const cd = parseDelimiter(this.cardDelimiter) || '\n';
      this.bulkText = this.local.cards
        .map(c => `${c.front}${td}${c.back}`)
        .join(cd);
    },

    save() {
      if (!this.local.title.trim()) return;
      this._persistDelimiters();

      const setData = {
        ...this.local,
        cards: this.local.cards.filter(c => c.front.trim() || c.back.trim()),
      };

      // Emit save through store action or directly call saveSet
      this.$emit('save', setData);

      // Since we don't have a direct reference to Study's saveSet method,
      // we'll update localStorage directly for now
      this._saveSet(setData);
      this.$router.push('/study');
    },

    _saveSet(set) {
      try {
        const stored = localStorage.getItem('study-data');
        if (stored) {
          const data = JSON.parse(stored);
          const idx = data.sets.findIndex(s => s.id === set.id);
          if (idx !== -1) {
            data.sets[idx] = set;
          } else if (set.id == null) {
            set.id = data.sets.length ? Math.max(...data.sets.map(s => s.id)) + 1 : 1;
            data.sets.push(set);
          }
          localStorage.setItem('study-data', JSON.stringify(data));
        }
      } catch {
        // Ignore localStorage errors
      }
    },

    cancel() {
      this.$router.push('/study');
    },

    confirmDelete() {
      this.showDeleteConfirm = true;
    },

    async executeDelete() {
      if (this.isEdit && this.local.id != null) {
        await this._deleteSet(this.local.id);
      }
      this.$router.push('/study');
    },

    async _deleteSet(setId) {
      try {
        const stored = localStorage.getItem('study-data');
        if (stored) {
          const data = JSON.parse(stored);
          data.sets = data.sets.filter(s => s.id !== setId);
          localStorage.setItem('study-data', JSON.stringify(data));
        }
      } catch {
        // Ignore localStorage errors
      }
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
  padding: 1rem 1.5rem;
  border-bottom: 0.0625rem solid var(--secondaryColor);
  gap: 1rem;
}

.editor-title {
  flex: 1;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accentColor);
  margin: 0;
}

.header-btn {
  background: none;
  border: none;
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem 0.75rem;
  transition: opacity 0.2s;
}

.header-btn:hover {
  opacity: 0.7;
}

.header-btn.delete-btn {
  color: #e53935;
}

.header-btn.delete-btn:hover {
  opacity: 0.6;
}

/* ── Content ── */
.editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.editor-content {
  max-width: 50rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Cards editor ── */
.cards-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

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
  opacity: 0.5;
  font-size: 0.8rem;
  padding-top: 0.5rem;
  text-align: right;
}

.card-sep {
  color: var(--accentColor);
  opacity: 0.4;
  padding-top: 0.5rem;
  font-size: 1rem;
}

.card-textarea {
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: 0.0625rem solid var(--secondaryColor);
  background-color: var(--primaryColor);
  color: var(--accentColor);
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
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
  padding: 0.25rem;
  transition: opacity 0.2s;
}

.icon-btn:hover {
  opacity: 0.7;
}

.add-card-btn {
  padding: 0.75rem 1.25rem;
  margin-top: 0.5rem;
  border: 0.0625rem dashed var(--accentColor);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.add-card-btn:hover {
  background: var(--secondaryColor);
}

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

.delimiter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.delim-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.delim-input {
  padding: 0.5rem;
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  font-size: 0.9rem;
}

.delim-input:focus {
  outline: none;
  border-color: var(--accentColor);
}

.bulk-textarea {
  width: 100%;
  min-height: 12rem;
  padding: 0.75rem;
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  resize: vertical;
}

.bulk-textarea:focus {
  outline: none;
  border-color: var(--accentColor);
}

.io-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.modal-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  background: var(--secondaryColor);
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.2s;
}

.modal-btn:hover {
  opacity: 0.8;
}

.import-error {
  color: #e53935;
  font-size: 0.875rem;
  margin: 0;
}

/* ── Footer ── */
.editor-footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 0.0625rem solid var(--secondaryColor);
  background-color: var(--primaryColor);
}

.action-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: transparent;
  color: var(--accentColor);
  border: 0.0625rem solid var(--accentColor);
}

.cancel-btn:hover {
  background: var(--secondaryColor);
}

.save-btn {
  background: var(--accentColor);
  color: var(--primaryColor);
}

.save-btn:hover {
  opacity: 0.85;
}

/* ── Responsive ── */
@media (max-width: 48rem) {
  .editor-header {
    flex-direction: column;
    align-items: stretch;
  }

  .editor-title {
    order: 1;
    text-align: center;
  }

  .delimiter-row {
    grid-template-columns: 1fr;
  }

  .editor-footer {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
