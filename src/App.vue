<template>
  <SideBar />
  <div class="everythingElse">

  </div>
</template>

<script>
import SideBar from './components/SidebarComponents/SideBar.vue';
import { createApp } from 'vue';
import PiP from './components/LearnComponents/PiP.vue';

export default {
  components: {
    SideBar,
  },
  data() {
    return {
      showPiP: false,       // current PiP state
      bc: null,
      _beforeUnloadHandler: null,
      pipWindow: null,
      pipCheckerInterval: null,
      lastPomodoroState: null,
      titleInterval: null,
    };
  },
  mounted() {
    // Try to load colors from localStorage and apply to :root
    const saved = JSON.parse(localStorage.getItem('siteColors') || 'null');
    if (saved) {
      document.documentElement.style.setProperty('--primaryColor', saved.primary);
      document.documentElement.style.setProperty('--secondaryColor', saved.secondary);
      document.documentElement.style.setProperty('--accentColor', saved.accent);
    }

    // BroadcastChannel for pomodoro sync, PiP toggling, and pomodoro state
    this.bc = new BroadcastChannel('pomodoro_channel');
    this.bc.onmessage = (ev) => {
      const m = ev && ev.data;
      if (!m) return;
      if (m.type === 'toggle_pip') {
        this.togglePiP();
      } else if (m.type === 'request_pip_status') {
        this.bc.postMessage({ type: 'pip_status', payload: { isOpen: !!this.pipWindow && !this.pipWindow.closed }});
      } else if (m.type === 'state' && m.payload) {
        // cache latest pomodoro state and update title immediately
        this.lastPomodoroState = m.payload;
        this.updateTitleFromPomodoroState();
      }
    };

    // close pip when main page unloads
    this._beforeUnloadHandler = () => {
      if (this.bc) {
        this.bc.postMessage({ type: 'close' });
      }
      // ensure pip window is closed
      try {
        if (this.pipWindow && !this.pipWindow.closed) this.pipWindow.close();
      } catch (e) {}
    };
    window.addEventListener('beforeunload', this._beforeUnloadHandler);

    // keep title in sync every second even if only PiP is running
    this.titleInterval = setInterval(() => {
      this.updateTitleFromPomodoroState();
    }, 1000);
  },
  methods: {
    togglePiP() {
      if (this.pipWindow && !this.pipWindow.closed) {
        this.closePiP();
      } else {
        this.openPiP();
      }
    },
    async openPiP() {
      if (!('documentPictureInPicture' in window)) {
        alert('Your browser does not support documentPictureInPicture.');
        return;
      }
      try {
        // make window a bit shorter vertically (was 220 -> now 180)
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 320,
          height: 180
        });
        this.pipWindow = pipWin;

        // Basic doc head for PiP window
        try {
          pipWin.document.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
        } catch (e) {}

        // copy styles from the main document into PiP window so it is styled
        try {
          const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
          styleNodes.forEach(node => {
            try { pipWin.document.head.appendChild(node.cloneNode(true)); } catch (e) {}
          });
        } catch (e) {}

        // create root and mount the PiP Vue app
        pipWin.document.body.innerHTML = '<div id="pip-root"></div>';
        createApp(PiP).mount(pipWin.document.getElementById('pip-root'));

        // copy any new style tags Vue injected during mount (scoped styles)
        setTimeout(() => {
          try {
            const mainStyles = Array.from(document.querySelectorAll('style'));
            mainStyles.forEach(s => {
              // avoid duplicates by comparing textContent
              const exists = Array.from(pipWin.document.head.querySelectorAll('style')).some(ps => ps.textContent === s.textContent);
              if (!exists) {
                try { pipWin.document.head.appendChild(s.cloneNode(true)); } catch (e) {}
              }
            });
          } catch (e) {}
        }, 60);
      } catch (e) {
        this.pipWindow = null;
        return;
      }
      localStorage.setItem('pomodoro_show_pip', 'true');
      this.bc.postMessage({ type: 'pip_status', payload: { isOpen: !!this.pipWindow }});
      // poll for pip closed by user
      if (this.pipCheckerInterval) clearInterval(this.pipCheckerInterval);
      this.pipCheckerInterval = setInterval(() => {
        if (!this.pipWindow || this.pipWindow.closed) {
          clearInterval(this.pipCheckerInterval);
          this.pipCheckerInterval = null;
          this.pipWindow = null;
          localStorage.setItem('pomodoro_show_pip', 'false');
          this.bc.postMessage({ type: 'pip_status', payload: { isOpen: false }});
        }
      }, 500);
    },
    closePiP() {
      try {
        if (this.pipWindow && !this.pipWindow.closed) this.pipWindow.close();
      } catch (e) {}
      this.pipWindow = null;
      if (this.pipCheckerInterval) { clearInterval(this.pipCheckerInterval); this.pipCheckerInterval = null; }
      localStorage.setItem('pomodoro_show_pip', 'false');
      this.bc.postMessage({ type: 'pip_status', payload: { isOpen: false }});
    },
    updateTitleFromPomodoroState() {
      if (typeof window === 'undefined') return;

      const payload = this.lastPomodoroState;
      if (!payload) {
        window.__pomodoroRunning = false;
        const base = window.__baseTitle || 'Finish This';
        document.title = base;
        return;
      }

      const mode = payload.mode === 'break' ? 'break' : 'work';
      const duration = mode === 'work' ? payload.workDuration : payload.breakDuration;

      let remainingSeconds;
      if (!payload.startTimestamp) {
        remainingSeconds = duration;
      } else if (payload.isRunning) {
        const elapsed = Math.floor((Date.now() - payload.startTimestamp) / 1000);
        remainingSeconds = Math.max(0, duration - elapsed);
      } else {
        const elapsed = Math.floor((payload.pausedAt - payload.startTimestamp) / 1000);
        remainingSeconds = Math.max(0, duration - elapsed);
      }

      if (payload.isRunning && remainingSeconds > 0) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        window.__pomodoroRunning = true;
        document.title = display;
      } else {
        window.__pomodoroRunning = false;
        const base = window.__baseTitle || 'Finish This';
        document.title = base;
      }
    },
  },
  unmounted() {
    if (this.bc) this.bc.close();
    if (this._beforeUnloadHandler) window.removeEventListener('beforeunload', this._beforeUnloadHandler);
    if (this.pipCheckerInterval) clearInterval(this.pipCheckerInterval);
    if (this.pipWindow && !this.pipWindow.closed) {
      try { this.pipWindow.close(); } catch (e) {}
    }
    if (this.titleInterval) clearInterval(this.titleInterval);
  }
};
</script>

<style>
body,
html {
  margin: 0;
  padding: 0;
  font-size: 16px; /* base for rem units */
}
#app {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: 'Roboto', sans-serif, Avenir, Helvetica, Arial;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.everythingElse {
  padding-left: 12.5rem; /* 200px = 12.5rem */
}
</style>