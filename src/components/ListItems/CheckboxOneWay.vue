<template>
  <div class="pretty-button-container">
    <button 
      class="pretty-button" 
      @mouseenter="hoverButton" 
      @mouseleave="resetButton" 
      @click="toggleCheck" 
      @keyup.enter="toggleCheck"
    >
      <span class="button-label">{{ buttonLabel }}</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'CheckBoxOneWay',
  props: {
    checked: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isChecked: this.checked,
      isHovering: false,
    };
  },
  watch: {
    checked(newVal) {
      this.isChecked = newVal;
    },
  },
  computed: {
    buttonLabel() {
      // Show a checkmark when checked or while hovering
      return (this.isChecked || this.isHovering) ? '✓' : '';
    }
  },
  methods: {
    emitButtonChange() {
      this.$emit('checkbox-toggled', this.isChecked); // Emit the checked state to the parent
    },
    hoverButton() {
      // Temporarily show the checkmark on hover
      this.isHovering = true;
    },
    resetButton() {
      // Reset the button to its actual checked state after hover
      this.isHovering = false;
    },
    toggleCheck() {
      // Permanently check or uncheck the button on click
      this.isChecked = !this.isChecked;
      this.isHovering = false;
      this.emitButtonChange();
    }
  }
};
</script>

<style scoped>
.pretty-button-container {
  display: inline-block;
  padding-left: 0.1875rem;
  margin-bottom: 0.125rem;
}

.pretty-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5625rem;
  height: 1.5625rem;
  background-color: var(--secondaryColor);
  border: 0.125rem solid var(--primary);
  border-radius: 0.3125rem;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.3s, border-color 0.3s;
}

.pretty-button:hover {
  background-color: var(--primary);
  border-color: var(--accentColor);
}

.button-label {
  font-size: 1rem;
  color: var(--accentColor);
}

.pretty-button:hover .button-label {
  color: var(--accentColor);
}
</style>