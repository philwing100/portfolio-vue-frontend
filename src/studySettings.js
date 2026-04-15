const LS_KEY = 'study-settings';

export const DEFAULT_SETTINGS = Object.freeze({
  flashcardsType: 'standard',  // 'standard' | 'media'
  startWith:      'front',     // 'front' | 'back'
  ttsRate:        1.0,         // 0.5 – 2.0
  ttsVoice:       null,        // voice name string or null for default
});

export function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }
}
