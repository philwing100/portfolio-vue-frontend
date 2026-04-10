<template>
  <GenericModal :isOpen="isOpen" @close="$emit('close')">
    <template #header>
      <span class="modal-title">{{ isEdit ? 'Edit Set' : 'New Set' }}</span>
    </template>

    <template #body>
      <div class="set-modal-body">
        <TextField v-model="local.title" label="Title" :maxLength="80" />

        <Tabs :tabs="TABS">
          <!-- ── Cards ──────────────────────────────────────────── -->
          <template #cards>
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
    </template>

    <template #footer>
      <button class="modal-btn" @click="$emit('close')">Cancel</button>
      <button class="modal-btn primary" @click="save">Save</button>
    </template>
  </GenericModal>
</template>

<script>
import GenericModal from '@/components/GeneralComponents/GenericModal.vue';
import TextField    from '@/components/GeneralComponents/TextField.vue';
import Tabs         from '@/components/GeneralComponents/Tabs.vue';
import Dropdown     from '@/components/GeneralComponents/Dropdown.vue';
import IntInput     from '@/components/GeneralComponents/IntInput.vue';

const TABS = [
  { label: 'Cards',           slotName: 'cards'       },
  { label: 'Options',         slotName: 'options'     },
  { label: 'Import / Export', slotName: 'importexport'},
];

const ORDER_MODES = [
  { label: 'Random',     value: 'random'     },
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

/** Convert "\t" and "\n" literals typed by the user into real characters. */
function parseDelimiter(str) {
  return str.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
}

const DELIMITER_LS_KEY = 'flashcard-import-export-delimiters';

export default {
  name: 'SetModal',
  components: { GenericModal, TextField, Tabs, Dropdown, IntInput },

  props: {
    isOpen:  { type: Boolean, default: false },
    set:     { type: Object,  default: null  },
    folders: { type: Array,   default: () => [] },
  },
  emits: ['save', 'close'],

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
      TABS,
      ORDER_MODES,
    };
  },

  computed: {
    isEdit() { return this.set?.id != null; },

    folderOptions() {
      return [
        { label: '(none)', value: null },
        ...this.folders.map(f => ({ label: f.title, value: f.id })),
      ];
    },
  },

  watch: {
    set: {
      immediate: true,
      handler(s) {
        this.local = s
          ? { ...s, options: { ...s.options }, cards: s.cards.map(c => ({ ...c })) }
          : emptySet();
        this.bulkText    = '';
        this.importError = '';
      },
    },
    termDelimiter(newVal) {
      this._persistDelimiters();
    },
    cardDelimiter(newVal) {
      this._persistDelimiters();
    },
  },

  methods: {
    addCard()        { this.local.cards.push(newCard()); },
    removeCard(idx)  { this.local.cards.splice(idx, 1); },

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

    save() {
      if (!this.local.title.trim()) return;
      this.$emit('save', {
        ...this.local,
        cards: this.local.cards.filter(c => c.front.trim() || c.back.trim()),
      });
      this.$emit('close');
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
          back:  idx >= 0 ? raw.slice(idx + td.length).trim() : '',
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
  },
};
</script>

<style scoped>
.set-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(90vw, 44rem);
}

/* ── Cards tab ── */
.cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 55vh;
  overflow-y: auto;
  padding-right: 0.25rem;
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
  padding: 0.5rem 0.75rem;
  background: var(--primaryColor);
  color: var(--accentColor);
  border: 0.125rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.card-textarea:focus {
  outline: none;
  border-color: var(--accentColor);
}
.icon-btn {
  background: none;
  border: none;
  color: var(--accentColor);
  opacity: 0.4;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.4rem;
  border-radius: 0.25rem;
  transition: opacity 0.2s, background 0.2s;
  margin-top: 0.2rem;
}
.icon-btn:hover { opacity: 1; background: rgba(255,255,255,0.08); }
.add-card-btn {
  align-self: flex-start;
  background: none;
  border: 0.125rem dashed var(--accentColor);
  color: var(--accentColor);
  opacity: 0.6;
  padding: 0.4rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}
.add-card-btn:hover { opacity: 1; }

/* ── Options tab ── */
.options-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.field-label {
  color: var(--accentColor);
  font-size: 0.875rem;
  font-weight: 500;
  min-width: 5rem;
}

/* ── Import/Export tab ── */
.io-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.delimiter-row {
  display: flex;
  gap: 1rem;
}
.delim-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}
.delim-input {
  padding: 0.4rem 0.6rem;
  background: var(--primaryColor);
  color: var(--accentColor);
  border: 0.125rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: monospace;
}
.delim-input:focus { outline: none; border-color: var(--accentColor); }
.bulk-textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: var(--primaryColor);
  color: var(--accentColor);
  border: 0.125rem solid var(--secondaryColor);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: monospace;
  resize: vertical;
  box-sizing: border-box;
}
.bulk-textarea:focus { outline: none; border-color: var(--accentColor); }
.io-actions {
  display: flex;
  gap: 0.5rem;
}
.import-error {
  color: #e53935;
  font-size: 0.8rem;
  margin: 0;
}

/* ── Shared button style ── */
.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accentColor);
}
.modal-btn {
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: 0.375rem;
  background: var(--primaryColor);
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}
.modal-btn:hover   { opacity: 0.8; }
.modal-btn.primary { background: var(--accentColor); color: var(--primaryColor); }
.modal-btn.danger  { background: #e53935; color: #fff; }
</style>
