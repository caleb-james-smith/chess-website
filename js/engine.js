// Pure chess rules engine. No DOM, no browser globals — safe to import under Node.
//
// Board model: board[rank][file], rank 0 = white's home rank, file 0 = a-file.
// Empty squares are null. A piece is { type, color }, type in p n b r q k.

export const WHITE = 'w';
export const BLACK = 'b';

export const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const KNIGHT_DELTAS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_DELTAS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

const FILES = 'abcdefgh';

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function opposite(color) {
  return color === WHITE ? BLACK : WHITE;
}

export function createInitialState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: WHITE };
    board[1][c] = { type: 'p', color: WHITE };
    board[6][c] = { type: 'p', color: BLACK };
    board[7][c] = { type: back[c], color: BLACK };
  }
  return {
    board,
    turn: WHITE,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1
  };
}

export function cloneState(s) {
  return {
    board: s.board.map(row => row.map(p => (p ? { type: p.type, color: p.color } : null))),
    turn: s.turn,
    castling: { ...s.castling },
    enPassant: s.enPassant ? [s.enPassant[0], s.enPassant[1]] : null,
    halfmoveClock: s.halfmoveClock,
    fullmoveNumber: s.fullmoveNumber
  };
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return [r, c];
    }
  }
  return null;
}

export function isSquareAttacked(board, r, c, byColor) {
  const dir = byColor === WHITE ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = r - dir;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const pr = r + dr;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }
  for (const [dr, dc] of KING_DELTAS) {
    const pr = r + dr;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }
  for (const [dr, dc] of BISHOP_DIRS) {
    let pr = r + dr;
    let pc = c + dc;
    while (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      pr += dr;
      pc += dc;
    }
  }
  for (const [dr, dc] of ROOK_DIRS) {
    let pr = r + dr;
    let pc = c + dc;
    while (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      pr += dr;
      pc += dc;
    }
  }
  return false;
}

export function isInCheck(state, color) {
  const k = findKing(state.board, color);
  if (!k) return false;
  return isSquareAttacked(state.board, k[0], k[1], opposite(color));
}

function mkMove(from, to, piece, color, opts = {}) {
  return {
    from,
    to,
    piece,
    color,
    captured: opts.captured ?? null,
    promotion: opts.promotion ?? null,
    castle: opts.castle ?? null,
    enPassant: opts.enPassant ?? false,
    doublePawn: opts.doublePawn ?? false
  };
}

function genStep(state, r, c, deltas, moves) {
  const board = state.board;
  const p = board[r][c];
  for (const [dr, dc] of deltas) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const t = board[nr][nc];
    if (t && t.color === p.color) continue;
    moves.push(mkMove([r, c], [nr, nc], p.type, p.color, { captured: t ? t.type : null }));
  }
}

function genSlide(state, r, c, dirs, moves) {
  const board = state.board;
  const p = board[r][c];
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const t = board[nr][nc];
      if (t) {
        if (t.color !== p.color) {
          moves.push(mkMove([r, c], [nr, nc], p.type, p.color, { captured: t.type }));
        }
        break;
      }
      moves.push(mkMove([r, c], [nr, nc], p.type, p.color));
      nr += dr;
      nc += dc;
    }
  }
}

function addPawnMove(moves, from, to, color, captured, promoRank) {
  if (to[0] === promoRank) {
    for (const promo of ['q', 'r', 'b', 'n']) {
      moves.push(mkMove(from, to, 'p', color, { captured, promotion: promo }));
    }
  } else {
    moves.push(mkMove(from, to, 'p', color, { captured }));
  }
}

function genPawn(state, r, c, moves) {
  const board = state.board;
  const p = board[r][c];
  const dir = p.color === WHITE ? 1 : -1;
  const startRank = p.color === WHITE ? 1 : 6;
  const promoRank = p.color === WHITE ? 7 : 0;
  const oneR = r + dir;
  if (inBounds(oneR, c) && !board[oneR][c]) {
    addPawnMove(moves, [r, c], [oneR, c], p.color, null, promoRank);
    if (r === startRank) {
      const twoR = r + 2 * dir;
      if (!board[twoR][c]) {
        moves.push(mkMove([r, c], [twoR, c], 'p', p.color, { doublePawn: true }));
      }
    }
  }
  for (const dc of [-1, 1]) {
    const nr = oneR;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const t = board[nr][nc];
    if (t && t.color !== p.color) {
      addPawnMove(moves, [r, c], [nr, nc], p.color, t.type, promoRank);
    } else if (!t && state.enPassant && state.enPassant[0] === nr && state.enPassant[1] === nc) {
      moves.push(mkMove([r, c], [nr, nc], 'p', p.color, { captured: 'p', enPassant: true }));
    }
  }
}

