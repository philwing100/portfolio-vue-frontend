<template>
  <div class="pip-card">
    <div class="mode">{{ modeLabel }}</div>
    <div class="clock">{{ displayTime }}</div>
    <div class="controls">
      <button id="start" @click="toggleStart">{{ isRunning ? 'Pause' : 'Start' }}</button>
      <button id="restart" aria-label="restart" @click="restart">🔄</button>
      <button id="skip" aria-label="skip" @click="skip">⏭️</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PiP',
  data() {
    return {
      isRunning: false,
      mode: 'work',
      startTimestamp: null,
      pausedAt: null,
      workDuration: 50 * 60,
      breakDuration: 10 * 60,
      now: Date.now(),
      bc: null,
      interval: null,
    };
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
    }
  },
  methods: {
    sendState() {
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
      try { localStorage.setItem('pomodoro_state', JSON.stringify({
        isRunning: this.isRunning,
        mode: this.mode,
        startTimestamp: this.startTimestamp,
        pausedAt: this.pausedAt,
        workDuration: this.workDuration,
        breakDuration: this.breakDuration
      })); } catch (e) {}
    },
    handleIncoming(msg) {
      if (msg.type === 'state' && msg.payload) {
        Object.assign(this, msg.payload);
        try { localStorage.setItem('pomodoro_state', JSON.stringify(msg.payload)); } catch (e) {}
      } else if (msg.type === 'close') {
        window.close();
      }
    },
    toggleStart() {
      if (this.isRunning) {
        this.pausedAt = Date.now();
        this.isRunning = false;
        this.bc.postMessage({ type: 'command', cmd: 'pause' });
      } else {
        if (!this.startTimestamp) {
          this.startTimestamp = Date.now();
        } else if (this.pausedAt) {
          this.startTimestamp += Date.now() - this.pausedAt;
          this.pausedAt = null;
        }
        this.isRunning = true;
        this.bc.postMessage({ type: 'command', cmd: 'start' });
      }
      this.sendState();
    },
    restart() {
      this.startTimestamp = Date.now();
      this.pausedAt = null;
      this.isRunning = true;
      this.bc.postMessage({ type: 'command', cmd: 'restart' });
      this.sendState();
    },
    skip() {
      this.mode = this.mode === 'work' ? 'break' : 'work';
      this.startTimestamp = Date.now();
      this.pausedAt = this.startTimestamp;
      this.isRunning = false;
      this.bc.postMessage({ type: 'command', cmd: 'skip' });
      this.sendState();
    }
  },
  created() {
    this.bc = new BroadcastChannel('pomodoro_channel');
    this.bc.onmessage = (ev) => {
      if (!ev || !ev.data) return;
      this.handleIncoming(ev.data);
    };
    // hydrate from localStorage if available
    try {
      const saved = JSON.parse(localStorage.getItem('pomodoro_state') || 'null');
      if (saved) Object.assign(this, saved);
    } catch (e) {}
    // ask for initial state
    this.bc.postMessage({ type: 'request_state' });
    this.interval = setInterval(() => { this.now = Date.now(); }, 500);
  },
  beforeUnmount() {
    if (this.bc) this.bc.close();
    if (this.interval) clearInterval(this.interval);
  }
};
</script>

<style scoped>
.pip-card {
  padding: 8px;           /* slightly smaller */
  border-radius: 6px;
  width: 280px;
  background: #111827;
  color: white;
  text-align: center;
  font-family: sans-serif;
  box-sizing: border-box;
  /* keep a compact height to fit the new smaller PiP window */
  min-height: 120px;
}
.mode {
  font-size: 0.85rem;
  opacity: 0.95;
  margin-bottom: 6px;
}
.clock {
  font-size: 1.6rem;      /* slightly smaller */
  margin: 6px 0;
}
.controls {
  display: flex;
  gap: 6px;
  justify-content: center;
}
button {
  padding: 6px 8px;
  background: #2563eb;
  border: none;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
