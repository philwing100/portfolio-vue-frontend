<template>
  <div class="media-session">

    <div v-if="done" class="summary">
      <h2 class="summary-title">Session Complete</h2>
      <p class="summary-sub">{{ reviewed }} card{{ reviewed !== 1 ? 's' : '' }} marked as known</p>
      <button class="btn-primary" @click="$router.push('/study')">Back to Study</button>
    </div>

    <template v-else>
      <div class="session-header">
        <button class="btn-ghost" @click="exit">✕ End</button>
        <span class="session-title">{{ session.title }}</span>
        <span class="progress-text">{{ reviewed }} / {{ startingCount }}</span>
      </div>

      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>

      <div class="card-area">
        <FlashcardDisplay
          v-if="currentCard"
          ref="flashcard"
          :card="displayedCard"
          @flip="onUserFlip"
        />

        <p class="status">
          <span v-if="isSpeaking">🔊 Reading {{ speakingSide }}…</span>
          <span v-else>Tap card to flip.</span>
        </p>

        <p v-if="!mediaSessionSupported" class="warn-note">
          Hardware media keys unavailable in this browser. Use on-screen buttons.
        </p>
        <p v-if="!ttsSupported" class="warn-note">
          Text-to-speech unavailable in this browser. Cards will not be read aloud.
        </p>
      </div>

      <div class="controls">
        <button class="ctrl-btn ctrl-back" @click="onDontKnow">
          ⏮ Back<span class="ctrl-hint">Don't know</span>
        </button>
        <button class="ctrl-btn ctrl-flip" @click="manualFlip" :disabled="hasFlipped">
          ↻ Flip
        </button>
        <button class="ctrl-btn ctrl-fwd" @click="onKnown">
          ⏭ Forward<span class="ctrl-hint">Known</span>
        </button>
      </div>
    </template>

    <!-- Silent audio loop: required on Android so MediaSession controls appear
         on the lock screen / over Bluetooth headsets. TTS alone does not count
         as media playback. -->
    <audio
      ref="silentAudio"
      :src="SILENT_AUDIO_SRC"
      loop
      preload="auto"
      playsinline
    ></audio>
  </div>
</template>

<script>
import FlashcardDisplay from '@/components/FlashcardComponents/FlashcardDisplay.vue';
import session          from '@/studySession.js';
import { loadSettings } from '@/studySettings.js';

