<template>
  <div class="card-scene" @click="flip">
    <div class="card-inner" :class="{ flipped: isFlipped }">
      <div class="card-face card-front">
        <div class="card-content">{{ card.front }}</div>
        <div class="card-hint">click to reveal</div>
      </div>
      <div class="card-face card-back">
        <div class="card-content">{{ card.back }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlashcardDisplay',
  props: {
    card: { type: Object, required: true },
  },
  emits: ['flip'],
  data() {
    return { isFlipped: false };
  },
  watch: {
    // Reset flip state whenever a new card is shown
    card() {
      this.isFlipped = false;
    },
  },
  methods: {
    flip() {
      if (!this.isFlipped) {
        this.isFlipped = true;
        this.$emit('flip');
      }
    },
  },
};
</script>

<style scoped>
.card-scene {
  width: 100%;
  max-width: 42rem;
  height: 16rem;
  perspective: 60rem;
  cursor: pointer;
  margin: 0 auto;
  user-select: none;
}
.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.2s ease;
}
.card-inner.flipped {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--secondaryColor);
  border: 0.125rem solid rgba(255, 255, 255, 0.08);
}
.card-back {
  transform: rotateY(180deg);
}
.card-content {
  font-size: 1.4rem;
  color: var(--accentColor);
  text-align: center;
  line-height: 1.6;
  white-space: pre-wrap;
}
.card-hint {
  margin-top: 1rem;
  font-size: 0.78rem;
  color: var(--accentColor);
  opacity: 0.4;
}
</style>
