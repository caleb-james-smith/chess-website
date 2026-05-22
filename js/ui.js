// Game-view chrome: two player score cards (editable names, scores, clocks,
// green active-turn highlight), the SAN move-history list, the status/result
// line, and the control buttons. Rebuilt structure once; refreshed on every
// game change via the controller's `on()` subscription.

import { formatClock } from './clock.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const RESULT_TEXT = {
  checkmate: name => `${name} wins by checkmate`,
  resignation: name => `${name} wins by resignation`,
  timeout: name => `${name} wins on time`,
  stalemate: () => 'Draw by stalemate',
  fiftymove: () => 'Draw by fifty-move rule',
  insufficient: () => 'Draw by insufficient material',
  threefold: () => 'Draw by threefold repetition'
};

export class GameUI {
  constructor({ game, onExit }) {
    this.game = game;
    this.onExit = onExit;

    this.statusEl = document.getElementById('game-status');
    this.cardsEl = document.getElementById('player-cards');
    this.controlsEl = document.getElementById('game-controls');
    this.historyEl = document.getElementById('move-history');

    this._buildCards();
    this._buildControls();

    game.on(() => this.render());
    this.render();
  }

  _displayName(index) {
    return this.game.match.player(index).name.trim() || `Player ${index + 1}`;
  }

  // --- construction ------------------------------------------------------

  _buildCards() {
    this.cardsEl.innerHTML = '';
    this.cards = [0, 1].map(index => {
      const card = el('div', 'player-card');

      const nameInput = el('input', 'player-name');
      nameInput.type = 'text';
      nameInput.maxLength = 24;
      nameInput.value = this.game.match.player(index).name;
      nameInput.setAttribute('aria-label', `Player ${index + 1} name`);
      nameInput.addEventListener('input', () => {
        this.game.match.setName(index, nameInput.value);
        this._renderStatus();
      });

      const colorBadge = el('span', 'color-badge');
      const clockEl = el('span', 'player-clock');
      const scoreEl = el('span', 'player-score');

      const topRow = el('div', 'card-row');
      topRow.append(nameInput, colorBadge);

      const bottomRow = el('div', 'card-row');
      const scoreWrap = el('span', 'score-wrap');
      scoreWrap.append(el('span', 'score-label', 'Score'), scoreEl);
      bottomRow.append(scoreWrap, clockEl);

      card.append(topRow, bottomRow);
      this.cardsEl.appendChild(card);
      return { card, nameInput, colorBadge, clockEl, scoreEl };
    });
  }

  _buildControls() {
    this.controlsEl.innerHTML = '';
    const mode = this.game.mode;

    if (mode === 'ava') {
      this.pauseBtn = el('button', 'btn btn-primary', 'Start');
      this.pauseBtn.type = 'button';
      this.pauseBtn.addEventListener('click', () => this.game.togglePause());

      const delayWrap = el('label', 'delay-control');
      delayWrap.append(el('span', 'delay-label', 'Move delay'));
      this.delaySlider = el('input', 'delay-slider');
      this.delaySlider.type = 'range';
      this.delaySlider.min = '100';
      this.delaySlider.max = '2500';
      this.delaySlider.step = '100';
      this.delaySlider.value = String(this.game.moveDelayMs);
      this.delayValue = el('span', 'delay-value', `${(this.game.moveDelayMs / 1000).toFixed(1)}s`);
      this.delaySlider.addEventListener('input', () => {
        const ms = Number(this.delaySlider.value);
        this.game.setMoveDelay(ms);
        this.delayValue.textContent = `${(ms / 1000).toFixed(1)}s`;
      });
      delayWrap.append(this.delaySlider, this.delayValue);
      this.controlsEl.append(this.pauseBtn, delayWrap);
    } else {
      this.undoBtn = el('button', 'btn', 'Undo');
      this.undoBtn.type = 'button';
      this.undoBtn.addEventListener('click', () => this.game.undo());

      this.resignBtn = el('button', 'btn', 'Resign');
      this.resignBtn.type = 'button';
      this.resignBtn.addEventListener('click', () => this.game.resign());
      this.controlsEl.append(this.undoBtn, this.resignBtn);
    }

    this.newGameBtn = el('button', 'btn', 'New Game');
    this.newGameBtn.type = 'button';
    this.newGameBtn.addEventListener('click', () => this.game.newGame());

    const homeBtn = el('button', 'btn btn-ghost', 'Home');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => this.onExit());

    this.controlsEl.append(this.newGameBtn, homeBtn);
  }

  // --- rendering ---------------------------------------------------------

  render() {
    this._renderCards();
    this._renderStatus();
    this._renderHistory();
    this._renderControls();
  }

  _renderCards() {
    const { game } = this;
    const activeIndex = game.match.colorIndex(game.state.turn);
    this.cards.forEach((card, index) => {
      const color = game.match.playerColor(index);
      const isActive = !game.status.over && !game.paused && index === activeIndex;
      card.card.classList.toggle('active', isActive);
      card.colorBadge.textContent = color === 'w' ? 'White' : 'Black';
      card.colorBadge.dataset.color = color;
      card.clockEl.textContent = formatClock(game.clock.get(color));
      card.clockEl.classList.toggle('ticking', isActive && !game.clock.unlimited);
      card.scoreEl.textContent = formatScore(game.match.player(index).score);
      if (document.activeElement !== card.nameInput) {
        card.nameInput.value = game.match.player(index).name;
      }
    });
  }

  _renderStatus() {
    const { game } = this;
    const status = game.status;
    this.statusEl.classList.toggle('game-over', status.over);

    if (status.over) {
      let name = '';
      if (status.result === 'white' || status.result === 'black') {
        name = this._displayName(game.match.colorIndex(status.result === 'white' ? 'w' : 'b'));
      }
      this.statusEl.textContent = `Game ${game.match.gameNumber}  ·  ${RESULT_TEXT[status.reason](name)}`;
      return;
    }

    const moverName = this._displayName(game.match.colorIndex(game.state.turn));
    const colorWord = game.state.turn === 'w' ? 'White' : 'Black';
    let text = `${moverName} to move (${colorWord})`;
    if (status.inCheck) text += '  ·  Check!';
    if (game.paused) text = `Paused  ·  ${text}`;
    this.statusEl.textContent = text;
  }

  _renderHistory() {
    const history = this.game.history;
    this.historyEl.innerHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const li = el('li', 'move-row');
      li.append(el('span', 'move-num', `${i / 2 + 1}.`));
      const white = el('span', 'move-san', history[i].san);
      if (i === history.length - 1) white.classList.add('latest');
      li.appendChild(white);
      if (history[i + 1]) {
        const black = el('span', 'move-san', history[i + 1].san);
        if (i + 1 === history.length - 1) black.classList.add('latest');
        li.appendChild(black);
      }
      this.historyEl.appendChild(li);
    }
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  _renderControls() {
    const { game } = this;
    if (game.mode === 'ava') {
      this.pauseBtn.textContent = game.paused ? 'Start' : 'Pause';
      this.pauseBtn.disabled = game.status.over;
    } else {
      this.undoBtn.disabled = game.snapshots.length === 0;
      this.resignBtn.disabled = game.status.over;
    }
  }
}

function formatScore(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