function genCastling(state, r, c, moves) {
  const color = state.board[r][c].color;
  const enemy = opposite(color);
  const rank = color === WHITE ? 0 : 7;
  if (r !== rank || c !== 4) return;
  if (isSquareAttacked(state.board, rank, 4, enemy)) return;
  const rights = state.castling;
  const board = state.board;
  const kRight = color === WHITE ? rights.wK : rights.bK;
  if (kRight && !board[rank][5] && !board[rank][6]
      && board[rank][7] && board[rank][7].type === 'r' && board[rank][7].color === color
      && !isSquareAttacked(board, rank, 5, enemy)
      && !isSquareAttacked(board, rank, 6, enemy)) {
    moves.push(mkMove([rank, 4], [rank, 6], 'k', color, { castle: 'k' }));
  }
  const qRight = color === WHITE ? rights.wQ : rights.bQ;
  if (qRight && !board[rank][1] && !board[rank][2] && !board[rank][3]
      && board[rank][0] && board[rank][0].type === 'r' && board[rank][0].color === color
      && !isSquareAttacked(board, rank, 3, enemy)
      && !isSquareAttacked(board, rank, 2, enemy)) {
    moves.push(mkMove([rank, 4], [rank, 2], 'k', color, { castle: 'q' }));
  }
}

export function generatePseudoLegalMoves(state) {
  const moves = [];
  const board = state.board;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== state.turn) continue;
      switch (p.type) {
        case 'p': genPawn(state, r, c, moves); break;
        case 'n': genStep(state, r, c, KNIGHT_DELTAS, moves); break;
        case 'k': genStep(state, r, c, KING_DELTAS, moves); genCastling(state, r, c, moves); break;
        case 'b': genSlide(state, r, c, BISHOP_DIRS, moves); break;
        case 'r': genSlide(state, r, c, ROOK_DIRS, moves); break;
        case 'q': genSlide(state, r, c, QUEEN_DIRS, moves); break;
      }
    }
  }
  return moves;
}

function updateRookRight(castling, r, c) {
  if (r === 0 && c === 0) castling.wQ = false;
  else if (r === 0 && c === 7) castling.wK = false;
  else if (r === 7 && c === 0) castling.bQ = false;
  else if (r === 7 && c === 7) castling.bK = false;
}

export function applyMove(state, move) {
  const s = cloneState(state);
  const b = s.board;
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = b[fr][fc];

  if (move.enPassant) b[fr][tc] = null;

  b[tr][tc] = move.promotion ? { type: move.promotion, color: piece.color } : piece;
  b[fr][fc] = null;

  if (move.castle === 'k') {
    b[tr][5] = b[tr][7];
    b[tr][7] = null;
  } else if (move.castle === 'q') {
    b[tr][3] = b[tr][0];
    b[tr][0] = null;
  }

  if (piece.type === 'k') {
    if (piece.color === WHITE) { s.castling.wK = false; s.castling.wQ = false; }
    else { s.castling.bK = false; s.castling.bQ = false; }
  }
  updateRookRight(s.castling, fr, fc);
  updateRookRight(s.castling, tr, tc);

  s.enPassant = move.doublePawn ? [(fr + tr) / 2, fc] : null;
  s.halfmoveClock = (piece.type === 'p' || move.captured) ? 0 : state.halfmoveClock + 1;
  if (state.turn === BLACK) s.fullmoveNumber = state.fullmoveNumber + 1;
  s.turn = opposite(state.turn);
  return s;
}

export function generateLegalMoves(state) {
  const color = state.turn;
  const legal = [];
  for (const m of generatePseudoLegalMoves(state)) {
    if (!isInCheck(applyMove(state, m), color)) legal.push(m);
  }
  return legal;
}

export function legalMovesFrom(state, r, c) {
  return generateLegalMoves(state).filter(m => m.from[0] === r && m.from[1] === c);
}

export function findLegalMove(state, from, to, promotion = null) {
  return generateLegalMoves(state).find(m =>
    m.from[0] === from[0] && m.from[1] === from[1]
    && m.to[0] === to[0] && m.to[1] === to[1]
    && (promotion ? m.promotion === promotion : true)
  ) || null;
}

function isInsufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== 'k') pieces.push({ type: p.type, squareColor: (r + c) % 2 });
    }
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1) return pieces[0].type === 'n' || pieces[0].type === 'b';
  if (pieces.every(p => p.type === 'b')) {
    return new Set(pieces.map(p => p.squareColor)).size === 1;
  }
  return false;
}

export function positionKey(state) {
  let s = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      s += p ? (p.color === WHITE ? p.type.toUpperCase() : p.type) : '.';
    }
  }
  s += '|' + state.turn;
  s += '|' + (state.castling.wK ? 'K' : '') + (state.castling.wQ ? 'Q' : '')
    + (state.castling.bK ? 'k' : '') + (state.castling.bQ ? 'q' : '');
  s += '|' + (state.enPassant ? `${state.enPassant[0]}${state.enPassant[1]}` : '-');
  return s;
}

