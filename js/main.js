// Entry point: wires the home screen (mode + option selection and the
// settings header) to the game view, building a fresh Match / Game / UI
// each time a game starts.

import { BoardView } from './board.js';
import { Match } from './match.js';
import { Game } from './game.js';
import { GameUI } from './ui.js';
import { Settings } from './settings.js';
import { TIME_CONTROLS } from './clock.js';

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const settings = new Settings();
settings.apply();

const homeScreen = document.getElementById('home-screen');
const gameView = document.getElementById('game-view');

let board = null;
let game = null;
let ui = null;
let selectedMode = null;

// --- settings header ---------------------------------------------------

const setPiecesEl = document.getElementById('set-pieces');
const setBoardEl = document.getElementById('set-board');
const themeToggle = document.getElementById('theme-toggle');

setPiecesEl.value = settings.pieceSet;
setBoardEl.value = settings.boardTheme;

function refreshThemeToggle() {
  themeToggle.textContent = settings.effectiveTheme === 'dark' ? 'Light' : 'Dark';
}
refreshThemeToggle();

setPiecesEl.addEventListener('change', () => settings.setPieceSet(setPiecesEl.value));
setBoardEl.addEventListener('change', () => settings.setBoardTheme(setBoardEl.value));
themeToggle.addEventListener('click', () => settings.toggleLightDark());

settings.onChange = (key) => {
  if (key === 'pieceSet' && board) {
    board.setPieceSet(settings.pieceSet);
    board.render();
  }
  refreshThemeToggle();
};

// --- home screen mode selection ----------------------------------------

const modeGrid = document.getElementById('mode-grid');
const startBtn = document.getElementById('start-btn');
const modeOnlyGroups = document.querySelectorAll('.mode-only');

modeGrid.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    selectedMode = card.dataset.mode;
    modeGrid.querySelectorAll('.mode-card').forEach(c =>
      c.classList.toggle('selected', c === card));
    modeOnlyGroups.forEach(g =>
      g.classList.toggle('hidden', g.dataset.for !== selectedMode));
    startBtn.disabled = false;
    startBtn.textContent = 'Start Game';
  });
});

startBtn.addEventListener('click', () => {
  if (selectedMode) startGame(selectedMode);
});

// --- game lifecycle ----------------------------------------------------

function value(id) {
  return document.getElementById(id).value;
}

function buildSetup(mode) {
  const timeControl = TIME_CONTROLS[value('opt-time')];

  if (mode === 'hvh') {
    return {
      players: [
        { name: 'Player 1', type: 'human' },
        { name: 'Player 2', type: 'human' }
      ],
      whiteIndex: 0,
      timeControl,
      moveDelayMs: 600
    };
  }

  if (mode === 'hvai') {
    const difficulty = value('opt-ai-difficulty');
    let humanColor = value('opt-human-color');
    if (humanColor === 'random') humanColor = Math.random() < 0.5 ? 'white' : 'black';
    return {
      players: [
        { name: 'You', type: 'human' },
        { name: `Computer (${DIFFICULTY_LABEL[difficulty]})`, type: 'ai', difficulty }
      ],
      whiteIndex: humanColor === 'white' ? 0 : 1,
      timeControl,
      moveDelayMs: 600
    };
  }

  const d1 = value('opt-ai-white');
  const d2 = value('opt-ai-black');
  return {
    players: [
      { name: `Computer 1 (${DIFFICULTY_LABEL[d1]})`, type: 'ai', difficulty: d1 },
      { name: `Computer 2 (${DIFFICULTY_LABEL[d2]})`, type: 'ai', difficulty: d2 }
    ],
    whiteIndex: 0,
    timeControl,
    moveDelayMs: Number(value('opt-delay'))
  };
}

function startGame(mode) {
  const setup = buildSetup(mode);
  const match = new Match(setup.players, setup.whiteIndex);

  board = new BoardView(document.getElementById('board'));
  board.setPieceSet(settings.pieceSet);

  game = new Game({
    mode,
    board,
    match,
    timeControl: setup.timeControl,
    moveDelayMs: setup.moveDelayMs
  });
  game.start();
  ui = new GameUI({ game, onExit: backToHome });

  homeScreen.classList.add('hidden');
  gameView.classList.remove('hidden');
}

function backToHome() {
  if (game) game.destroy();
  game = null;
  ui = null;
  board = null;
  gameView.classList.add('hidden');
  homeScreen.classList.remove('hidden');
}
