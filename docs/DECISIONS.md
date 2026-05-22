# Decision Log

A running record of notable technical decisions. Append a new entry whenever a
decision is made or changed; do not rewrite history — supersede instead.

Format: each entry has a date, the decision, the rationale, and any alternatives
considered.

---

## 2026-05-21 — Vanilla JS, no framework, no build step

**Decision:** Build the site with plain HTML, CSS, and JavaScript (ES modules). No
framework, no bundler, no build step.

**Rationale:** The project is small and self-contained. The existing repo layout (an
empty `js/` folder, raw PNG assets, no `package.json`) already points at a static
site. Avoiding a build step keeps the project trivial to run and deploy.

**Alternatives considered:** React + Vite — rejected as unnecessary tooling and
dependency weight for this scope.

---

## 2026-05-21 — Hand-written chess engine

**Decision:** Implement the chess rules engine from scratch in `js/engine.js` rather
than using a library such as `chess.js`.

**Rationale:** Chosen deliberately for full control and as a learning exercise. The
engine is kept pure (no DOM) so it can be unit-tested.

**Alternatives considered:** `chess.js` — rejected; would also reintroduce a
dependency.

**Mitigation:** Correctness is verified with perft tests against known reference
node counts.

---

## 2026-05-21 — Simple built-in AI (minimax)

**Decision:** The AI is a hand-written minimax search with alpha-beta pruning and a
material + piece-square-table evaluation. Difficulty maps to search depth.

**Rationale:** Strong enough for a casual opponent, fully transparent, no large
engine asset to download, and it runs comfortably in-browser.

**Alternatives considered:** Stockfish compiled to WebAssembly — rejected for v1; it
adds a 1–2 MB asset and is far stronger than needed for casual play.

---

## 2026-05-21 — Board orientation by coordinate mapping, not CSS rotation

**Decision:** Board flipping (HvH auto-flip, human-color orientation in HvAI) is
done by mapping model coordinates to screen positions at render time, not by
rotating the board container with CSS.

**Rationale:** A CSS 180° rotation would also flip the piece images upside down. A
render-time coordinate mapping keeps pieces upright in every orientation.

---

## 2026-05-21 — Undo via full state snapshots

**Decision:** Undo/takeback is implemented by pushing a full copy of the game state
before each move and restoring it on undo.

**Rationale:** Simpler and less error-prone than computing inverse moves, especially
with a hand-written engine where castling rights, en passant, and the halfmove clock
must all be restored exactly. State objects are small, so the memory cost is
negligible.

---

## 2026-05-21 — Theming via CSS custom properties + data attributes

**Decision:** Light/dark mode and the two board color themes are driven by CSS
custom properties selected by `data-theme` and `data-board-theme` attributes on the
`<html>` element. Light/dark defaults to `prefers-color-scheme` and can be manually
overridden. Piece set is a separate switchable preference. All three preferences are
stored in `localStorage`.

**Rationale:** Attribute-driven CSS variables make theme switching instant and
keep all color values in one place. `localStorage` persistence requires no backend.

---

## 2026-05-21 — Multi-game match scoring with color alternation

**Decision:** Games are grouped into a match. Results score win = 1.0, draw = 0.5,
loss = 0.0 per player; players automatically swap colors between games.

**Rationale:** Matches a familiar over-the-board convention and makes repeated play
between the same two players meaningful. Alternating colors keeps it fair.

---

## 2026-05-21 — Engine tests with Node's built-in test runner

**Decision:** Engine tests live in `tests/engine.test.js` and run with `node --test`.

**Rationale:** Node's built-in runner needs no dependencies, preserving the
project's "nothing to install" property. The engine's purity (no DOM) lets Node
import it directly.

**Note:** A minimal `package.json` with `"type": "module"` was added so Node treats
the `.js` files as ES modules (the engine and tests use `import`/`export`). It
declares no dependencies — `npm install` does nothing — and the browser ignores it,
so the "no build step / nothing to install" properties hold.

---

## 2026-05-22 — Hosting on GitHub Pages

**Decision:** Deploy the site on GitHub Pages, served directly from the `main`
branch root.

**Rationale:** The project is already a pure static site with no build step, so
GitHub Pages requires zero additional tooling or configuration — just enabling the
Pages feature in the repository settings.

**Alternatives considered:** Netlify, Vercel — both support static sites and would
also work, but require an extra account or project setup beyond the existing GitHub
repository.
