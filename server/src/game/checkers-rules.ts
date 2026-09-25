import { Piece, Position, Move, PlayerColor } from './types';

// ponytail: pure port of src/app/core/services/move-validator.service.ts,
// stripped of Angular DI so it can run server-side. Keep both in sync by hand;
// if the ruleset needs to diverge or drift becomes a real problem, move this
// into a shared workspace package instead of hand-syncing two copies.

export interface CheckersVariant {
  id: string;
  boardSize: number;
  flyingKings: boolean;
  backwardCapture: boolean;
  mandatoryMaxCapture: boolean;
  captureStopOnPromotion: boolean;
}

const VARIANTS: Record<string, CheckersVariant> = {
  international: {
    id: 'international',
    boardSize: 10,
    flyingKings: true,
    backwardCapture: true,
    mandatoryMaxCapture: true,
    captureStopOnPromotion: false,
  },
  english: {
    id: 'english',
    boardSize: 8,
    flyingKings: false,
    backwardCapture: false,
    mandatoryMaxCapture: false,
    captureStopOnPromotion: true,
  },
  brazilian: {
    id: 'brazilian',
    boardSize: 8,
    flyingKings: true,
    backwardCapture: true,
    mandatoryMaxCapture: true,
    captureStopOnPromotion: false,
  },
};

export function getCheckersVariant(id: string): CheckersVariant {
  return VARIANTS[id] ?? VARIANTS['international'];
}

interface CheckersState {
  pieces: Piece[];
}

interface CaptureSequence {
  moves: Move[];
  totalCaptures: number;
}

