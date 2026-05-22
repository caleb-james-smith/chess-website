// Game controller: owns one game's state, drives the turn loop for all three
// modes, records history for the move list and undo, schedules AI replies,
// and reports results to the match. UI modules subscribe via `on()`.

import {
  createInitialState,
  applyMove,
  getStatus,
  moveToSan,
  positionKey,
  WHITE
} from './engine.js';
import { chooseMove } from './ai.js';
import { Clock } from './clock.js';

const AI_THINK_MS = 350; // pause before a Human-vs-AI reply, so the board repaints

export class Game {
  // config: { mode, board, match, timeControl: {initialMs, incrementMs}, moveDelayMs }
  constructor(config) {
    this.mode = config.mode; // 'hvh' | 'hvai' | 'ava'
    this.board = config.board;
    this.match = config.match;
    this.timeControl = config.timeControl;
    this.moveDelayMs = config.moveDelayMs ?? 600;

    this.state = null;
    this.history = [];          // { san, move, color, key }
    this.snapshots = [];        // pre-move { state, lastMove, clockRemaining }
    this.positionCounts = {};   // positionKey -> occurrences (threefold)
    this.status = { over: false, result: null, reason: null, inCheck: false };
    this.lastMove = null;
    this.paused = false;
    this.clock = null;

    this.listeners = [];
    this._aiToken = 0; // bumped to invalidate pending AI callbacks
    this._tickId = null;
  }

  on(fn) { this.listeners.push(fn); }
  _emit() { for (const fn of this.listeners) fn(this); }

  // --- derived helpers ---------------------------------------------------

  _aiDifficulty(color) {
    const p = this.match.player(this.match.colorIndex(color));
    return p.type === 'ai' ? (p.difficulty || 'medium') : null;
  }

  _humanToMove() {
    return this._aiDifficulty(this.state.turn) == null;
  }

  _orientation() {
    if (this.mode === 'hvh') return this.state.turn === WHITE ? 'white' : 'black';
    if (this.mode === 'hvai') {
      const humanIndex = this.match.players.findIndex(p => p.type === 'human');
      return this.match.playerColor(humanIndex) === 'w' ? 'white' : 'black';
    }
    return 'white';
  }

  // --- lifecycle ---------------------------------------------------------

  start() {
    this.state = createInitialState();
    this.history = [];
    this.snapshots = [];
    this.positionCounts = {};
    this.positionCounts[positionKey(this.state)] = 1;
    this.lastMove = null;
    this.status = getStatus(this.state);
    this.paused = this.mode === 'ava';
    this._aiToken++;

    this.clock = new Clock(this.timeControl.initialMs, this.timeControl.incrementMs);
    if (!this.paused) this.clock.start(WHITE);

    this.board.onMove = (move) => this.makeMove(move);
    this._refreshBoard();
    this._startTicking();
    this._scheduleAI();
    this._emit();
  }

  // Start the next game of the match (colors alternate, scores persist).
  newGame() {
    this.match.nextGame();
    this.start();
  }

  destroy() {
    this._stopTicking();
    this._aiToken++;
  }

  // --- moves -------------------------------------------------------------

  makeMove(move) {
    if (this.status.over || this.paused) return;
    const mover = this.state.turn;
    const san = moveToSan(this.state, move);

    this.snapshots.push({
      state: this.state,
      lastMove: this.lastMove,
      clockRemaining: { w: this.clock.get('w'), b: this.clock.get('b') }
    });

    this.state = applyMove(this.state, move);
    const key = positionKey(this.state);
    this.positionCounts[key] = (this.positionCounts[key] || 0) + 1;
    this.history.push({ san, move, color: mover, key });
    this.lastMove = move;
    this.clock.press(mover);

    this.status = getStatus(this.state, { repetition: this.positionCounts[key] >= 3 });
    this._refreshBoard();
    if (this.status.over) this._finishGame();
    else this._scheduleAI();
    this._emit();
  }

  undo() {
    if (this.snapshots.length === 0 || this.mode === 'ava') return;
    this.clock.active = null; // detach before restoring times

    const popOne = () => {
      const snap = this.snapshots.pop();
      const entry = this.history.pop();
      this.positionCounts[entry.key]--;
      this.state = snap.state;
      this.lastMove = snap.lastMove;
      this.clock.remaining.w = snap.clockRemaining.w;
      this.clock.remaining.b = snap.clockRemaining.b;
    };

    popOne();
    // In Human vs AI, also undo the AI's reply so it stays the human's turn.
    if (this.mode === 'hvai') {
      while (this.snapshots.length > 0 && !this._humanToMove()) popOne();
    }

    this._aiToken++;
    this.status = getStatus(this.state, {
      repetition: (this.positionCounts[positionKey(this.state)] || 0) >= 3
    });
    this._syncClockToTurn();
    this._refreshBoard();
    this._emit();
  }

  resign() {
    if (this.status.over || this.mode === 'ava') return;
    const loser = this.state.turn;
    this.status = {
      over: true,
      result: loser === WHITE ? 'black' : 'white',
      reason: 'resignation',
      inCheck: this.status.inCheck
    };
    this._finishGame();
    this._refreshBoard();
    this._emit();
  }

  // --- AI vs AI controls -------------------------------------------------

  togglePause() {
    if (this.mode !== 'ava' || this.status.over) return;
    this.paused = !this.paused;
    this._aiToken++;
    if (this.paused) {
      this.clock.pause();
    } else {
      this.clock.start(this.state.turn);
      this._scheduleAI();
    }
    this._refreshBoard();
    this._emit();
  }

  setMoveDelay(ms) {
    this.moveDelayMs = ms;
  }

  // --- internals ---------------------------------------------------------

  _scheduleAI() {
    if (this.status.over || this.paused) return;
    const difficulty = this._aiDifficulty(this.state.turn);
    if (!difficulty) return;
    const token = this._aiToken;
    const delay = this.mode === 'ava' ? this.moveDelayMs : AI_THINK_MS;
    setTimeout(() => {
      if (token !== this._aiToken || this.status.over || this.paused) return;
      const move = chooseMove(this.state, difficulty);
      if (move && token === this._aiToken) this.makeMove(move);
    }, delay);
  }

  _finishGame() {
    this.clock.pause();
    this._stopTicking();
    this._aiToken++;
    this.match.recordResult(this.status.result);
  }

  _syncClockToTurn() {
    if (this.status.over || this.paused) this.clock.pause();
    else this.clock.start(this.state.turn);
  }

  _refreshBoard() {
    this.board.setState(this.state);
    this.board.setLastMove(this.lastMove);
    this.board.setOrientation(this._orientation());
    this.board.setInteractive(this._humanToMove() && !this.status.over && !this.paused);
    this.board.render();
  }

  _startTicking() {
    this._stopTicking();
    if (this.clock.unlimited) return;
    this._tickId = setInterval(() => this._onTick(), 200);
  }

  _stopTicking() {
    if (this._tickId != null) {
      clearInterval(this._tickId);
      this._tickId = null;
    }
  }

  _onTick() {
    if (!this.status.over) {
      const flagged = this.clock.flagged();
      if (flagged) {
        this.status = {
          over: true,
          result: flagged === WHITE ? 'black' : 'white',
          reason: 'timeout',
          inCheck: this.status.inCheck
        };
        this._finishGame();
        this._refreshBoard();
      }
    }
    this._emit();
  }
}
