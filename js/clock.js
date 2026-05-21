// Per-player countdown clock with optional increment. Time is computed lazily
// from a wall-clock anchor, so callers can poll `get()` as often as they like
// without driving the countdown themselves.

export const TIME_CONTROLS = {
  unlimited: { label: 'Unlimited', initialMs: null, incrementMs: 0 },
  blitz: { label: 'Blitz 5+0', initialMs: 5 * 60 * 1000, incrementMs: 0 },
  rapid: { label: 'Rapid 10+0', initialMs: 10 * 60 * 1000, incrementMs: 0 },
  rapidInc: { label: 'Rapid 10+5', initialMs: 10 * 60 * 1000, incrementMs: 5000 }
};

export class Clock {
  constructor(initialMs, incrementMs = 0) {
    this.unlimited = initialMs == null;
    this.incrementMs = incrementMs;
    this.remaining = { w: initialMs, b: initialMs };
    this.active = null;
    this._anchor = 0;
  }

  // Subtract elapsed wall-clock time from the active player.
  _drain() {
    if (this.unlimited || this.active == null) return;
    const now = Date.now();
    this.remaining[this.active] = Math.max(0, this.remaining[this.active] - (now - this._anchor));
    this._anchor = now;
  }

  // Begin counting down for `color` (used at game start / after a pause).
  start(color) {
    this._drain();
    this.active = color;
    this._anchor = Date.now();
  }

  // The player of `color` just completed a move: bank the increment and
  // hand the countdown to the opponent.
  press(color) {
    this._drain();
    if (!this.unlimited) this.remaining[color] += this.incrementMs;
    this.active = color === 'w' ? 'b' : 'w';
    this._anchor = Date.now();
  }

  pause() {
    this._drain();
    this.active = null;
  }

  // Remaining milliseconds for a color (null when the clock is unlimited).
  get(color) {
    this._drain();
    return this.remaining[color];
  }

  // Color whose time has run out, or null.
  flagged() {
    if (this.unlimited) return null;
    this._drain();
    if (this.remaining.w <= 0) return 'w';
    if (this.remaining.b <= 0) return 'b';
    return null;
  }
}

// Format milliseconds as M:SS, or H:MM:SS past an hour.
export function formatClock(ms) {
  if (ms == null) return '∞';
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}
