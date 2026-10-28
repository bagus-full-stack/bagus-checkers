import { createLudoState, rollLudoDice, applyLudoMove, LudoGameState } from './ludo-rules';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const players: ('red' | 'green')[] = ['red', 'green'];
  let state = createLudoState(players);

  assert(state.pieces.length === 8, 'initial state should have 4 tokens per player');
  assert(state.pieces.every((p) => p.trackIndex === undefined), 'all tokens should start in base');
  assert(state.currentPlayer === 'red', 'red should go first');
  assert(state.phase === 'rolling', 'game should start in rolling phase');

  // A non-6 roll with every token still in base must auto-skip the turn.
  const allBaseState: LudoGameState = { ...state, currentPlayer: 'red' };
  let skipped = false;
  for (let i = 0; i < 50 && !skipped; i++) {
    const { roll, state: next } = rollLudoDice(allBaseState);
    if (roll !== 6) {
      assert(next.currentPlayer === 'green', 'non-6 roll with no legal moves should pass turn to green');
      assert(next.lastDiceRoll === roll, 'the rolled value must stay visible when the turn passes');
      skipped = true;
    }
  }
  assert(skipped, 'expected at least one non-6 roll in 50 tries');

  // Force a 6-roll scenario deterministically by injecting a matching move option.
  const redPieceId = state.pieces.find((p) => p.color === 'red')!.id;
  state = { ...state, lastDiceRoll: 6, phase: 'moving' };
  const afterExit = applyLudoMove(state, 'red', redPieceId);
  assert(afterExit !== null, 'exiting base on a roll of 6 should be a legal move');
  const exitedPiece = afterExit!.pieces.find((p) => p.id === redPieceId)!;
  assert(exitedPiece.trackIndex === 0, 'token leaving base should be at step 0');
  assert(afterExit!.phase === 'rolling' && afterExit!.currentPlayer === 'red', 'rolling a 6 should grant another roll, same player');

  // Capture: place a green token on red's step-1 square, then have red land on it.
  const captureState: LudoGameState = {
    ...afterExit!,
    lastDiceRoll: 1,
    phase: 'moving',
    pieces: afterExit!.pieces.map((p) =>
      p.color === 'green' && p.id === afterExit!.pieces.find((gp) => gp.color === 'green')!.id
        ? { ...p, trackIndex: 1, position: { row: 6, col: 1 } }
        : p
    ),
  };
  const afterCapture = applyLudoMove(captureState, 'red', redPieceId);
  assert(afterCapture !== null, 'move onto an enemy-occupied square should be legal (capture)');
  const capturedGreen = afterCapture!.pieces.find((p) => p.color === 'green');
  assert(capturedGreen!.trackIndex === undefined, 'captured token should be sent back to base');

  // Star square: 8 steps after an entry square is safe too - red lands on (3,6) with a green token there.
  const greenId = afterExit!.pieces.find((p) => p.color === 'green')!.id;
  const starState: LudoGameState = {
    ...afterExit!,
    lastDiceRoll: 1,
    phase: 'moving',
    pieces: afterExit!.pieces.map((p) =>
      p.id === redPieceId ? { ...p, trackIndex: 7, position: { row: 4, col: 6 } }
        : p.id === greenId ? { ...p, trackIndex: 47, position: { row: 3, col: 6 } }
        : p
    ),
  };
  const afterStar = applyLudoMove(starState, 'red', redPieceId);
  assert(afterStar !== null, 'moving onto a star square should be legal');
  assert(afterStar!.pieces.find((p) => p.id === greenId)!.trackIndex === 47, 'a token on a star square must not be captured');

  // Win condition: all 4 tokens at the final step.
  const totalSteps = 57;
  const winState: LudoGameState = {
    ...afterCapture!,
    currentPlayer: 'red',
    lastDiceRoll: 1,
    phase: 'moving',
    pieces: afterCapture!.pieces.map((p) =>
      p.color === 'red' ? { ...p, trackIndex: p.id === redPieceId ? totalSteps - 1 : totalSteps, position: { row: 7, col: 5 } } : p
    ),
  };
  const finalState = applyLudoMove(winState, 'red', redPieceId);
  assert(finalState !== null, 'final move to complete the board should be legal');
  assert(finalState!.status === 'finished' && finalState!.winner === 'red', 'red should win once all 4 tokens are home');

  console.log('ludo-rules: all assertions passed');
}

main();
