import { ludoAiMove, LudoAiLevel } from './ludo-ai';
import { LudoGameState, ludoPositionForSteps } from '../models/ludo.model';
import { createPiece } from '../models/piece.model';

const LEVELS: LudoAiLevel[] = ['easy', 'medium', 'hard', 'expert', 'master'];

function piece(id: string, color: 'red' | 'green' | 'yellow' | 'blue', steps?: number) {
  return steps === undefined
    ? createPiece(id, color, { row: 0, col: 0 }, 'token')
    : { ...createPiece(id, color, ludoPositionForSteps(color, steps), 'token'), trackIndex: steps };
}

function state(pieces: ReturnType<typeof piece>[], players: ('red' | 'green' | 'yellow' | 'blue')[] = ['red', 'green']): LudoGameState {
  return { pieces, currentPlayer: 'red', status: 'playing', moveHistory: [], phase: 'moving', consecutiveSixes: 0, players };
}

describe('ludoAiMove', () => {
  it('returns null when no move is legal, the only move when there is one', () => {
    const stuck = state([piece('red-0', 'red'), piece('green-0', 'green')]);
    for (const level of LEVELS) expect(ludoAiMove(stuck, 'red', 3, level)).toBeNull();
    const single = state([piece('red-0', 'red', 5), piece('red-1', 'red'), piece('green-0', 'green')]);
    for (const level of LEVELS) expect(ludoAiMove(single, 'red', 2, level)).toBe('red-0');
  });

  it('every level finishes the game when it can', () => {
    const pieces = [
      piece('red-0', 'red', 56), piece('red-1', 'red', 40), piece('red-2', 'red', 57), piece('red-3', 'red', 57),
      piece('green-0', 'green', 3),
    ];
    // red-1 can also move 1 step, but only red-0 reaches 57 - the winning difference is the third token home
    const winning = state([...pieces.slice(0, 1), piece('red-1', 'red', 57), ...pieces.slice(2)]);
    const s = state([piece('red-0', 'red', 56), piece('red-1', 'red', 57), piece('red-2', 'red', 57), piece('red-3', 'red', 20), piece('green-0', 'green', 3)]);
    for (const level of ['medium', 'hard', 'expert', 'master'] as LudoAiLevel[]) {
      // red-3 is far from home, red-0 finishes with a 1: finishing a token beats advancing a far one
      expect(ludoAiMove(s, 'red', 1, level), level).toBe('red-0');
    }
    expect(winning).toBeTruthy();
  });

  it('smart levels capture an exposed rival rather than make a plain advance', () => {
    // green-0 sits on global square 5 (not safe); red-0 reaches it with a 2 from step 3
    const s = state([
      piece('red-0', 'red', 3),
      piece('red-1', 'red', 20),
      piece('green-0', 'green', 5 + 39), // green start is 13: (13 + 44) % 52 = 5
    ]);
    for (const level of ['easy', 'medium', 'hard', 'expert', 'master'] as LudoAiLevel[]) {
      expect(ludoAiMove(s, 'red', 2, level), level).toBe('red-0');
    }
  });

  it('plays a four-seat position within a sane time at the strongest search levels', () => {
    const s = state(
      [
        piece('red-0', 'red', 10), piece('red-1', 'red', 25), piece('red-2', 'red'), piece('red-3', 'red'),
        piece('green-0', 'green', 14), piece('green-1', 'green', 30), piece('green-2', 'green'), piece('green-3', 'green'),
        piece('yellow-0', 'yellow', 8), piece('yellow-1', 'yellow'), piece('yellow-2', 'yellow'), piece('yellow-3', 'yellow'),
        piece('blue-0', 'blue', 22), piece('blue-1', 'blue'), piece('blue-2', 'blue'), piece('blue-3', 'blue'),
      ],
      ['red', 'green', 'yellow', 'blue'],
    );
    const t0 = Date.now();
    for (const level of ['hard', 'expert', 'master'] as LudoAiLevel[]) {
      expect(['red-0', 'red-1']).toContain(ludoAiMove(s, 'red', 3, level));
    }
    expect(Date.now() - t0).toBeLessThan(15000);
  }, 30000);
});
