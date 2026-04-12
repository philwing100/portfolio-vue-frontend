<template>
  <div class="folder-tree">
    <div class="tree-header">Folder Structure</div>
    <div class="tree-body">
      <TreeRow
        :key="'__root'"
        :label="'Root'"
        :color="null"
        :is-root="true"
        :active="currentFolderId == null"
        :drop-buffer="buffers.__root"
        :group-opts="groupOpts"
        @navigate="$emit('navigate', null)"
        @drop-add="onDropAdd($event, null)"
      />
      <TreeRow
        v-for="node in flatTree"
        :key="node.id"
        :label="node.title"
        :color="node.color"
        :depth="node.depth"
        :active="node.id === currentFolderId"
        :drop-buffer="getBuffer(node.id)"
        :group-opts="groupOpts"
        @navigate="$emit('navigate', node.id)"
        @drop-add="onDropAdd($event, node.id)"
      />
    </div>
  </div>
</template>

<script>
import TreeRow from './FolderTreeRow.vue';

export default {
  name: 'FolderTree',
  components: { TreeRow },
  props: {
    folders:         { type: Array, required: true },
    currentFolderId: { default: null },
  },
  emits: ['navigate', 'reparent'],
  data() {
    return {
      buffers: { __root: [] },
      groupOpts: { name: 'flashcard-items', pull: false, put: true },
    };
  },
  computed: {
    flatTree() {
      const byParent = new Map();
      this.folders.forEach(f => {
        const key = f.parentFolderId ?? null;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(f);
      });
      const out = [];
      const walk = (parent, depth) => {
        const children = byParent.get(parent) ?? [];
        children.forEach(c => {
          out.push({ ...c, depth });
          walk(c.id, depth + 1);
        });
      };
      walk(null, 0);
      return out;
    },
  },
  methods: {
    getBuffer(id) {
      const k = String(id);
      if (!this.buffers[k]) this.buffers[k] = [];
      return this.buffers[k];
    },
    onDropAdd({ buffer, index }, targetFolderId) {
      const item = buffer[index];
      if (!item) return;
      buffer.splice(index, 1);
      this.$emit('reparent', {
        type: item.__type,
        id:   item.id,
        targetFolderId,
      });
    },
  },
};
</script>

<style scoped>
.folder-tree {
  margin: 0.75rem 1.5rem 0;
  border: 0.0625rem solid var(--secondaryColor);
  border-radius: 0.75rem;
  background: var(--secondaryColor);
  overflow: hidden;
}
.tree-header {
  padding: 0.5rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accentColor);
  opacity: 0.55;
  border-bottom: 0.0625rem solid rgba(255,255,255,0.05);
}
.tree-body {
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0;
  max-height: 12rem;
  overflow-y: auto;
}
@media (max-width: 36rem) {
  .folder-tree { margin: 0.5rem 1rem 0; }
}
</style>
