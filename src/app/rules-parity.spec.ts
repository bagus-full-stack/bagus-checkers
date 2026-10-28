import { TestBed } from '@angular/core/testing';
import { GameVariantService, LudoEngineService, MoveValidatorService } from './core/services';
import { GameState, Move, Piece, createInitialGameState, createPiece } from './core/models';
import { ludoAiMove } from './core/ai';
// The server keeps its own copy of the rules (it cannot share the Angular build). These tests play
// random games and fail as soon as the two copies - or the AI's search model - disagree.
import { getCheckersVariant, getValidMovesForPiece } from '../../server/src/game/checkers-rules';
import { applyLudoMove, createLudoState, LudoGameState, rollLudoDice } from '../../server/src/game/ludo-rules';

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const key = (m: { from: { row: number; col: number }; to: { row: number; col: number }; capturedPieces: readonly { id: string }[] }) =>
  `${m.from.row},${m.from.col}>${m.to.row},${m.to.col}x${m.capturedPieces.map((c) => c.id).sort().join('+')}`;

describe('draughts rules: client validator vs server', () => {
  for (const id of ['international', 'english', 'brazilian']) {
    it(`${id}: same legal moves in random games`, () => {
      const variants = TestBed.inject(GameVariantService);
      const validator = TestBed.inject(MoveValidatorService);
      variants.setVariant(id);
      const size = getCheckersVariant(id).boardSize;
      const rows = variants.getInitialRows();

      for (let game = 0; game < 12; game++) {
        let pieces: Piece[] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if ((r + c) % 2 !== 1) continue;
            if (r < rows) pieces.push(createPiece(`b${r}-${c}`, 'black', { row: r, col: c }));
            if (r >= size - rows) pieces.push(createPiece(`w${r}-${c}`, 'white', { row: r, col: c }));
          }
        }
        let turn: 'white' | 'black' = 'white';
        for (let ply = 0; ply < 160; ply++) {
          const state: GameState = { ...createInitialGameState(pieces), currentPlayer: turn };
          const mine = pieces.filter((p) => p.color === turn);
          const serverMoves: Move[] = [];
          for (const p of mine) {
            const s = getValidMovesForPiece(p as never, { pieces: pieces as never }, getCheckersVariant(id)) as unknown as Move[];
            const c = validator.getValidMoves(p, state);
            expect(c.map(key).sort(), `${id} game ${game} ply ${ply} piece ${p.id}`).toEqual(s.map(key).sort());
            serverMoves.push(...s);
          }
          if (serverMoves.length === 0) break;
          const move = pick(serverMoves);
          const captured = new Set(move.capturedPieces.map((c) => c.id));
          pieces = pieces
            .filter((p) => !captured.has(p.id))
            .map((p) => (p.id === move.piece.id ? { ...p, position: move.to, type: move.isPromotion ? 'king' : p.type } : p));
          turn = turn === 'white' ? 'black' : 'white';
        }
      }
    });
  }
});

describe('Ludo rules: server vs client engine vs AI model', () => {
  const sets: ('red' | 'green' | 'yellow' | 'blue')[][] = [
    ['red', 'green', 'yellow', 'blue'],
    ['red', 'yellow'],
    ['blue', 'red', 'green'],
  ];

  for (const players of sets) {
    it(`${players.join('/')}: same legal moves and captures in random games`, () => {
      const engine = TestBed.inject(LudoEngineService) as unknown as {
        _gameState: { set(s: unknown): void };
        movableOptions(): { piece: { id: string }; capturedPieceIds: string[] }[];
      };

      for (let game = 0; game < 6; game++) {
        let state: LudoGameState = createLudoState(players);
        for (let step = 0; step < 900 && state.status === 'playing'; step++) {
          state = rollLudoDice(state).state;
          if (state.status !== 'playing' || state.phase !== 'moving') continue;

          const color = state.currentPlayer;
          const roll = state.lastDiceRoll!;
          const next = new Map<string, LudoGameState>();
          for (const p of state.pieces.filter((x) => x.color === color)) {
            const moved = applyLudoMove(state, color, p.id);
            if (moved) next.set(p.id, moved);
          }
          const capturedBy = (id: string) =>
            state.pieces.filter((p) => p.trackIndex !== undefined && next.get(id)!.pieces.find((q) => q.id === p.id)!.trackIndex === undefined).map((p) => p.id);

          // client engine
          engine._gameState.set({ ...state, moveHistory: [] });
          const options = engine.movableOptions();
          expect(options.map((o) => o.piece.id).sort(), `engine legal ids, roll ${roll}`).toEqual([...next.keys()].sort());
          for (const o of options) expect([...o.capturedPieceIds].sort(), `engine captures for ${o.piece.id}`).toEqual(capturedBy(o.piece.id).sort());

          // AI search model
          for (const level of ['easy', 'medium'] as const) {
            const chosen = ludoAiMove(state as never, color, roll, level);
            expect(chosen === null, `${level} finds a move iff one exists`).toBe(next.size === 0);
            if (chosen) expect(next.has(chosen), `${level} chose a legal piece`).toBe(true);
            if (level === 'easy' && [...next.keys()].some((id) => capturedBy(id).length > 0)) {
              expect(capturedBy(chosen!).length, 'easy takes a capture when there is one').toBeGreaterThan(0);
            }
          }

          state = next.get(pick([...next.keys()]))!;
        }
      }
    });
  }
});
