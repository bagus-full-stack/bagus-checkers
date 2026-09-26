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

  // Win condition: all 4 tokens at the final step.
  const totalSteps = 61;
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
