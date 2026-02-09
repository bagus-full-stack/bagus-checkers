import { Injectable } from '@nestjs/common';
import { Move, Piece, Position, PlayerColor } from './types';

interface GameState {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  status: 'playing' | 'finished';
  winner?: PlayerColor;
}

@Injectable()
export class GameService {
  /**
   * Creates initial game state for a 10x10 board
   */
  createInitialState(): GameState {
    const pieces: Piece[] = [];
    let pieceId = 0;

    // Black pieces (top)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 10; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({
            id: `black-${pieceId++}`,
            color: 'black',
            type: 'pawn',
            position: { row, col },
          });
        }
      }
    }

    // White pieces (bottom)
    for (let row = 6; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({
            id: `white-${pieceId++}`,
            color: 'white',
            type: 'pawn',
            position: { row, col },
          });
        }
      }
    }

    return {
      pieces,
      currentPlayer: 'white',
      status: 'playing',
    };
  }

  /**
   * Validates and applies a move
   */
  applyMove(state: GameState, move: Move, playerColor: PlayerColor): GameState | null {
    // Validate it's the player's turn
    if (state.currentPlayer !== playerColor) {
      return null;
    }

    // Validate the piece belongs to the player
    const piece = state.pieces.find((p) => p.id === move.piece.id);
    if (!piece || piece.color !== playerColor) {
      return null;
    }

    // Apply the move
    const newPieces = state.pieces
      .filter((p) => p.id !== piece.id)
      .filter((p) => !move.capturedPieces.some((c) => c.id === p.id));

    let movedPiece: Piece = {
      ...piece,
      position: move.to,
    };

    // Handle promotion
    if (move.isPromotion) {
      movedPiece = { ...movedPiece, type: 'king' };
    }

    newPieces.push(movedPiece);

    const nextPlayer: PlayerColor = playerColor === 'white' ? 'black' : 'white';

    // Check for game over
    const nextPlayerPieces = newPieces.filter((p) => p.color === nextPlayer);
    const isGameOver = nextPlayerPieces.length === 0;

    return {
      pieces: newPieces,
      currentPlayer: nextPlayer,
      status: isGameOver ? 'finished' : 'playing',
      winner: isGameOver ? playerColor : undefined,
    };
  }

  /**
   * Validates if it's a player's turn
   */
  isPlayerTurn(state: GameState, playerColor: PlayerColor): boolean {
    return state.currentPlayer === playerColor;
  }
}

