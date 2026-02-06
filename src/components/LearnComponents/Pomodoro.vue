<template>
  <div class="pomodoro">
    <div class="header">{{ modeLabel }}</div>

    <div ref="ring" class="ring-wrapper"
         :class="{ 'draggable': canDrag, 'dragging': isDragging }"
         @mousedown.prevent="startDrag"
         @touchstart.prevent="startDrag">
      <svg :width="svgSize" :height="svgSize" viewBox="0 0 200 200" class="ring-svg" >
        <circle cx="100" cy="100" r="90" class="ring-track" />
        <circle cx="100" cy="100" r="90" class="ring-progress"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset" />
        <circle class="ring-handle" :cx="markerX" :cy="markerY" r="6" />
      </svg>
      <div class="ring-center">
        <div class="time">{{ displayTime }}</div>
        <div class="modeSmall">{{ modeLabel }}</div>
      </div>
    </div>

    <div class="controls">
      <button @click="toggleStart">{{ isRunning ? 'Pause' : 'Start' }}</button>
      <button @click="restart" aria-label="restart">🔄</button>
      <button @click="skip" aria-label="skip">⏭️</button>
      <button @click="togglePiP">{{ pipOpen ? 'Close Mini' : 'Mini Timer' }}</button>
    </div>

    <div class="durations">
      <!-- Break duration edited via the circular selector when paused -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'Pomodoro',
  data() {
    return {
      workDuration: 50 * 60,
      breakDuration: 10 * 60,
      mode: 'work',
      startTimestamp: null,
      pausedAt: null,
      isRunning: false,
      uiInterval: null,
      now: Date.now(),
      stateBroadcastInterval: null,
      bc: null,
      preMountInterval: null,
      pipOpen: false,
      isDragging: false,
      svgSize: 200,
    };
  },
  created() {
    this.bc = new BroadcastChannel('pomodoro_channel');
    this.bc.onmessage = (ev) => {
      if (!ev || !ev.data) return;
      this.handleIncoming(ev.data);
    };

    // hydrate from storage to avoid flash
    try {
      const saved = JSON.parse(localStorage.getItem('pomodoro_state') || 'null');
      if (saved) {
        this.isRunning = saved.isRunning;
        this.mode = saved.mode;
        this.startTimestamp = saved.startTimestamp;
        this.pausedAt = saved.pausedAt;
        this.workDuration = saved.workDuration;
        this.breakDuration = saved.breakDuration;
        this.now = Date.now();
        if (this.isRunning) this.ensureTick();
      }
    } catch (e) { /* ignore */ }

    this.bc.postMessage({ type: 'request_state' });

    this.preMountInterval = setInterval(() => { this.now = Date.now(); }, 500);
  },
  computed: {
    currentDuration() {
      return this.mode === 'work' ? this.workDuration : this.breakDuration;
    },
    remainingSeconds() {
      if (!this.startTimestamp) return this.currentDuration;
      if (this.isRunning) {
        const elapsed = Math.floor((this.now - this.startTimestamp) / 1000);
        return Math.max(0, Math.floor(this.currentDuration - elapsed));
      } else {
        const elapsed = Math.floor((this.pausedAt - this.startTimestamp) / 1000);
        return Math.max(0, Math.floor(this.currentDuration - elapsed));
      }
    },
    displayTime() {
      const s = this.remainingSeconds;
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    },
    modeLabel() {
      return this.mode === 'work' ? 'Work' : 'Break';
    },
    workMinutes: {
      get() { return Math.floor(this.workDuration / 60); },
      set(v) { this.workDuration = Math.max(60, Math.floor(v) * 60); this.broadcastState(); }
    },
    breakMinutes: {
      get() { return Math.floor(this.breakDuration / 60); },
      set(v) { this.breakDuration = Math.max(60, Math.floor(v) * 60); this.broadcastState(); }
    },
    radius() { return 90; },
    circumference() { return 2 * Math.PI * this.radius; },
    displayMinutes() {
      return this.mode === 'work'
        ? (this.isRunning ? this.remainingSeconds / 60 : this.workDuration / 60)
        : (this.isRunning ? this.remainingSeconds / 60 : this.breakDuration / 60);
    },
    strokeDashoffset() {
      const pct = Math.max(0, Math.min(1, this.displayMinutes / 120));
      return this.circumference * (1 - pct);
    },
    // allow dragging when paused for both work and break modes
    canDrag() {
      return !this.isRunning && (this.mode === 'work' || this.mode === 'break');
    },
    // marker coordinates for handle dot
    markerAngle() {
      const angle = (this.displayMinutes / 120) * 2 * Math.PI;
      return angle;
    },
    markerX() {
      const cx = 100;
      const r = this.radius;
      return cx + r * Math.sin(this.markerAngle);
    },
    markerY() {
      const cy = 100;
      const r = this.radius;
      return cy - r * Math.cos(this.markerAngle);
    },
  },
  methods: {
    start(broadcastCommand = true) {
      if (!this.startTimestamp) this.startTimestamp = Date.now();
      else if (this.pausedAt) { this.startTimestamp += Date.now() - this.pausedAt; this.pausedAt = null; }
      // immediately sync UI time so display doesn't briefly show stale seconds
      this.now = Date.now();
      this.isRunning = true;
      this.ensureTick();
      if (broadcastCommand) this.broadcastCommand({ cmd: 'start' });
      this.broadcastState();
    },
    pause(broadcastCommand = true) {
      if (!this.isRunning) return;
      this.pausedAt = Date.now();
      this.isRunning = false;
      this.clearTick();
      if (broadcastCommand) this.broadcastCommand({ cmd: 'pause' });
      this.broadcastState();
    },
    toggleStart() {
      if (this.isRunning) this.pause(); else this.start();
    },
    restart(broadcastCommand = true) {
      this.startTimestamp = Date.now();
      this.pausedAt = null;
      // sync UI immediately to avoid a jump
      this.now = Date.now();
      this.isRunning = true;
      this.ensureTick();
      if (broadcastCommand) this.broadcastCommand({ cmd: 'restart' });
      this.broadcastState();
    },
    skip(broadcastCommand = true) {
      this.mode = this.mode === 'work' ? 'break' : 'work';
      this.startTimestamp = Date.now();
      this.pausedAt = this.startTimestamp;
      // ensure UI reflects the new paused time immediately
      this.now = Date.now();
      this.isRunning = false;
      this.clearTick();
      if (broadcastCommand) this.broadcastCommand({ cmd: 'skip' });
      this.broadcastState();
    },
    ensureTick() {
      if (this.uiInterval) return;
      // sync UI immediately, then start periodic updates
      this.now = Date.now();
      this.uiInterval = setInterval(() => {
        this.now = Date.now();
        if (this.isRunning && this.remainingSeconds <= 0) {
          this.mode = this.mode === 'work' ? 'break' : 'work';
          this.startTimestamp = Date.now();
          this.pausedAt = null;
          this.broadcastState();
        }
      }, 500);
    },
    clearTick() {
      if (this.uiInterval) { clearInterval(this.uiInterval); this.uiInterval = null; }
    },
    broadcastState() {
      if (!this.bc) return;
      this.bc.postMessage({
        type: 'state',
        payload: {
          isRunning: this.isRunning,
          mode: this.mode,
          startTimestamp: this.startTimestamp,
          pausedAt: this.pausedAt,
          workDuration: this.workDuration,
          breakDuration: this.breakDuration
        }
      });
    },
    broadcastCommand(cmdObj) {
      if (!this.bc) return;
      this.bc.postMessage({ type: 'command', cmd: cmdObj.cmd, data: cmdObj.data || null });
    },
    handleIncoming(msg) {
      const { type, payload, cmd } = msg;
      if (type === 'state' && payload) {
        this.isRunning = payload.isRunning;
        this.mode = payload.mode;
        this.startTimestamp = payload.startTimestamp;
        this.pausedAt = payload.pausedAt;
        this.workDuration = payload.workDuration;
        this.breakDuration = payload.breakDuration;
        this.now = Date.now();
        if (this.preMountInterval) { clearInterval(this.preMountInterval); this.preMountInterval = null; }
        if (this.isRunning) this.ensureTick(); else this.clearTick();
      } else if (type === 'command') {
        if (cmd === 'start') this.start(false);
        if (cmd === 'pause') this.pause(false);
        if (cmd === 'restart') this.restart(false);
        if (cmd === 'skip') this.skip(false);
        this.broadcastState();
      } else if (type === 'request_state') {
        this.broadcastState();
      } else if (type === 'pip_status' && payload) {
        this.pipOpen = !!payload.isOpen;
      }
    },
    togglePiP() {
      if (this.bc) this.bc.postMessage({ type: 'toggle_pip' });
    },
    startDrag(evt) {
      if (!this.canDrag) return;
      this.isDragging = true;
      window.addEventListener('mousemove', this.onDrag);
      window.addEventListener('touchmove', this.onDrag, { passive: false });
      window.addEventListener('mouseup', this.endDrag);
      window.addEventListener('touchend', this.endDrag);
      this.onDrag(evt);
    },
    onDrag(ev) {
      if (!this.isDragging) return;
      if (ev.cancelable) ev.preventDefault();
      const e = (ev.touches && ev.touches[0]) ? ev.touches[0] : ev;
      const el = (this.$refs && this.$refs.ring) ? this.$refs.ring : document.querySelector('.ring-wrapper');
      if (!el) return;
      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      let angle = Math.atan2(dy, dx);
      angle += Math.PI / 2;
      if (angle < 0) angle += 2 * Math.PI;
      const minutes = (angle / (2 * Math.PI)) * 120;
      const minutesClamped = Math.max(0, Math.min(120, Math.round(minutes)));
      // update the duration corresponding to the active mode
      if (this.mode === 'work') {
        this.workDuration = Math.max(60, minutesClamped * 60);
      } else {
        this.breakDuration = Math.max(60, minutesClamped * 60);
      }
      // ensure paused seconds are zero by making pausedAt == startTimestamp (or initialize timestamps)
      const now = Date.now();
      if (!this.startTimestamp) this.startTimestamp = now;
      this.pausedAt = this.startTimestamp;
      this.now = now;
      this.broadcastState();
    },
    endDrag() {
      if (!this.isDragging) return;
      this.isDragging = false;
      window.removeEventListener('mousemove', this.onDrag);
      window.removeEventListener('touchmove', this.onDrag);
      window.removeEventListener('mouseup', this.endDrag);
      window.removeEventListener('touchend', this.endDrag);
      // ensure paused seconds remain zero at the end of drag
      if (!this.startTimestamp) this.startTimestamp = Date.now();
      this.pausedAt = this.startTimestamp;
      this.broadcastState();
    }
  },
  mounted() {
    this.bc.postMessage({ type: 'request_state' });
    this.stateBroadcastInterval = setInterval(() => { this.broadcastState(); }, 1000);
  },
  beforeUnmount() {
    if (this.bc) { this.bc.close(); this.bc = null; }
    if (this.uiInterval) clearInterval(this.uiInterval);
    if (this.stateBroadcastInterval) clearInterval(this.stateBroadcastInterval);
    if (this.preMountInterval) { clearInterval(this.preMountInterval); this.preMountInterval = null; }
    // safety: remove any leftover listeners
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('touchmove', this.onDrag);
    window.removeEventListener('mouseup', this.endDrag);
    window.removeEventListener('touchend', this.endDrag);
  }
};
</script>

