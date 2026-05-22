// A match groups multiple games between the same two players. It owns the
// player records (name, score, human/AI type) and which player currently
// holds white. Colors alternate after every game.

export class Match {
  // players: [{ name, type: 'human'|'ai', difficulty? }, { ... }]
  // whiteIndex: which player (0 or 1) plays white in the first game.
  constructor(players, whiteIndex = 0) {
    this.players = players.map(p => ({
      name: p.name,
      type: p.type,
      difficulty: p.difficulty ?? null,
      score: 0
    }));
    this.whiteIndex = whiteIndex;
    this.gameNumber = 1;
  }

  // Player index (0 or 1) holding the given color this game.
  colorIndex(color) {
    return color === 'w' ? this.whiteIndex : 1 - this.whiteIndex;
  }

  // Color ('w' | 'b') held by the given player index this game.
  playerColor(index) {
    return index === this.whiteIndex ? 'w' : 'b';
  }

  player(index) {
    return this.players[index];
  }

  setName(index, name) {
    this.players[index].name = name;
  }

  // result: 'white' | 'black' | 'draw' — scores win=1, draw=0.5, loss=0.
  recordResult(result) {
    if (result === 'draw') {
      this.players[0].score += 0.5;
      this.players[1].score += 0.5;
    } else {
      this.players[this.colorIndex(result === 'white' ? 'w' : 'b')].score += 1;
    }
  }

  // Advance to the next game: swap colors and bump the game counter.
  nextGame() {
    this.whiteIndex = 1 - this.whiteIndex;
    this.gameNumber += 1;
  }
}
