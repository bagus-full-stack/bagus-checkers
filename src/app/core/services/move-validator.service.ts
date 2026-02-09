import { Injectable, inject } from '@angular/core';
import {
  Position,
  Piece,
  Move,
  GameState,
  createPosition,
  isValidPosition,
  isDarkSquare,
  positionsEqual,
  getForwardDirection,
  createMove,
  createCaptureMove,
} from '../models';
import { GameVariantService } from './game-variant.service';

interface CaptureSequence {
  moves: Move[];
  totalCaptures: number;
}

/**
 * Service responsible for validating moves according to game rules
 */
@Injectable({
  providedIn: 'root',
})
export class MoveValidatorService {
  private readonly variantService = inject(GameVariantService);

  /**
   * Gets all valid moves for a piece in the current game state
   */
  getValidMoves(piece: Piece, state: GameState): Move[] {
    const allCaptures = this.getAllCapturesForPlayer(piece.color, state);

    if (allCaptures.length > 0) {
      // If there are captures available, filter to this piece's captures
      const pieceCapturesResult = this.getCaptureMoves(piece, state, []);
      const pieceCaptures = pieceCapturesResult.flatMap((seq) => seq.moves);

      if (this.variantService.mandatoryMaxCapture()) {
        // Find max capture count across ALL player's pieces
        const maxCaptures = Math.max(...allCaptures.map((c) => c.totalCaptures));
        // Return only moves from this piece that match max
        return pieceCapturesResult
          .filter((seq) => seq.totalCaptures === maxCaptures)
          .flatMap((seq) => seq.moves);
      }

      return pieceCaptures;
    }

    // No captures available, return simple moves
    return this.getSimpleMoves(piece, state);
  }

  /**
   * Gets all capture moves available for a player
   */
  getAllCapturesForPlayer(
    color: Piece['color'],
    state: GameState
  ): CaptureSequence[] {
    const playerPieces = state.pieces.filter((p) => p.color === color);
    const allCaptures: CaptureSequence[] = [];

    for (const piece of playerPieces) {
      const captures = this.getCaptureMoves(piece, state, []);
      allCaptures.push(...captures);
    }

    return allCaptures;
  }

  /**
   * Checks if a player must capture
   */
  mustCapture(color: Piece['color'], state: GameState): boolean {
    return this.getAllCapturesForPlayer(color, state).length > 0;
  }

  /**
   * Gets simple (non-capture) moves for a piece
   */
  private getSimpleMoves(piece: Piece, state: GameState): Move[] {
    const moves: Move[] = [];
    const boardSize = this.variantService.boardSize();

    if (piece.type === 'pawn') {
      // Pawns move diagonally forward
      const direction = getForwardDirection(piece.color);
      const moveDirections = [
        { row: direction, col: -1 },
        { row: direction, col: 1 },
      ];

      for (const dir of moveDirections) {
        const newPos = createPosition(
          piece.position.row + dir.row,
          piece.position.col + dir.col
        );

        if (
          isValidPosition(newPos, boardSize) &&
          !this.getPieceAt(newPos, state)
        ) {
          const isPromotion = this.willPromote(piece, newPos);
          moves.push(createMove(piece, newPos, isPromotion));
        }
      }
    } else {
      // King moves
      if (this.variantService.flyingKings()) {
        // Flying king: can move multiple squares diagonally
        moves.push(...this.getFlyingKingMoves(piece, state));
      } else {
        // Non-flying king: moves one square in any diagonal direction
        const directions = [
          { row: -1, col: -1 },
          { row: -1, col: 1 },
          { row: 1, col: -1 },
          { row: 1, col: 1 },
        ];

        for (const dir of directions) {
          const newPos = createPosition(
            piece.position.row + dir.row,
            piece.position.col + dir.col
          );

          if (
            isValidPosition(newPos, boardSize) &&
            !this.getPieceAt(newPos, state)
          ) {
            moves.push(createMove(piece, newPos, false));
          }
        }
      }
    }

    return moves;
  }

