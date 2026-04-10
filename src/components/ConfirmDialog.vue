<template>
  <GenericModal :isOpen="isOpen" @close="onCancel">
    <template #header>
      <span class="modal-title">{{ title }}</span>
    </template>

    <template #body>
      <p class="confirm-message">{{ message }}</p>
    </template>

    <template #footer>
      <button class="modal-btn" @click="onCancel">Cancel</button>
      <button class="modal-btn danger" @click="onConfirm">{{ confirmLabel }}</button>
    </template>
  </GenericModal>
</template>

<script>
import GenericModal from '@/components/GeneralComponents/GenericModal.vue';

export default {
  name: 'ConfirmDialog',
  components: { GenericModal },
  props: {
    isOpen: { type: Boolean, default: false },
    title: { type: String, default: 'Confirm' },
    message: { type: String, default: 'Are you sure?' },
    confirmLabel: { type: String, default: 'Delete' },
  },
  emits: ['confirm', 'cancel', 'close'],
  methods: {
    onConfirm() {
      this.$emit('confirm');
      this.$emit('close');
    },
    onCancel() {
      this.$emit('cancel');
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accentColor);
}

.confirm-message {
  color: var(--accentColor);
  margin: 0;
  line-height: 1.5;
}

.modal-btn {
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: 0.375rem;
  background: var(--primaryColor);
  color: var(--accentColor);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.2s;
  border: 0.0625rem solid var(--accentColor);
}

.modal-btn:hover {
  opacity: 0.8;
}

.modal-btn.danger {
  background: #e53935;
  color: #fff;
  border-color: #e53935;
}

.modal-btn.danger:hover {
  background: #c62828;
  border-color: #c62828;
}
</style>
