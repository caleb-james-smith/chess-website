# Chess Website

A browser-based chess game with three local play modes, a built-in AI opponent,
move history, game clocks, and light/dark theming. Built with plain HTML, CSS, and
JavaScript — no frameworks and no build step.

## Live demo

**<https://caleb-james-smith.github.io/chess-website/>**

## Features

- **Three game modes**
  - **Human vs Human** — two players on one device. The board rotates 180° after
    each move so the side to move always sees its pieces at the bottom.
  - **Human vs AI** — play against the built-in computer opponent (Easy / Medium / Hard).
  - **AI vs AI** — watch two AIs play, with start/pause and an adjustable move delay.
- **Full chess rules** — castling, en passant, promotion, check, checkmate,
  stalemate, threefold repetition, the fifty-move rule, and insufficient material.
- **Move history** in standard algebraic notation.
- **Undo / takeback.**
- **Game clocks** — Unlimited, 1+0 (bullet), 5+0 (blitz), 10+0 (rapid), or 10+5 (rapid with increment).
- **Players & scoring** — name each player; scores carry across multiple games in a
  match (win = 1, draw = ½, loss = 0); colors alternate every game.
- **Move highlighting** — selected piece's legal destinations in blue; the previous
  move's squares in yellow.
- **Theming** — two piece sets (standard / neo), two board color themes, and
  light/dark mode that follows your system setting or a manual toggle.

## Running locally

The site uses ES modules, which browsers only load over HTTP — not directly from a
file. Clone the repo and start a static server:

```
git clone git@github.com:caleb-james-smith/chess-website.git
cd chess-website
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser. (`npx serve` works too.)

No installation or build step is required.

## Deploying your own fork

Because the site is pure static files with no build step, it deploys directly on
GitHub Pages:

1. **Fork** this repository on GitHub.
2. In your fork, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, select the **main** branch
   and the **/ (root)** folder, then click **Save**.
4. After a minute or two, GitHub will publish the site. The URL appears on the
   Pages settings page:
   ```
   https://<your-username>.github.io/chess-website/
   ```

No CI pipeline or additional configuration needed.

## How to play

1. On the home screen, choose a game mode.
2. Set the mode's options — player color and AI difficulty (Human vs AI), both AI
   difficulties and move delay (AI vs AI), and a time control.
3. Click **Start game**.
4. Move by clicking one of your pieces (its legal moves highlight in blue), then
   clicking a destination square.
5. Use the controls to undo a move, start a new game, or return to the home screen.

Player names, scores, piece set, board theme, and light/dark mode can all be changed
at any time; your theme preferences are remembered between visits.

## Browser support

Any modern browser with ES module support (recent Chrome, Firefox, Safari, Edge).

## Running the tests

The chess rules engine has a test suite that runs with Node's built-in test runner:

```
node --test
```

## Documentation

- `docs/PLAN.md` — project specifications.
- `docs/SPEC.md` — implementation plan.
- `docs/DECISIONS.md` — record of technical decisions.