  /**
   * Gets flying king moves (can move multiple squares)
   */
  private getFlyingKingMoves(piece: Piece, state: GameState): Move[] {
    const moves: Move[] = [];
    const boardSize = this.variantService.boardSize();
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

        const pieceAtPos = this.getPieceAt(newPos, state);
        if (pieceAtPos) break; // Blocked by a piece

        moves.push(createMove(piece, newPos, false));
        distance++;
      }
    }

    return moves;
  }

  /**
   * Gets all capture move sequences for a piece (including multi-captures)
   */
  private getCaptureMoves(
    piece: Piece,
    state: GameState,
    capturedSoFar: Piece[],
    currentPos?: Position
  ): CaptureSequence[] {
    const pos = currentPos ?? piece.position;
    const boardSize = this.variantService.boardSize();
    const sequences: CaptureSequence[] = [];

    const directions =
      piece.type === 'king' || this.variantService.backwardCapture()
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
      const captureResults = this.findCapturesInDirection(
        piece,
        pos,
        dir,
        state,
        capturedSoFar,
        boardSize
      );

      for (const result of captureResults) {
        const newCaptured = [...capturedSoFar, result.capturedPiece];
        const willPromote = this.willPromote(piece, result.landingPos);
        const variant = this.variantService.currentVariant();

        // Check if capture should stop on promotion
        if (willPromote && variant.captureStopOnPromotion) {
          const move = createCaptureMove(
            piece,
            result.landingPos,
            newCaptured,
            true
          );
          sequences.push({ moves: [move], totalCaptures: newCaptured.length });
        } else {
          // Try to continue capturing
          const continuedCaptures = this.getCaptureMoves(
            piece.type === 'pawn' && willPromote
              ? { ...piece, type: 'king' }
              : piece,
            this.simulateCapture(state, piece, result.landingPos, newCaptured),
            newCaptured,
            result.landingPos
          );

          if (continuedCaptures.length > 0) {
            // Add all continuation sequences
            sequences.push(...continuedCaptures);
          } else {
            // No more captures, this is a final move
            const move = createCaptureMove(
              piece,
              result.landingPos,
              newCaptured,
              willPromote
            );
            sequences.push({
              moves: [move],
              totalCaptures: newCaptured.length,
            });
          }
        }
      }
    }

    return sequences;
  }

  /**
   * Finds captures in a specific direction
   */
  private findCapturesInDirection(
    piece: Piece,
    fromPos: Position,
    direction: { row: number; col: number },
    state: GameState,
    capturedSoFar: Piece[],
    boardSize: number
  ): { capturedPiece: Piece; landingPos: Position }[] {
    const results: { capturedPiece: Piece; landingPos: Position }[] = [];

    if (piece.type === 'king' && this.variantService.flyingKings()) {
      // Flying king: can capture from distance
      let distance = 1;
      let foundEnemy: Piece | null = null;

      while (true) {
        const checkPos = createPosition(
          fromPos.row + direction.row * distance,
          fromPos.col + direction.col * distance
        );

        if (!isValidPosition(checkPos, boardSize)) break;

        const pieceAtPos = this.getPieceAt(checkPos, state);

        if (pieceAtPos) {
          if (foundEnemy) {
            // Already found an enemy, can't jump over two pieces
            break;
          }

          if (
            pieceAtPos.color === piece.color ||
            capturedSoFar.some((c) => c.id === pieceAtPos.id)
          ) {
            // Own piece or already captured
            break;
          }

          foundEnemy = pieceAtPos;
        } else if (foundEnemy) {
          // Empty square after enemy - valid landing
          results.push({ capturedPiece: foundEnemy, landingPos: checkPos });
        }

        distance++;
      }
    } else {
      // Regular capture: jump over adjacent enemy
      const enemyPos = createPosition(
        fromPos.row + direction.row,
        fromPos.col + direction.col
      );
      const landingPos = createPosition(
        fromPos.row + direction.row * 2,
        fromPos.col + direction.col * 2
      );

      if (!isValidPosition(landingPos, boardSize)) return results;

      const enemyPiece = this.getPieceAt(enemyPos, state);
      const landingPiece = this.getPieceAt(landingPos, state);

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

  /**
   * Simulates a capture for recursive capture detection
   */
  private simulateCapture(
    state: GameState,
    piece: Piece,
    newPos: Position,
    capturedPieces: Piece[]
  ): GameState {
    const newPieces = state.pieces
      .filter((p) => !capturedPieces.some((c) => c.id === p.id))
      .map((p) => (p.id === piece.id ? { ...p, position: newPos } : p));

    return { ...state, pieces: newPieces };
  }

  /**
   * Checks if a piece will be promoted at a position
   * White pieces promote at row 0 (top), black pieces at row boardSize-1 (bottom)
   */
  private willPromote(piece: Piece, newPos: Position): boolean {
    if (piece.type === 'king') return false;
    const boardSize = this.variantService.boardSize();
    return piece.color === 'white'
      ? newPos.row === 0
      : newPos.row === boardSize - 1;
  }

  /**
   * Gets a piece at a specific position
   */
  private getPieceAt(pos: Position, state: GameState): Piece | undefined {
    return state.pieces.find((p) => positionsEqual(p.position, pos));
  }
}

