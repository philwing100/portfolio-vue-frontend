<template>
  <div class="context-menu-wrapper" ref="wrapper">
    <div class="trigger" @click.stop="toggle">
      <slot name="trigger">
        <button class="context-default-trigger">⋯</button>
      </slot>
    </div>

    <div v-if="visible" class="context-menu" @click.stop>
      <button
        v-for="(it, i) in items"
        :key="i"
        class="context-item"
        @click="select(it)"
      >
        {{ it.label }}
      </button>
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContextMenu',
  props: {
    modelValue: { type: Boolean, default: false },
    items: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'select'],
  data() {
    return {
      visible: this.modelValue,
    };
  },
  watch: {
    modelValue(v) {
      this.visible = v;
    },
    visible(v) {
      this.$emit('update:modelValue', v);
    },
  },
  mounted() {
    document.addEventListener('click', this.onClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onClickOutside);
  },
  methods: {
    toggle() {
      this.visible = !this.visible;
    },
    select(item) {
      this.$emit('select', item);
      this.visible = false;
    },
    onClickOutside(e) {
      if (!this.$refs.wrapper.contains(e.target)) {
        this.visible = false;
      }
    },
  },
};
</script>

<style scoped>
.context-menu-wrapper {
  position: relative;
  display: inline-block;
}

.context-default-trigger {
  background: rgba(255,255,255,0.06);
  border: none;
  color: var(--accentColor);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.context-menu {
  position: absolute;
  right: 0;
  top: 110%;
  background: rgba(0,0,0,0.85);
  border-radius: 0.25rem;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  z-index: 999;
  min-width: 7.5rem;
}

.context-item {
  background: transparent;
  color: var(--accentColor);
  border: none;
  padding: 0.375rem 0.5rem;
  text-align: left;
  border-radius: 0.25rem;
  cursor: pointer;
}

.context-item:hover {
  background: rgba(255,255,255,0.06);
}
</style>
