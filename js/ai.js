// Built-in AI: negamax search with alpha-beta pruning and a
// material + piece-square-table evaluation. Difficulty maps to search depth.

import { generateLegalMoves, applyMove, isInCheck, WHITE } from './engine.js';

const MATE = 1000000;
const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const DEPTH_BY_DIFFICULTY = { easy: 1, medium: 2, hard: 3 };

// Piece-square tables in conventional layout (row 0 = rank 8, row 7 = rank 1).
// A white piece at engine rank r reads row [7 - r]; a black piece reads row [r].
const PST = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
  ]
};

// Static evaluation from white's perspective (positive = white is better).
function evaluate(state) {
  let score = 0;
  const board = state.board;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const value = VALUES[p.type] + PST[p.type][p.color === WHITE ? 7 - r : r][c];
      score += p.color === WHITE ? value : -value;
    }
  }
  return score;
}

function moveOrderScore(m) {
  let s = 0;
  if (m.captured) s += 10 * VALUES[m.captured] - VALUES[m.piece];
  if (m.promotion) s += VALUES[m.promotion];
  return s;
}

function orderedMoves(state) {
  return generateLegalMoves(state).sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
}

// Negamax: returns the score from the perspective of the side to move.
function search(state, depth, alpha, beta, ply) {
  const moves = orderedMoves(state);
  if (moves.length === 0) {
    return isInCheck(state, state.turn) ? -(MATE - ply) : 0;
  }
  if (depth === 0) {
    return state.turn === WHITE ? evaluate(state) : -evaluate(state);
  }
  let best = -Infinity;
  for (const m of moves) {
    const value = -search(applyMove(state, m), depth - 1, -beta, -alpha, ply + 1);
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Picks a move for the side to move. Difficulty is 'easy' | 'medium' | 'hard'.
// Root scores use a full window so near-best moves can be chosen at random,
// giving the AI some variety instead of always playing one fixed line.
export function chooseMove(state, difficulty = 'medium') {
  const depth = DEPTH_BY_DIFFICULTY[difficulty] ?? 2;
  const moves = orderedMoves(state);
  if (moves.length === 0) return null;

  let best = -Infinity;
  const scored = [];
  for (const m of moves) {
    const value = -search(applyMove(state, m), depth - 1, -Infinity, Infinity, 1);
    scored.push({ move: m, value });
    if (value > best) best = value;
  }

  const tolerance = difficulty === 'easy' ? 90 : difficulty === 'medium' ? 30 : 0;
  const pool = scored.filter(s => s.value >= best - tolerance);
  return pool[Math.floor(Math.random() * pool.length)].move;
}