// 1-second silent WAV data URI (looped via <audio loop>).
const SILENT_AUDIO_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export default {
  name: 'MediaStudy',
  components: { FlashcardDisplay },

  data() {
    return {
      session,
      queue:          [],
      currentIndex:   0,
      startingCount:  0,
      reviewed:       0,
      hasFlipped:     false,
      isSpeaking:     false,
      speakingSide:   null,   // 'front' | 'back' | null (logical side, not visual face)
      done:           false,
      settings:       loadSettings(),
      mediaSessionSupported: typeof navigator !== 'undefined' && 'mediaSession' in navigator,
      ttsSupported:          typeof window !== 'undefined' && 'speechSynthesis' in window,
      SILENT_AUDIO_SRC,
      _advanceTimer:  null,
    };
  },

  computed: {
    currentCard() { return this.queue[this.currentIndex] ?? null; },
    // Map logical sides to visual faces so the face shown matches startWith.
    // FlashcardDisplay always shows `front` face first and flips to `back`.
    displayedCard() {
      const c = this.currentCard;
      if (!c) return null;
      if (this.settings.startWith === 'back') {
        return { ...c, front: c.back, back: c.front };
      }
      return c;
    },
    progressPct() {
      return this.startingCount ? (this.reviewed / this.startingCount) * 100 : 0;
    },
  },

  created() {
    if (!session.cards.length) {
      this.$router.replace('/study');
      return;
    }
    this.queue = [...session.cards];
    this.startingCount = this.queue.length;
  },

  mounted() {
    window.addEventListener('keydown', this.onKeyDown);
    this.registerMediaSession();
    this.startSilentAudio();
    this.playCurrent();
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.cancelSpeech();
    this.stopSilentAudio();
    this.unregisterMediaSession();
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
  },

  watch: {
    currentIndex() {
      this.hasFlipped = false;
      this.playCurrent();
    },
  },

  methods: {
    // ── Media Session ─────────────────────────────────────────────────────
    registerMediaSession() {
      if (!this.mediaSessionSupported) return;
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title:  session.title || 'Study',
          artist: 'Flashcards',
          album:  'Media Study',
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('previoustrack', () => this.onDontKnow());
        navigator.mediaSession.setActionHandler('nexttrack',     () => this.onKnown());
        navigator.mediaSession.setActionHandler('play',          () => this.startSilentAudio());
        navigator.mediaSession.setActionHandler('pause',         () => this.stopSilentAudio());
      } catch (err) {
        console.warn('MediaSession setup failed:', err);
      }
    },
    unregisterMediaSession() {
      if (!this.mediaSessionSupported) return;
      try {
        ['previoustrack', 'nexttrack', 'play', 'pause'].forEach(a => {
          navigator.mediaSession.setActionHandler(a, null);
        });
        navigator.mediaSession.playbackState = 'none';
      } catch { /* noop */ }
    },

    // ── Silent audio (keeps MediaSession active on Android) ───────────────
    startSilentAudio() {
      try {
        const el = this.$refs.silentAudio;
        if (el) {
          el.volume = 0;
          const p = el.play();
          if (p && typeof p.catch === 'function') {
            p.catch(err => console.warn('Silent audio autoplay blocked:', err));
          }
        }
      } catch { /* noop */ }
    },
    stopSilentAudio() {
      try {
        const el = this.$refs.silentAudio;
        if (el) { el.pause(); el.currentTime = 0; }
      } catch { /* noop */ }
    },

    // ── Speech ────────────────────────────────────────────────────────────
    speak(text, side) {
      if (!this.ttsSupported || !text) {
        // No TTS — simulate end so flip/auto-progress still works.
        this.isSpeaking = false;
        this.speakingSide = null;
        if (side === this.settings.startWith) {
          this._advanceTimer = setTimeout(() => this.autoFlipAndReadBack(), 400);
        }
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(String(text));
        u.rate = Number(this.settings.ttsRate) || 1;
        if (this.settings.ttsVoice) {
          const v = window.speechSynthesis.getVoices().find(x => x.name === this.settings.ttsVoice);
          if (v) u.voice = v;
        }
        u.onstart = () => { this.isSpeaking = true; this.speakingSide = side; };
        u.onend   = () => {
          this.isSpeaking = false;
          // Auto-flip after reading the "start" side.
          if (side === this.settings.startWith && !this.hasFlipped) {
            this.autoFlipAndReadBack();
          } else {
            this.speakingSide = null;
          }
        };
        u.onerror = () => { this.isSpeaking = false; this.speakingSide = null; };
        window.speechSynthesis.speak(u);
      } catch (err) {
        console.warn('Speech failed:', err);
        this.isSpeaking = false;
        this.speakingSide = null;
      }
    },
    cancelSpeech() {
      try { if (this.ttsSupported) window.speechSynthesis.cancel(); } catch { /* noop */ }
      this.isSpeaking = false;
      this.speakingSide = null;
    },

    // ── Card flow ─────────────────────────────────────────────────────────
    playCurrent() {
      const card = this.currentCard;
      if (!card) return;
      this.cancelSpeech();
      const startSide = this.settings.startWith === 'back' ? 'back' : 'front';
      this.speak(startSide === 'front' ? card.front : card.back, startSide);
    },
    autoFlipAndReadBack() {
      const card = this.currentCard;
      if (!card) return;
      // Ensure visual flip happens (FlashcardDisplay internal state).
      this.$refs.flashcard?.flip();
      this.hasFlipped = true;
      const otherSide = this.settings.startWith === 'back' ? 'front' : 'back';
      this.speak(otherSide === 'front' ? card.front : card.back, otherSide);
    },
    manualFlip() {
      if (this.hasFlipped) return;
      this.cancelSpeech();
      this.autoFlipAndReadBack();
    },
    onUserFlip() {
      // User tapped the card itself (FlashcardDisplay handled the visual flip).
      if (this.hasFlipped) return;
      this.hasFlipped = true;
      this.cancelSpeech();
      const card = this.currentCard;
      if (!card) return;
      const otherSide = this.settings.startWith === 'back' ? 'front' : 'back';
      this.speak(otherSide === 'front' ? card.front : card.back, otherSide);
    },

    onDontKnow() {
      this.cancelSpeech();
      const card = this.currentCard;
      if (!card) return;
      // Re-queue at the end so the user sees it again later.
      this.queue.push(card);
      this.advance();
    },
    onKnown() {
      this.cancelSpeech();
      const card = this.currentCard;
      if (!card) return;
      this.reviewed++;
      this.advance();
    },
    advance() {
      if (this.currentIndex < this.queue.length - 1) {
        this.currentIndex++;
      } else {
        this.done = true;
        this.cancelSpeech();
        this.stopSilentAudio();
      }
    },

    // ── Keyboard fallback ─────────────────────────────────────────────────
    onKeyDown(e) {
      if (this.done) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.$router.push('/study');
        }
        return;
      }
      if (e.code === 'ArrowLeft')  { e.preventDefault(); this.onDontKnow(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); this.onKnown(); }
      else if (e.code === 'Space') { e.preventDefault(); this.manualFlip(); }
      else if (e.code === 'Escape'){ this.exit(); }
    },

    exit() { this.$router.push('/study'); },
  },
};
</script>

