# Implementation Plan

This document describes *how* the chess website is built. For *what* it must do, see
[PLAN.md](./PLAN.md); for the reasoning behind key choices, see
[DECISIONS.md](./DECISIONS.md).

## Stack

Plain HTML, CSS, and JavaScript (ES modules). No framework, no build step, no
runtime dependencies. The site is a single page that toggles between a home screen
and a game view.

## Module architecture

| Module | Responsibility |
|--------|----------------|
| `js/engine.js` | Pure chess rules engine. No DOM. Unit-testable under Node. |
| `js/board.js` | Renders the board, handles input, orientation, square highlights. |
| `js/game.js` | Game controller: turn loop, the three modes, history, undo. |
| `js/match.js` | Players (names, scores), color alternation across games. |
| `js/ai.js` | Minimax AI. |
| `js/clock.js` | Per-player countdown timers. |
| `js/ui.js` | Score cards, name inputs, move history, status text, controls. |
| `js/settings.js` | Piece set / board theme / light-dark, persisted to `localStorage`. |
| `js/main.js` | Entry point: home screen, mode/option wiring, screen switching. |

Dependency direction: `main` → (`game`, `match`, `ui`, `settings`); `game` →
(`engine`, `board`, `ai`, `clock`); `ui` → `match`. `engine.js` depends on nothing.

## Data model (`engine.js`)

- **Board**: 8×8 array, `board[rank][file]`, `rank 0` = white's home rank, `file 0`
  = the a-file. Empty squares are `null`.
- **Piece**: `{ type, color }` where `type` ∈ `p n b r q k` and `color` ∈ `w b`.
- **State**:
  ```
  {
    board,           // 8x8 array
    turn,            // 'w' | 'b'
    castling,        // { wK, wQ, bK, bQ } booleans
    enPassant,       // [rank, file] target square or null
    halfmoveClock,   // for the fifty-move rule
    fullmoveNumber
  }
  ```
- **Move**: `{ from: [r,c], to: [r,c], piece, captured, promotion, flags }`, where
  `flags` distinguish normal / capture / castle / en passant / promotion / double
  pawn push.

## Engine algorithms

- **Pseudo-legal generation** per piece type; sliding pieces (bishop, rook, queen)
  walk rays until blocked.
- **Legality filter**: apply each pseudo-legal move to a copy, reject it if the
  mover's king is then attacked. `isSquareAttacked` powers check detection.
- **Special moves**: castling checks the castling-rights flags, empty squares
  between king and rook, and that the king does not start in, pass through, or land
  on an attacked square. En passant uses the `enPassant` target square. Promotion
  expands one pawn move into four (Q/R/B/N).
- **Termination**: no legal moves → checkmate if in check, else stalemate. Draws
  also from threefold repetition (position-key history), the fifty-move rule
  (`halfmoveClock`), and insufficient material.
- **SAN**: generate standard algebraic notation for each move, with disambiguation,
  capture (`x`), check (`+`), checkmate (`#`), and castling (`O-O`, `O-O-O`).
- FEN import/export is optional and used mainly to set up test positions.

The engine exposes a small API, e.g. `createGame()`, `legalMoves(state)`,
`legalMovesFrom(state, square)`, `applyMove(state, move)`, `moveToSan(state, move)`,
`status(state)`.

## Rendering (`board.js`)

- The board is an 8×8 grid of square elements; pieces are `<img>` elements using the
  active piece set's PNGs.
- **Orientation** is a render-time mapping, not a CSS rotation, so piece images are
  never upside down. When flipped, model square `(r, c)` is drawn at screen position
  `(7 - r, 7 - c)`.
- **Input**: click a piece to select it (its legal destinations get a transparent
  blue overlay), then click a destination to move. Clicking elsewhere deselects.
- **Last-move overlay**: the previous move's origin and destination squares get a
  transparent yellow overlay until the next move replaces it.
- **Promotion**: a small picker dialog lets the user choose the promotion piece.

## Game controller (`game.js`)

- Drives the turn loop. In Human vs AI and AI vs AI it requests moves from `ai.js`
  on the side(s) it controls; AI calls are scheduled asynchronously so the UI stays
  responsive.
- Maintains a history stack of full pre-move state snapshots; **undo** restores the
  previous snapshot. In Human vs AI, undo rewinds two plies so it stays the human's
  turn.
- Board orientation per mode: HvH flips to the side to move; HvAI is fixed to the
  human's color; AvA is fixed white-at-bottom.
- Detects game end (checkmate, draw, clock flag, resignation) and reports the result
  to `match.js`.

## AI (`ai.js`)

- Minimax with alpha-beta pruning.
- Evaluation: material values plus piece-square tables for positional bonuses.
- Difficulty = search depth: Easy = 1, Medium = 2, Hard = 3, with light
  randomization among near-equal moves so games vary.
- Search yields to the event loop (via `setTimeout`) so the UI can repaint; a Web
  Worker is a fallback if the deepest search noticeably stalls the page.

## Match and scoring (`match.js`)

- Holds two player records: `{ name, score }`, plus which player currently has white
  and the game count.
- On game end, scores the result (win = 1.0, draw = 0.5, loss = 0.0) onto the
  players, then swaps which player has white for the next game.
- Scores persist across games within a match; they reset only on an explicit reset
  or when returning to the home screen.

## Clocks (`clock.js`)

- Two countdown timers driven by a single interval. Presets: Unlimited (no clock),
  5+0, 10+0. A player reaching zero loses on time (flag).

## UI (`ui.js`)

- Renders two **score cards**, each with an editable name text box, the player's
  score, and current color. Editing a name updates `match.js` and re-renders the
  name everywhere it appears (score cards, turn status, result banner).
- The active player's score card gets a green highlight; a turn-status line is kept
  in sync with it.
- Renders the SAN move-history list, the result banner, and control buttons (undo,
  new game, resign; AI-vs-AI start/pause and a move-delay slider).

## Settings and theming (`settings.js` + `css/styles.css`)

- Three preferences persisted to `localStorage`: piece set (`standard` / `neo`),
  board theme (`standard` / `neo`), and light/dark mode.
- Applied by setting `data-theme` and `data-board-theme` attributes on `<html>`;
  CSS custom properties keyed off those attributes drive all colors.
- Light/dark defaults to `prefers-color-scheme`; a manual toggle overrides it once
  used. `css/styles.css` defines complete light and dark palettes, and both board
  themes are tuned to look good against either.

## Testing

- `tests/engine.test.js` runs with `node --test` (no dependencies).
- Move generation is verified with **perft** (counting leaf nodes to a fixed depth)
  against known reference counts — start position: 20 / 400 / 8902 at depths 1/2/3.
- Additional cases cover castling, en passant, promotion, and
  check / checkmate / stalemate.

## Build order / milestones

1. Documentation files.
2. `engine.js` + `tests/engine.test.js`.
3. `board.js` — rendering, input, highlights.
4. `game.js` — turn loop, modes, history, undo.
5. `ai.js` — minimax, wired into HvAI and AvA.
6. `match.js` — players, scoring, color alternation.
7. `clock.js` + `ui.js` — timers, score cards, history panel, controls.
8. `settings.js` + theming CSS.
9. `index.html` + full `css/styles.css` + `main.js` — home screen, layout.
10. Manual testing across all modes and themes.
