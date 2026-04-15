<template>
  <GenericModal :isOpen="isOpen" @close="$emit('close')">
    <template #header>
      <h3 class="modal-title">Study Settings</h3>
    </template>

    <template #body>
      <div class="settings-grid">
        <label class="field">
          <span class="field-label">Flashcards type</span>
          <Dropdown
            :options="flashcardsTypeOptions"
            :modelValue="local.flashcardsType"
            labelKey="label"
            valueKey="value"
            @update:modelValue="onFlashcardsTypeChange"
          />
          <span v-if="!isMobile" class="field-note">
            Media mode is only available on mobile (≤ 48rem viewport).
          </span>
        </label>

        <label class="field">
          <span class="field-label">Start with side</span>
          <Dropdown
            :options="startWithOptions"
            :modelValue="local.startWith"
            labelKey="label"
            valueKey="value"
            @update:modelValue="v => local.startWith = v"
          />
        </label>

        <label class="field">
          <span class="field-label">Speech rate ({{ local.ttsRate.toFixed(2) }}×)</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            :value="local.ttsRate"
            @input="e => local.ttsRate = parseFloat(e.target.value)"
            class="range-input"
          />
        </label>

        <label class="field">
          <span class="field-label">Voice</span>
          <Dropdown
            v-if="voiceOptions.length"
            :options="voiceOptions"
            :modelValue="local.ttsVoice"
            labelKey="label"
            valueKey="value"
            @update:modelValue="v => local.ttsVoice = v"
          />
          <span v-else class="field-note">
            Text-to-speech unavailable in this browser.
          </span>
        </label>
      </div>
    </template>

    <template #footer>
      <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
      <button class="btn btn-primary" @click="onSave">Save</button>
    </template>
  </GenericModal>
</template>

<script>
import GenericModal from '@/components/GeneralComponents/GenericModal.vue';
import Dropdown     from '@/components/GeneralComponents/Dropdown.vue';
import { DEFAULT_SETTINGS } from '@/studySettings.js';

export default {
  name: 'StudySettingsModal',
  components: { GenericModal, Dropdown },

  props: {
    isOpen:   { type: Boolean, default: false },
    settings: { type: Object,  default: () => ({ ...DEFAULT_SETTINGS }) },
    isMobile: { type: Boolean, default: false },
  },

  emits: ['save', 'close'],

  data() {
    return {
      local: { ...DEFAULT_SETTINGS, ...this.settings },
      voices: [],
    };
  },

  computed: {
    flashcardsTypeOptions() {
      return [
        { label: 'Standard', value: 'standard' },
        {
          label: this.isMobile ? 'Media (TTS + media keys)' : 'Media (mobile only)',
          value: 'media',
        },
      ];
    },
    startWithOptions() {
      return [
        { label: 'Front (term)', value: 'front' },
        { label: 'Back (definition)', value: 'back' },
      ];
    },
    voiceOptions() {
      if (!this.voices.length) return [];
      return [
        { label: 'Browser default', value: null },
        ...this.voices.map(v => ({ label: `${v.name} (${v.lang})`, value: v.name })),
      ];
    },
  },

  watch: {
    // Re-sync when opened with fresh settings.
    isOpen(open) {
      if (open) this.local = { ...DEFAULT_SETTINGS, ...this.settings };
    },
  },

  mounted() {
    this.loadVoices();
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = this.loadVoices;
      }
    } catch { /* noop */ }
  },

  beforeUnmount() {
    try {
      if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged === this.loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    } catch { /* noop */ }
  },

  methods: {
    loadVoices() {
      try {
        if ('speechSynthesis' in window) {
          this.voices = window.speechSynthesis.getVoices() || [];
        }
      } catch {
        this.voices = [];
      }
    },
    onFlashcardsTypeChange(v) {
      if (v === 'media' && !this.isMobile) return;  // desktop cannot pick media
      this.local.flashcardsType = v;
    },
    onSave() {
      // Desktop cannot persist media mode.
      const out = { ...this.local };
      if (!this.isMobile && out.flashcardsType === 'media') out.flashcardsType = 'standard';
      this.$emit('save', out);
    },
  },
};
</script>

<style scoped>
.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--accentColor);
}
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: min(22rem, 80vw);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accentColor);
  opacity: 0.8;
}
.field-note {
  font-size: 0.72rem;
  color: var(--accentColor);
  opacity: 0.55;
  font-style: italic;
}
.range-input {
  width: 100%;
  accent-color: var(--accentColor);
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  font-weight: 600;
  transition: opacity 0.15s;
}
.btn:hover { opacity: 0.85; }
.btn-ghost {
  background: transparent;
  color: var(--accentColor);
  border: 0.0625rem solid var(--secondaryColor);
}
.btn-primary {
  background: var(--accentColor);
  color: var(--primaryColor);
}
</style>
