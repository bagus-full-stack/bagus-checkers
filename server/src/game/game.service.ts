import { Injectable } from '@nestjs/common';
import { Move, Piece, Position, PlayerColor } from './types';

interface GameState {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  status: 'playing' | 'finished';
  winner?: PlayerColor;

  // Ludo specific
  phase?: 'rolling' | 'moving';
  players?: PlayerColor[];
  consecutiveSixes?: number;
}

@Injectable()
export class GameService {
  /**
   * Creates initial game state depending on variant
   */
  createInitialState(variant: string = 'international', layout?: 'classic' | 'random'): GameState {
    if (variant === 'ludo') {
      return this.createLudoState();
    }

    return this.createCheckersState();
  }

  private createCheckersState(): GameState {
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

  private createLudoState(): GameState {
    const players: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    const pieces: Piece[] = [];

    // Ludo base starting positions for 4 players (corners of a 15x15 board)
    const bases: Record<PlayerColor, Position[]> = {
      red:    [{row: 2, col: 2}, {row: 2, col: 3}, {row: 3, col: 2}, {row: 3, col: 3}],
      green:  [{row: 2, col: 11}, {row: 2, col: 12}, {row: 3, col: 11}, {row: 3, col: 12}],
      yellow: [{row: 11, col: 11}, {row: 11, col: 12}, {row: 12, col: 11}, {row: 12, col: 12}],
      blue:   [{row: 11, col: 2}, {row: 11, col: 3}, {row: 12, col: 2}, {row: 12, col: 3}],
      white: [], black: [] // fallback
    };

    let pieceId = 0;
    players.forEach(color => {
      const basePositions = bases[color];
      if (basePositions) {
        basePositions.forEach(pos => {
          pieces.push({
            id: `${color}-${pieceId++}`,
            color,
            type: 'token',
            position: pos
          });
        });
      }
    });

    return {
      pieces,
      currentPlayer: 'red',
      status: 'playing',
      phase: 'rolling',
      players,
      consecutiveSixes: 0
    };
  }

  /**
   * Validates and applies a move
   */
  applyMove(state: GameState, move: any, playerColor: PlayerColor): GameState | null {
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
      .filter((p) => !move.capturedPieces?.some((c: Piece) => c.id === p.id));

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