<style scoped>
.media-session {
  min-height: 100vh;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  display: flex;
  flex-direction: column;
}
.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-bottom: 0.0625rem solid var(--secondaryColor);
}
.session-title { font-size: 1rem; font-weight: 600; }
.progress-text { font-size: 0.85rem; opacity: 0.55; }
.btn-ghost {
  background: none; border: none; color: var(--accentColor);
  cursor: pointer; font-size: 0.875rem; opacity: 0.55;
  transition: opacity 0.15s; padding: 0.25rem 0.5rem;
}
.btn-ghost:hover { opacity: 1; }

.progress-bar-track { height: 0.25rem; background: var(--secondaryColor); }
.progress-bar-fill  { height: 100%; background: var(--accentColor); transition: width 0.25s ease; }

.card-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 1.5rem 0.5rem;
}
.status {
  font-size: 0.85rem;
  opacity: 0.55;
  margin: 0;
}
.warn-note {
  font-size: 0.75rem;
  opacity: 0.55;
  font-style: italic;
  margin: 0;
  text-align: center;
}

/* Apply flipped class manually via isFlipped state: FlashcardDisplay tracks
   its own isFlipped, but resets when card prop changes — we rely on clicks
   via manualFlip to drive the flip animation. Auto-flip uses the ref. */

.controls {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1rem 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}
.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.7rem 1.1rem;
  border: 0.125rem solid var(--accentColor);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--accentColor);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 5.5rem;
  transition: background 0.1s, color 0.1s, transform 0.05s;
}
.ctrl-btn:hover:not(:disabled) {
  background: var(--accentColor);
  color: var(--primaryColor);
}
.ctrl-btn:active:not(:disabled) { transform: scale(0.96); }
.ctrl-btn:disabled { opacity: 0.35; cursor: default; }
.ctrl-back  { border-color: #e53935; color: #e53935; }
.ctrl-back:hover:not(:disabled)  { background: #e53935; color: #fff; }
.ctrl-fwd   { border-color: #43a047; color: #43a047; }
.ctrl-fwd:hover:not(:disabled)   { background: #43a047; color: #fff; }
.ctrl-hint {
  font-size: 0.65rem;
  opacity: 0.7;
  font-weight: 400;
}

.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  flex: 1;
  padding: 3rem 1.5rem;
  text-align: center;
}
.summary-title { font-size: 2rem; font-weight: 700; margin: 0; }
.summary-sub   { font-size: 1rem; opacity: 0.6; margin: 0; }
.btn-primary {
  padding: 0.7rem 2rem;
  background: var(--accentColor);
  color: var(--primaryColor);
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.85; }
</style>
