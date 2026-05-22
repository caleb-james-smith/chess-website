import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  fromFEN,
  generateLegalMoves,
  legalMovesFrom,
  applyMove,
  findLegalMove,
  moveToSan,
  getStatus,
  perft
} from '../js/engine.js';

test('initial position has 20 legal moves', () => {
  assert.equal(generateLegalMoves(createInitialState()).length, 20);
});

test('perft - start position', () => {
  const s = createInitialState();
  assert.equal(perft(s, 1), 20);
  assert.equal(perft(s, 2), 400);
  assert.equal(perft(s, 3), 8902);
});

test('perft - Kiwipete (castling, checks)', () => {
  const s = fromFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.equal(perft(s, 1), 48);
  assert.equal(perft(s, 2), 2039);
});

test('perft - position 3 (en passant heavy)', () => {
  const s = fromFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  assert.equal(perft(s, 1), 14);
  assert.equal(perft(s, 2), 191);
  assert.equal(perft(s, 3), 2812);
});

test('perft - position 5 (promotion)', () => {
  const s = fromFEN('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8');
  assert.equal(perft(s, 1), 44);
  assert.equal(perft(s, 2), 1486);
});

test('checkmate is detected (fool\'s mate)', () => {
  const s = fromFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  const status = getStatus(s);
  assert.equal(status.over, true);
  assert.equal(status.reason, 'checkmate');
  assert.equal(status.result, 'black');
});

test('stalemate is detected', () => {
  const s = fromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  const status = getStatus(s);
  assert.equal(status.over, true);
  assert.equal(status.reason, 'stalemate');
  assert.equal(status.result, 'draw');
});

test('insufficient material is a draw', () => {
  const status = getStatus(fromFEN('8/8/8/4k3/8/4K3/8/8 w - - 0 1'));
  assert.equal(status.over, true);
  assert.equal(status.reason, 'insufficient');
});

test('castling moves and SAN', () => {
  const s = fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const kingMoves = legalMovesFrom(s, 0, 4);
  const kingside = kingMoves.find(m => m.castle === 'k');
  const queenside = kingMoves.find(m => m.castle === 'q');
  assert.ok(kingside, 'kingside castling available');
  assert.ok(queenside, 'queenside castling available');
  assert.equal(moveToSan(s, kingside), 'O-O');
  assert.equal(moveToSan(s, queenside), 'O-O-O');
});

test('en passant capture is generated and applied', () => {
  const s = fromFEN('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
  const ep = legalMovesFrom(s, 4, 4).find(m => m.enPassant);
  assert.ok(ep, 'en passant move generated');
  assert.deepEqual(ep.to, [5, 5]);
  const after = applyMove(s, ep);
  assert.equal(after.board[5][5].type, 'p', 'pawn moved to f6');
  assert.equal(after.board[4][5], null, 'captured pawn removed');
  assert.equal(after.board[4][4], null, 'origin square emptied');
});

test('pawn promotion generates four moves with SAN', () => {
  const s = fromFEN('8/P7/8/8/8/2k5/8/7K w - - 0 1');
  const promos = legalMovesFrom(s, 6, 0);
  assert.equal(promos.length, 4);
  assert.deepEqual(promos.map(m => m.promotion).sort(), ['b', 'n', 'q', 'r']);
  const queenPromo = promos.find(m => m.promotion === 'q');
  assert.equal(moveToSan(s, queenPromo), 'a8=Q');
});

test('SAN for simple pawn and knight moves', () => {
  const s = createInitialState();
  const e4 = findLegalMove(s, [1, 4], [3, 4]);
  assert.equal(moveToSan(s, e4), 'e4');
  const nc3 = findLegalMove(s, [0, 1], [2, 2]);
  assert.equal(moveToSan(s, nc3), 'Nc3');
});

test('applyMove does not mutate the input state', () => {
  const s = createInitialState();
  const before = JSON.stringify(s);
  applyMove(s, findLegalMove(s, [1, 4], [3, 4]));
  assert.equal(JSON.stringify(s), before);
});
