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
        <div v-if="parentFolderOptions.length > 0" class="parent-row">
          <label class="field-label">Parent Folder</label>
          <Dropdown
            v-model="local.parentFolderId"
            :options="parentFolderOptions"
            labelKey="label"
            valueKey="value"
          />
        </div>
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
import TextField from '@/components/GeneralComponents/TextField.vue';
import Dropdown from '@/components/GeneralComponents/Dropdown.vue';

const emptyFolder = () => ({ id: null, title: '', color: '#4CAF50', parentFolderId: null });

export default {
  name: 'FolderModal',
  components: { GenericModal, TextField, Dropdown },
  props: {
    isOpen: { type: Boolean, default: false },
    folder: { type: Object, default: null },
    allFolders: { type: Array, default: () => [] },
  },
  emits: ['save', 'close'],
  data() {
    return { local: emptyFolder() };
  },
  computed: {
    isEdit() { return this.folder?.id != null; },
    parentFolderOptions() {
      const currentId = this.local.id;
      const childIds = new Set();
      
      // Collect all descendants of the current folder to prevent circular references
      const collectDescendants = (folderId) => {
        const children = this.allFolders.filter(f => f.parentFolderId === folderId);
        children.forEach(child => {
          childIds.add(child.id);
          collectDescendants(child.id);
        });
      };
      
      if (currentId) collectDescendants(currentId);
      
      return [
        { label: '(root)', value: null },
        ...this.allFolders
          .filter(f => f.id !== currentId && !childIds.has(f.id))
          .map(f => ({ label: f.title, value: f.id })),
      ];
    },
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
.parent-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
