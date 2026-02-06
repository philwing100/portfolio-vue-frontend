<template>
  <div class="drawer-overlay" @click.self="closeDrawer">
    <div class="drawer-sheet">
      <div class="drawer-header">
        <span class="drawer-title">{{ listTitle || 'List Settings' }}</span>
        <Button class="drawer-close-btn" @click="closeDrawer">✕</Button>
      </div>
      <div class="drawer-body">
        <div class="drawer-section">
          <label class="drawer-label">Event Color</label>
          <ColorPicker v-model="localColor" />
        </div>
        <Button class="drawer-save-btn" @click="saveChanges">Save</Button>
      </div>
    </div>
  </div>
</template>

<script>
import Button from '../GeneralComponents/Button.vue';
import ColorPicker from '../SettingsComponents/ColorPicker.vue';

export default {
  name: 'Drawer',
  components: { Button, ColorPicker },
  props: {
    event: {
      type: Object,
      required: true,
    },
    listTitle: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#2196f3',
    },
  },
  data() {
    return {
      localColor: this.color,
    };
  },
  methods: {
    closeDrawer() {
      this.$emit('close');
    },
    emitColor() {
      this.$emit('update-list-color', this.localColor);
    },
    saveChanges() {
      this.emitColor();
      this.closeDrawer();
    },
  },
  watch: {
    color(newVal) {
      this.localColor = newVal;
    },
  },
};
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  z-index: 3000;
  display: flex;
  justify-content: flex-end;
  align-items: stretch;
}

.drawer-sheet {
  background: var(--primaryColor);
  width: 22rem;
  max-width: 100vw;
  height: 100%;
  box-shadow: -2px 0 16px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.drawer-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accentColor);
}

.drawer-close-btn {
  background: transparent;
  color: var(--accentColor);
  font-size: 1.25rem;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.drawer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.drawer-label {
  font-size: 0.875rem;
  color: var(--accentColor);
}
.drawer-save-btn {
  background: var(--accentColor);
  color: var(--primaryColor);
  border-radius: 0.25rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: none;
  cursor: pointer;
}
.drawer-save-btn:hover {
  background: var(--secondaryColor);
  color: var(--accentColor);
}
</style>