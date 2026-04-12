<template>
  <div class="card-scene" @click="flip">
    <div class="card-inner" :class="{ flipped: isFlipped }">
      <div class="card-face card-front">
        <div class="card-label">Front</div>
        <div class="card-content">{{ card.front }}</div>
      </div>
      <div class="card-face card-back">
        <div class="card-label">Back</div>
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
  max-width: 44rem;
  min-height: 14rem;
  perspective: 60rem;
  cursor: pointer;
  margin: 0 auto;
  user-select: none;
}
.card-inner {
  width: 100%;
  min-height: 14rem;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.12s ease;
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
  padding: 2rem 2.5rem;
  background-color: var(--secondaryColor);
  border: 0.0625rem solid rgba(255, 255, 255, 0.06);
  gap: 0.75rem;
}
.card-back {
  transform: rotateY(180deg);
  border-color: rgba(255, 255, 255, 0.1);
}
.card-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accentColor);
  opacity: 0.35;
  font-weight: 600;
  align-self: flex-start;
  position: absolute;
  top: 1rem;
  left: 1.25rem;
}
.card-content {
  font-size: 1.4rem;
  color: var(--accentColor);
  text-align: center;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 36rem) {
  .card-face {
    padding: 1.5rem 1.25rem;
  }
  .card-content {
    font-size: 1.15rem;
  }
}
</style>