function createPosition(row: number, col: number): Position {
  return { row, col };
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function isValidPosition(pos: Position, boardSize: number): boolean {
  return pos.row >= 0 && pos.row < boardSize && pos.col >= 0 && pos.col < boardSize;
}

function getForwardDirection(color: PlayerColor): number {
  if (color === 'white') return -1;
  if (color === 'black') return 1;
  return 0;
}

function getPieceAt(pos: Position, state: CheckersState): Piece | undefined {
  return state.pieces.find((p) => positionsEqual(p.position, pos));
}

function willPromote(piece: Piece, newPos: Position, boardSize: number): boolean {
  if (piece.type === 'king') return false;
  return piece.color === 'white' ? newPos.row === 0 : newPos.row === boardSize - 1;
}

function createMove(piece: Piece, to: Position, isPromotion: boolean): Move {
  return { piece, from: piece.position, to, capturedPieces: [], isPromotion };
}

function createCaptureMove(
  piece: Piece,
  to: Position,
  capturedPieces: Piece[],
  isPromotion: boolean
): Move {
  return { piece, from: piece.position, to, capturedPieces, isPromotion };
}

/**
 * All legal moves for one piece, respecting mandatory-capture rules across
 * the whole player's position (not just this piece).
 */
export function getValidMovesForPiece(
  piece: Piece,
  state: CheckersState,
  variant: CheckersVariant
): Move[] {
  const allCaptures = getAllCapturesForPlayer(piece.color, state, variant);

  if (allCaptures.length > 0) {
    const pieceCapturesResult = getCaptureMoves(piece, state, [], variant);
    const pieceCaptures = pieceCapturesResult.flatMap((seq) => seq.moves);

    if (variant.mandatoryMaxCapture) {
      const maxCaptures = Math.max(...allCaptures.map((c) => c.totalCaptures));
      return pieceCapturesResult
        .filter((seq) => seq.totalCaptures === maxCaptures)
        .flatMap((seq) => seq.moves);
    }

    return pieceCaptures;
  }

  return getSimpleMoves(piece, state, variant);
}

function getAllCapturesForPlayer(
  color: PlayerColor,
  state: CheckersState,
  variant: CheckersVariant
): CaptureSequence[] {
  const playerPieces = state.pieces.filter((p) => p.color === color);
  const allCaptures: CaptureSequence[] = [];

  for (const p of playerPieces) {
    allCaptures.push(...getCaptureMoves(p, state, [], variant));
  }

  return allCaptures;
}

function getSimpleMoves(piece: Piece, state: CheckersState, variant: CheckersVariant): Move[] {
  const moves: Move[] = [];
  const boardSize = variant.boardSize;

  if (piece.type === 'pawn') {
    const direction = getForwardDirection(piece.color);
    const moveDirections = [
      { row: direction, col: -1 },
      { row: direction, col: 1 },
    ];

    for (const dir of moveDirections) {
      const newPos = createPosition(piece.position.row + dir.row, piece.position.col + dir.col);
      if (isValidPosition(newPos, boardSize) && !getPieceAt(newPos, state)) {
        moves.push(createMove(piece, newPos, willPromote(piece, newPos, boardSize)));
      }
    }
  } else if (variant.flyingKings) {
    moves.push(...getFlyingKingMoves(piece, state, variant));
  } else {
    const directions = [
      { row: -1, col: -1 },
      { row: -1, col: 1 },
      { row: 1, col: -1 },
      { row: 1, col: 1 },
    ];

    for (const dir of directions) {
      const newPos = createPosition(piece.position.row + dir.row, piece.position.col + dir.col);
      if (isValidPosition(newPos, boardSize) && !getPieceAt(newPos, state)) {
        moves.push(createMove(piece, newPos, false));
      }
    }
  }

  return moves;
}

function getFlyingKingMoves(piece: Piece, state: CheckersState, variant: CheckersVariant): Move[] {
  const moves: Move[] = [];
  const boardSize = variant.boardSize;
  const directions = [
    { row: -1, col: -1 },
    { row: -1, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 1 },
  ];

  for (const dir of directions) {
    let distance = 1;
    while (true) {
      const newPos = createPosition(
        piece.position.row + dir.row * distance,
        piece.position.col + dir.col * distance
      );
      if (!isValidPosition(newPos, boardSize)) break;
      if (getPieceAt(newPos, state)) break;
      moves.push(createMove(piece, newPos, false));
      distance++;
    }
  }

  return moves;
}

function getCaptureMoves(
  piece: Piece,
  state: CheckersState,
  capturedSoFar: Piece[],
  variant: CheckersVariant,
  currentPos?: Position
): CaptureSequence[] {
  const pos = currentPos ?? piece.position;
  const boardSize = variant.boardSize;
  const sequences: CaptureSequence[] = [];

  const directions =
    piece.type === 'king' || variant.backwardCapture
      ? [
          { row: -1, col: -1 },
          { row: -1, col: 1 },
          { row: 1, col: -1 },
          { row: 1, col: 1 },
        ]
      : [
          { row: getForwardDirection(piece.color), col: -1 },
          { row: getForwardDirection(piece.color), col: 1 },
        ];

  for (const dir of directions) {
    const captureResults = findCapturesInDirection(
      piece,
      pos,
      dir,
      state,
      capturedSoFar,
      boardSize,
      variant
    );

    for (const result of captureResults) {
      const newCaptured = [...capturedSoFar, result.capturedPiece];
      const promotes = willPromote(piece, result.landingPos, boardSize);

      if (promotes && variant.captureStopOnPromotion) {
        sequences.push({
          moves: [createCaptureMove(piece, result.landingPos, newCaptured, true)],
          totalCaptures: newCaptured.length,
        });
      } else {
        const continuedCaptures = getCaptureMoves(
          piece.type === 'pawn' && promotes ? { ...piece, type: 'king' } : piece,
          simulateCapture(state, piece, result.landingPos, newCaptured),
          newCaptured,
          variant,
          result.landingPos
        );

        if (continuedCaptures.length > 0) {
          sequences.push(...continuedCaptures);
        } else {
          sequences.push({
            moves: [createCaptureMove(piece, result.landingPos, newCaptured, promotes)],
            totalCaptures: newCaptured.length,
          });
        }
      }
    }
  }

  return sequences;
}

function findCapturesInDirection(
  piece: Piece,
  fromPos: Position,
  direction: { row: number; col: number },
  state: CheckersState,
  capturedSoFar: Piece[],
  boardSize: number,
  variant: CheckersVariant
): { capturedPiece: Piece; landingPos: Position }[] {
  const results: { capturedPiece: Piece; landingPos: Position }[] = [];

  if (piece.type === 'king' && variant.flyingKings) {
    let distance = 1;
    let foundEnemy: Piece | null = null;

    while (true) {
      const checkPos = createPosition(
        fromPos.row + direction.row * distance,
        fromPos.col + direction.col * distance
      );
      if (!isValidPosition(checkPos, boardSize)) break;

      const pieceAtPos = getPieceAt(checkPos, state);
      if (pieceAtPos) {
        if (foundEnemy) break;
        if (pieceAtPos.color === piece.color || capturedSoFar.some((c) => c.id === pieceAtPos.id)) {
          break;
        }
        foundEnemy = pieceAtPos;
      } else if (foundEnemy) {
        results.push({ capturedPiece: foundEnemy, landingPos: checkPos });
      }

      distance++;
    }
  } else {
    const enemyPos = createPosition(fromPos.row + direction.row, fromPos.col + direction.col);
    const landingPos = createPosition(
      fromPos.row + direction.row * 2,
      fromPos.col + direction.col * 2
    );

    if (!isValidPosition(landingPos, boardSize)) return results;

    const enemyPiece = getPieceAt(enemyPos, state);
    const landingPiece = getPieceAt(landingPos, state);

    if (
      enemyPiece &&
      enemyPiece.color !== piece.color &&
      !capturedSoFar.some((c) => c.id === enemyPiece.id) &&
      !landingPiece
    ) {
      results.push({ capturedPiece: enemyPiece, landingPos });
    }
  }

  return results;
}

function simulateCapture(
  state: CheckersState,
  piece: Piece,
  newPos: Position,
  capturedPieces: Piece[]
): CheckersState {
  const newPieces = state.pieces
    .filter((p) => !capturedPieces.some((c) => c.id === p.id))
    .map((p) => (p.id === piece.id ? { ...p, position: newPos } : p));

  return { pieces: newPieces };
}
