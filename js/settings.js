// User preferences: piece set, board color theme, and light/dark mode.
// Persisted to localStorage and applied as data-* attributes on <html> so
// CSS reacts instantly. Light/dark defaults to the OS setting until the user
// makes an explicit choice.

const STORAGE_KEY = 'chess-website-settings';

const DEFAULTS = {
  pieceSet: 'standard',   // 'standard' | 'neo'
  boardTheme: 'standard', // 'standard' | 'neo'
  mode: 'system'          // 'system' | 'light' | 'dark'
};

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.assign(this.values, saved);
    } catch {
      // Corrupt or unavailable storage — fall back to defaults.
    }
    this.onChange = null;
    // Re-apply when the OS theme changes while in 'system' mode.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.values.mode === 'system') this.apply();
    });
  }

  get pieceSet() { return this.values.pieceSet; }
  get boardTheme() { return this.values.boardTheme; }
  get mode() { return this.values.mode; }

  // The light/dark value actually in effect right now.
  get effectiveTheme() {
    if (this.values.mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return this.values.mode;
  }

  apply() {
    const root = document.documentElement;
    root.dataset.theme = this.effectiveTheme;
    root.dataset.boardTheme = this.values.boardTheme;
    root.dataset.pieceSet = this.values.pieceSet;
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      // Storage unavailable (private mode, etc.) — settings stay session-only.
    }
  }

  _update(key, value) {
    this.values[key] = value;
    this._save();
    this.apply();
    if (this.onChange) this.onChange(key, value);
  }

  setPieceSet(name) { this._update('pieceSet', name); }
  setBoardTheme(name) { this._update('boardTheme', name); }
  setMode(mode) { this._update('mode', mode); }

  // Flip between light and dark, recording an explicit choice.
  toggleLightDark() {
    this.setMode(this.effectiveTheme === 'dark' ? 'light' : 'dark');
  }
}
