# CLAUDE.md

Persistent instructions for working on this project across Claude Code sessions.

## What this project is

A browser-based chess website with three local game modes: Human vs Human,
Human vs AI, and AI vs AI (spectator). Pure client-side application.

## Hard constraints

- **Vanilla JS only** — no framework (no React/Vue/etc.).
- **No build step** — the site is served as static files exactly as they are in the repo.
- **No runtime npm dependencies** — nothing to install for the site to run. The
  `package.json` exists only to mark the project as ES modules (`"type": "module"`)
  so Node can run the engine tests, and to provide the `npm test` script. It
  declares no dependencies, so `npm install` does nothing. The browser ignores it.
  Do not add runtime dependencies.
- **ES modules** — all `js/*.js` files are ES modules loaded via `<script type="module">`.
- **`js/engine.js` must stay pure** — no DOM access, no browser globals. This keeps the
  chess rules engine unit-testable under Node.

## Running the site

ES modules require HTTP (they do not load over `file://`). Serve the directory:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

`npx serve` also works.

## Testing the engine

Engine tests use Node's built-in test runner — no dependencies:

```
node --test      # or: npm test
```

`tests/engine.test.js` imports `js/engine.js` directly and runs perft and rule
checks. This works because `package.json` sets `"type": "module"`, so Node treats
both files as ES modules.

## Directory layout

```
package.json           Marks the project as ES modules; defines `npm test`. No deps.
index.html            Single page: home screen + game view
css/styles.css         All styling (light + dark palettes, board themes)
js/main.js             Entry point: home screen, mode/option wiring
js/engine.js           Pure chess rules engine (no DOM)
js/board.js            Board rendering, input, orientation, highlights
js/game.js             Game controller: turn loop, modes, history, undo
js/match.js            Players (names, scores), color alternation across games
js/ai.js               Minimax AI
js/clock.js            Per-player countdown timers
js/ui.js               Score cards, name inputs, move history, status, controls
js/settings.js         Piece set / board theme / light-dark — persisted to localStorage
images/                Piece PNGs: standard_pieces/ and chesscom_pieces_neo/
tests/engine.test.js   Engine unit + perft tests (node --test)
docs/                  PLAN.md (specs), SPEC.md (implementation), DECISIONS.md (log)
```

## Documentation discipline

- `docs/PLAN.md` — project specifications (what to build).
- `docs/SPEC.md` — implementation plan (how it is built).
- `docs/DECISIONS.md` — decision log; **append a new entry whenever a notable
  technical decision is made or changed.**
- `README.md` — user-facing setup and usage docs.

Keep these current as the project evolves.

## Code conventions

- ES2020+ syntax, ES modules with explicit `.js` extensions in import paths.
- Keep modules focused on the single responsibility listed in the layout above.
- The engine works in model coordinates (`board[rank][file]`, rank 0 = white's home
  rank); only `board.js` maps model coordinates to screen squares.