<style scoped>
.pomodoro {
  background: var(--secondaryColor);
  color: var(--accentColor);
  padding: 1rem;
  border-radius: 0.5rem;
  width: 18rem;
  box-sizing: border-box;
}
.header {
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}

/* ring styles */
.ring-wrapper {
  position: relative;
  display: block;
  margin: 0.5rem auto;
  touch-action: none;
  width: 200px;
  height: 200px;
}
.ring-svg {
  display: block;
  width: 100%;
  height: 100%;
}
.ring-track {
  fill: none;
  stroke: rgba(255,255,255,0.08);
  stroke-width: 16;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}
.ring-progress {
  fill: none;
  stroke: var(--primaryColor);
  stroke-width: 16;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.15s linear;
}
.ring-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.modeSmall { font-size: 0.8rem; opacity: 0.85; margin-top: 4px; }
.time { font-size: 1.4rem; font-weight: 600; }

.controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.5rem;
}
.controls button {
  padding: 0.4rem 0.6rem;
  border-radius: 0.25rem;
  border: none;
  background: var(--primaryColor);
  color: var(--accentColor);
  cursor: pointer;
}

/* visually indicate draggable area when allowed */
.ring-wrapper.draggable { cursor: pointer; }
.ring-wrapper.dragging .ring-progress { stroke-width: 18; }

/* Disable mini timer button on mobile */
@media (max-width: 600px) {
  .controls button:last-child {
    pointer-events: none;
    opacity: 0.5;
    cursor: not-allowed;
  }
}
.ring-handle {
  fill: var(--accentColor);
  stroke: rgba(0,0,0,0.25);
  stroke-width: 1;
  cursor: grab;
  transition: transform 0.08s linear;
}
.ring-wrapper.dragging .ring-handle {
  transform-origin: 100px 100px;
  transform: scale(1.12);
  cursor: grabbing;
}
</style>
