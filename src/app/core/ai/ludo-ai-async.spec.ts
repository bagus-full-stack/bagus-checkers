import { ludoAiMoveAsync } from './ludo-ai-async';
import { LudoGameState, ludoPositionForSteps } from '../models/ludo.model';
import { createPiece } from '../models/piece.model';

describe('ludoAiMoveAsync', () => {
  const state: LudoGameState = {
    pieces: [
      { ...createPiece('red-0', 'red', ludoPositionForSteps('red', 5), 'token'), trackIndex: 5 },
      createPiece('green-0', 'green', { row: 0, col: 0 }, 'token'),
    ],
    currentPlayer: 'red',
    status: 'playing',
    moveHistory: [],
    phase: 'moving',
    consecutiveSixes: 0,
    players: ['red', 'green'],
  };

  afterEach(() => vi.unstubAllGlobals());

  it('answers inline when there is no worker', async () => {
    vi.stubGlobal('Worker', undefined);
    expect(await ludoAiMoveAsync(state, 'red', 2, 'master')).toBe('red-0');
  });

  it('answers inline, and stops using the worker, when it breaks', async () => {
    class BrokenWorker {
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(), 0);
      }
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal('Worker', BrokenWorker);
    expect(await ludoAiMoveAsync(state, 'red', 2, 'hard')).toBe('red-0');
    expect(await ludoAiMoveAsync(state, 'red', 3, 'hard')).toBe('red-0');
  });
});
