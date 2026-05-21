// Board rendering and input. Orientation is a render-time coordinate mapping,
// not a CSS rotation, so piece images always stay upright.

import { legalMovesFrom, isInCheck, WHITE } from './engine.js';

const PIECE_SET_PATHS = {
  standard: 'images/standard_pieces',
  neo: 'images/chesscom_pieces_neo'
};
const PIECE_FILE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const FILES = 'abcdefgh';

function sameSq(a, b) {
  return !!a && !!b && a[0] === b[0] && a[1] === b[1];
}

export class BoardView {
  constructor(container) {
    this.container = container;
    this.pieceSet = 'standard';
    this.orientation = 'white';
    this.state = null;
    this.lastMove = null;
    this.interactive = false;
    this.onMove = null;
    this.selected = null;
    this.legalMoves = [];
    this.cells = [];
    this._build();
  }

  _build() {
    this.container.classList.add('board');
    this.container.innerHTML = '';
    this.cells = [];
    for (let i = 0; i < 64; i++) {
      const cell = document.createElement('div');
      cell.className = 'square';
      cell.addEventListener('click', () => this._onCellClick(cell));
      this.container.appendChild(cell);
      this.cells.push(cell);
    }
    this.promoLayer = document.createElement('div');
    this.promoLayer.className = 'promotion-dialog hidden';
    this.container.appendChild(this.promoLayer);
  }

  _modelToScreen(r, c) {
    return this.orientation === 'white' ? [7 - r, c] : [r, 7 - c];
  }

  _screenToModel(sr, sc) {
    return this.orientation === 'white' ? [7 - sr, sc] : [sr, 7 - sc];
  }

  setPieceSet(name) {
    this.pieceSet = name;
  }

  setOrientation(o) {
    this.orientation = o;
  }

  setInteractive(v) {
    this.interactive = v;
    if (!v) this._clearSelection();
  }

  setLastMove(m) {
    this.lastMove = m;
  }

  setState(state) {
    this.state = state;
    this._clearSelection();
  }

  _clearSelection() {
    this.selected = null;
    this.legalMoves = [];
    this._hidePromotion();
  }

  render() {
    if (!this.state) return;
    const checkSquare = this._checkSquare();
    for (let sr = 0; sr < 8; sr++) {
      for (let sc = 0; sc < 8; sc++) {
        const cell = this.cells[sr * 8 + sc];
        const [r, c] = this._screenToModel(sr, sc);
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.dataset.rankLabel = sc === 0 ? String(r + 1) : '';
        cell.dataset.fileLabel = sr === 7 ? FILES[c] : '';
        let cls = 'square ' + ((r + c) % 2 === 0 ? 'dark' : 'light');
        if (this.lastMove && (sameSq(this.lastMove.from, [r, c]) || sameSq(this.lastMove.to, [r, c]))) {
          cls += ' last-move';
        }
        if (sameSq(this.selected, [r, c])) cls += ' selected';
        if (this.legalMoves.some(m => sameSq(m.to, [r, c]))) {
          cls += this.state.board[r][c] ? ' legal-target capture' : ' legal-target';
        }
        if (sameSq(checkSquare, [r, c])) cls += ' in-check';
        cell.className = cls;

        cell.innerHTML = '';
        const p = this.state.board[r][c];
        if (p) {
          const img = document.createElement('img');
          img.className = 'piece';
          img.src = this._pieceSrc(p.color, p.type);
          img.alt = '';
          img.draggable = false;
          cell.appendChild(img);
        }
      }
    }
  }

  _pieceSrc(color, type) {
    const colorName = color === WHITE ? 'white' : 'black';
    return `${PIECE_SET_PATHS[this.pieceSet]}/${colorName}_${PIECE_FILE[type]}.png`;
  }

  _checkSquare() {
    if (!this.state || !isInCheck(this.state, this.state.turn)) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.state.board[r][c];
        if (p && p.type === 'k' && p.color === this.state.turn) return [r, c];
      }
    }
    return null;
  }

  _onCellClick(cell) {
    if (!this.interactive || !this.state) return;
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);

    const targetMoves = this.legalMoves.filter(m => sameSq(m.to, [r, c]));
    if (targetMoves.length > 0) {
      if (targetMoves.length > 1 && targetMoves[0].promotion) {
        this._showPromotion(targetMoves);
      } else {
        const move = targetMoves[0];
        this._clearSelection();
        if (this.onMove) this.onMove(move);
      }
      return;
    }

    const p = this.state.board[r][c];
    if (p && p.color === this.state.turn) {
      if (sameSq(this.selected, [r, c])) {
        this._clearSelection();
      } else {
        this.selected = [r, c];
        this.legalMoves = legalMovesFrom(this.state, r, c);
        this._hidePromotion();
      }
      this.render();
      return;
    }

    this._clearSelection();
    this.render();
  }

  _showPromotion(moves) {
    const color = moves[0].color;
    this.promoLayer.innerHTML = '';
    this.promoLayer.classList.remove('hidden');
    for (const promo of ['q', 'r', 'b', 'n']) {
      const move = moves.find(m => m.promotion === promo);
      const btn = document.createElement('button');
      btn.className = 'promo-choice';
      btn.type = 'button';
      const img = document.createElement('img');
      img.src = this._pieceSrc(color, promo);
      img.alt = promo;
      img.draggable = false;
      btn.appendChild(img);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._clearSelection();
        this.render();
        if (this.onMove) this.onMove(move);
      });
      this.promoLayer.appendChild(btn);
    }
  }

  _hidePromotion() {
    if (this.promoLayer) this.promoLayer.classList.add('hidden');
  }
}
