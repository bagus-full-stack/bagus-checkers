import {
  generateGameId,
  calculateMaterialAdvantage,
  exportGameToJson,
  importGameFromJson,
  SavedGame,
} from './replay.model';

describe('replay.model', () => {
  it('generates unique, prefixed game ids', () => {
    const a = generateGameId();
    const b = generateGameId();
    expect(a).toMatch(/^game_/);
    expect(a).not.toBe(b);
  });

  it('calculates material advantage weighting kings at 3x pawns', () => {
    const advantage = calculateMaterialAdvantage({
      moveNumber: 1,
      whitePawns: 2,
      whiteKings: 1,
      blackPawns: 4,
      blackKings: 0,
      advantage: 0,
    });
    expect(advantage).toBe(2 * 1 + 1 * 3 - 4 * 1);
  });

  const sampleGame: SavedGame = {
    metadata: {
      id: 'game_1',
      date: '2026-01-01',
      whitePlayer: 'A',
      blackPlayer: 'B',
      winner: 'white',
      variant: 'international',
      totalMoves: 0,
      duration: 10,
    },
    moves: [],
    materialHistory: [],
  };

  it('round-trips a saved game through JSON', () => {
    const json = exportGameToJson(sampleGame);
    expect(importGameFromJson(json)).toEqual(sampleGame);
  });

  it('returns null for malformed JSON', () => {
    expect(importGameFromJson('not json')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(importGameFromJson(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });
});