// `opts.repetition` lets the caller (which owns position history) flag a
// threefold repetition draw, since a single state cannot detect it alone.
export function getStatus(state, opts = {}) {
  const inCheck = isInCheck(state, state.turn);
  const legal = generateLegalMoves(state);
  if (legal.length === 0) {
    if (inCheck) {
      return {
        over: true,
        result: opposite(state.turn) === WHITE ? 'white' : 'black',
        reason: 'checkmate',
        inCheck: true
      };
    }
    return { over: true, result: 'draw', reason: 'stalemate', inCheck: false };
  }
  if (state.halfmoveClock >= 100) {
    return { over: true, result: 'draw', reason: 'fiftymove', inCheck };
  }
  if (isInsufficientMaterial(state.board)) {
    return { over: true, result: 'draw', reason: 'insufficient', inCheck };
  }
  if (opts.repetition) {
    return { over: true, result: 'draw', reason: 'threefold', inCheck };
  }
  return { over: false, result: null, reason: null, inCheck };
}

function disambiguation(state, move) {
  const others = generateLegalMoves(state).filter(m =>
    m.piece === move.piece
    && m.to[0] === move.to[0] && m.to[1] === move.to[1]
    && !(m.from[0] === move.from[0] && m.from[1] === move.from[1])
  );
  if (others.length === 0) return '';
  const sameFile = others.some(m => m.from[1] === move.from[1]);
  const sameRank = others.some(m => m.from[0] === move.from[0]);
  if (!sameFile) return FILES[move.from[1]];
  if (!sameRank) return String(move.from[0] + 1);
  return FILES[move.from[1]] + (move.from[0] + 1);
}

export function moveToSan(state, move) {
  let san;
  if (move.castle === 'k') {
    san = 'O-O';
  } else if (move.castle === 'q') {
    san = 'O-O-O';
  } else {
    const dest = FILES[move.to[1]] + (move.to[0] + 1);
    if (move.piece === 'p') {
      san = move.captured ? `${FILES[move.from[1]]}x${dest}` : dest;
      if (move.promotion) san += '=' + move.promotion.toUpperCase();
    } else {
      san = move.piece.toUpperCase() + disambiguation(state, move) + (move.captured ? 'x' : '') + dest;
    }
  }
  const next = applyMove(state, move);
  if (isInCheck(next, next.turn)) {
    san += generateLegalMoves(next).length === 0 ? '#' : '+';
  }
  return san;
}

export function squareName(r, c) {
  return FILES[c] + (r + 1);
}

export function fromFEN(fen) {
  const [placement, turn, castling, ep, half, full] = fen.trim().split(/\s+/);
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const ranks = placement.split('/');
  for (let i = 0; i < 8; i++) {
    const row = 7 - i;
    let col = 0;
    for (const ch of ranks[i]) {
      if (/\d/.test(ch)) {
        col += parseInt(ch, 10);
      } else {
        const color = ch === ch.toUpperCase() ? WHITE : BLACK;
        board[row][col] = { type: ch.toLowerCase(), color };
        col++;
      }
    }
  }
  let enPassant = null;
  if (ep && ep !== '-') {
    enPassant = [parseInt(ep[1], 10) - 1, FILES.indexOf(ep[0])];
  }
  return {
    board,
    turn: turn === 'w' ? WHITE : BLACK,
    castling: {
      wK: (castling || '').includes('K'),
      wQ: (castling || '').includes('Q'),
      bK: (castling || '').includes('k'),
      bQ: (castling || '').includes('q')
    },
    enPassant,
    halfmoveClock: half !== undefined ? parseInt(half, 10) : 0,
    fullmoveNumber: full !== undefined ? parseInt(full, 10) : 1
  };
}

export function toFEN(state) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      row += p.color === WHITE ? p.type.toUpperCase() : p.type;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  let castling = '';
  if (state.castling.wK) castling += 'K';
  if (state.castling.wQ) castling += 'Q';
  if (state.castling.bK) castling += 'k';
  if (state.castling.bQ) castling += 'q';
  const ep = state.enPassant ? squareName(state.enPassant[0], state.enPassant[1]) : '-';
  return `${rows.join('/')} ${state.turn} ${castling || '-'} ${ep} ${state.halfmoveClock} ${state.fullmoveNumber}`;
}

export function perft(state, depth) {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(state);
  if (depth === 1) return moves.length;
  let nodes = 0;
  for (const m of moves) {
    nodes += perft(applyMove(state, m), depth - 1);
  }
  return nodes;
}
