<template>
  <draggable
    :list="dropBuffer"
    :group="groupOpts"
    :sort="false"
    item-key="id"
    :class="['tree-row', { active, root: isRoot }]"
    :style="{ paddingLeft: `${0.6 + (depth * 0.9)}rem` }"
    @add="onAdd"
    @click="$emit('navigate')"
  >
    <template #item="{ element }">
      <span class="ghost-item">{{ element.id }}</span>
    </template>
    <template #header>
      <span v-if="color" class="dot" :style="{ backgroundColor: color }" />
      <span v-else class="dot dot-root">↪</span>
      <span class="tree-label">{{ label }}</span>
    </template>
  </draggable>
</template>

<script>
import draggable from 'vuedraggable';

export default {
  name: 'FolderTreeRow',
  components: { draggable },
  props: {
    label:      { type: String, required: true },
    color:      { type: String, default: null },
    depth:      { type: Number, default: 0 },
    active:     { type: Boolean, default: false },
    isRoot:     { type: Boolean, default: false },
    dropBuffer: { type: Array,  required: true },
    groupOpts:  { type: Object, required: true },
  },
  emits: ['navigate', 'drop-add'],
  methods: {
    onAdd(evt) {
      this.$emit('drop-add', { buffer: this.dropBuffer, index: evt.newIndex });
    },
  },
};
</script>

<style scoped>
.tree-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  color: var(--accentColor);
  font-size: 0.85rem;
  transition: background 0.12s;
  min-height: 1.75rem;
}
.tree-row:hover   { background: rgba(255,255,255,0.05); }
.tree-row.active  { background: rgba(255,255,255,0.08); font-weight: 600; }
.tree-row.root    { font-style: italic; opacity: 0.85; }
.dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-root {
  width: auto;
  height: auto;
  border-radius: 0;
  opacity: 0.5;
  font-size: 0.75rem;
}
.tree-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ghost-item { display: none; }
</style>
