# Project Specifications

This document defines *what* the chess website is. For *how* it is built, see
[SPEC.md](./SPEC.md); for the reasoning behind key choices, see
[DECISIONS.md](./DECISIONS.md).

## Vision

A polished, self-contained chess website that runs entirely in the browser. It
supports casual local play between two people, practice against a computer
opponent, and watching two computer opponents play. It requires no account, no
server, and no installation.

## Functional requirements

### Game modes

1. **Human vs Human** — two players share one device. After every move the board
   rotates 180° so the side to move sees its own pieces at the near edge.
2. **Human vs AI** — one human plays the built-in AI. The human picks their color
   and the AI difficulty. The board is oriented to the human's color.
3. **AI vs AI** — two AIs play while the user spectates. The board is fixed with
   white at the bottom. The user can start/pause the game and adjust the delay
   between moves.

All three modes are selectable from the home screen.

### Chess rules

Full standard rules, including:

- Legal move generation for all pieces.
- Castling (kingside and queenside), en passant, and pawn promotion.
- Check and checkmate detection.
- Draws: stalemate, threefold repetition, the fifty-move rule, and insufficient
  material.

### AI opponent

A built-in AI used by Human vs AI and AI vs AI modes, with three difficulty levels
(Easy, Medium, Hard). The AI must always play legal moves.

### Players and scoring

- Each player (human or AI) has a name, editable via a text box, that updates
  everywhere it is shown the moment it changes.
- A match spans multiple games. After each game, results are scored: win = 1.0,
  draw = 0.5, loss = 0.0, accumulated per player.
- Players automatically alternate colors between games.
- The player whose turn it is is clearly indicated: their score card is highlighted
  green and a written turn-status message is shown.

### Gameplay UI

- A move-history panel listing moves in standard algebraic notation.
- Undo / takeback of moves.
- Per-player game clocks with selectable time controls: Unlimited, 1+0, 5+0, 10+0.
- When a piece is selected, its legal destination squares are highlighted with a
  transparent blue overlay.
- The origin and destination of the most recent move (by either player) are
  highlighted with a transparent yellow overlay.
- A result banner shown when a game ends.

### Theming

- Two selectable piece sets: standard and neo.
- Two selectable board color themes: standard (tan / brown) and neo (cream / green).
- Light/dark mode that defaults to the operating system preference and can be
  manually toggled.
- Theme preferences persist between visits.

## Non-functional requirements

- **Client-side only** — no backend, no network calls.
- **No build step** — served as static files.
- **No runtime dependencies** — nothing to install to run the site.
- **Responsive** — usable on a range of screen sizes.
- **Polished** — the site looks attractive in both light and dark mode.
- Runs in any modern browser with ES module support.

## Out of scope (v1)

- Online / networked multiplayer.
- User accounts and authentication.
- A server or persistent backend storage.
- Tactics puzzles and training tools.
- Engine-grade AI (e.g. Stockfish).

## Possible future enhancements

- Saving and loading games (PGN / FEN).
- Opening names and basic analysis.
- A stronger AI or optional Stockfish integration.
- Online multiplayer.
- Tactics puzzles.
