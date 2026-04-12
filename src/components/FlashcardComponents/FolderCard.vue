<template>
  <div class="folder-card" @click="$emit('click')">
    <div class="folder-color-bar" :style="{ backgroundColor: folder.color }"></div>
    <div class="folder-body">
      <div class="folder-title">{{ folder.title }}</div>
      <div class="folder-meta">{{ setCount }} set{{ setCount !== 1 ? 's' : '' }}</div>
    </div>
    <div @click.stop>
      <ContextMenu
        :items="[{ label: 'Edit' }, { label: 'Delete' }]"
        @select="handleMenuSelect"
      />
    </div>
  </div>
</template>

<script>
import ContextMenu from '@/components/ContextMenu.vue';

export default {
  name: 'FolderCard',
  components: { ContextMenu },
  props: {
    folder:   { type: Object, required: true },
    setCount: { type: Number, default: 0 },
  },
  emits: ['click', 'edit', 'delete'],
  methods: {
    handleMenuSelect(item) {
      if (item.label === 'Edit')   this.$emit('edit',   this.folder);
      if (item.label === 'Delete') this.$emit('delete', this.folder.id);
    },
  },
};
</script>

<style scoped>
.folder-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--secondaryColor);
  border-radius: 0.75rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s;
  user-select: none;
  overflow: hidden;
}
.folder-card:hover  { opacity: 0.85; transform: translateY(-2px); }
.folder-card:active { transform: translateY(0); opacity: 0.7; }

.folder-color-bar {
  width: 0.35rem;
  min-height: 2.25rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  align-self: stretch;
}
.folder-body {
  flex: 1;
  min-width: 0;
}
.folder-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accentColor);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.folder-meta {
  font-size: 0.78rem;
  color: var(--accentColor);
  opacity: 0.5;
  margin-top: 0.2rem;
}
</style>
