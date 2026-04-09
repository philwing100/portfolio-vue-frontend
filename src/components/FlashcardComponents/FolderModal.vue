<template>
  <GenericModal :isOpen="isOpen" @close="$emit('close')">
    <template #header>
      <span class="modal-title">{{ isEdit ? 'Edit Folder' : 'New Folder' }}</span>
    </template>

    <template #body>
      <div class="form">
        <TextField v-model="local.title" label="Folder Name" :maxLength="60" />
        <div class="color-row">
          <label class="field-label">Color</label>
          <input type="color" v-model="local.color" class="color-swatch" />
        </div>
      </div>
    </template>

    <template #footer>
      <button class="modal-btn" @click="$emit('close')">Cancel</button>
      <button v-if="isEdit" class="modal-btn danger" @click="$emit('delete', local.id)">
        Delete
      </button>
      <button class="modal-btn primary" @click="save">Save</button>
    </template>
  </GenericModal>
</template>

<script>
import GenericModal from '@/components/GeneralComponents/GenericModal.vue';
import TextField    from '@/components/GeneralComponents/TextField.vue';

const emptyFolder = () => ({ id: null, title: '', color: '#4CAF50' });

export default {
  name: 'FolderModal',
  components: { GenericModal, TextField },
  props: {
    isOpen: { type: Boolean, default: false },
    folder: { type: Object,  default: null  },
  },
  emits: ['save', 'delete', 'close'],
  data() {
    return { local: emptyFolder() };
  },
  computed: {
    isEdit() { return this.folder?.id != null; },
  },
  watch: {
    folder: {
      immediate: true,
      handler(f) { this.local = f ? { ...f } : emptyFolder(); },
    },
  },
  methods: {
    save() {
      if (!this.local.title.trim()) return;
      this.$emit('save', { ...this.local });
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 18rem;
}
.color-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.field-label {
  color: var(--accentColor);
  font-size: 0.875rem;
  font-weight: 500;
}
.color-swatch {
  width: 2.5rem;
  height: 2rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  background: none;
  padding: 0;
}
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
