<template>
  <div class="set-card" @click="$emit('study')">
    <div class="set-body">
      <div class="set-title">{{ set.title }}</div>
      <div class="set-meta">
        <span>{{ set.cards.length }} card{{ set.cards.length !== 1 ? 's' : '' }}</span>
        <span v-if="dueCount > 0" class="badge badge-due">{{ dueCount }} due</span>
        <span v-if="newCount > 0" class="badge badge-new">{{ newCount }} new</span>
      </div>
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
import { isNew } from '@/anki';

export default {
  name: 'SetCard',
  components: { ContextMenu },
  props: {
    set:      { type: Object, required: true },
    dueCount: { type: Number, default: 0 },
  },
  emits: ['study', 'edit', 'delete'],
  computed: {
    newCount() {
      return this.set.cards.filter(isNew).length;
    },
  },
  methods: {
    handleMenuSelect(item) {
      if (item.label === 'Edit')   this.$emit('edit',   this.set);
      if (item.label === 'Delete') this.$emit('delete', this.set.id);
    },
  },
};
</script>

<style scoped>
.set-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--secondaryColor);
  border-radius: 0.75rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  user-select: none;
}
.set-card:hover {
  opacity: 0.85;
  transform: translateY(-2px);
}
.set-card:active {
  transform: translateY(0);
  opacity: 0.7;
}
.set-body {
  flex: 1;
  min-width: 0;
}
.set-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accentColor);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.set-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--accentColor);
  opacity: 0.6;
  flex-wrap: wrap;
}
.badge {
  padding: 0.1rem 0.45rem;
  border-radius: 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 1;
}
.badge-due { background: #e53935; color: #fff; }
.badge-new { background: #1e88e5; color: #fff; }
</style>
