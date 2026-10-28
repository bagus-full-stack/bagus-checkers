import { Position } from './position.model';
import { Piece, PlayerColor } from './piece.model';
import { GameStatus, GameResult } from './game-state.model';
import { Move } from './move.model';

export type LudoPhase = 'rolling' | 'moving';

/**
 * State specific to a Ludo game
 */
export interface LudoGameState {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  status: GameStatus;
  result?: GameResult;
  moveHistory: Move[];

  // Ludo specific state
  phase: LudoPhase;
  lastDiceRoll?: number;
  consecutiveSixes: number;
  players: PlayerColor[];
}

// Ludo base starting positions for 4 players (corners of a 15x15 board)
export const LUDO_BASES: Record<PlayerColor, Position[]> = {
  red:    [{row: 2, col: 2}, {row: 2, col: 3}, {row: 3, col: 2}, {row: 3, col: 3}],
  green:  [{row: 2, col: 11}, {row: 2, col: 12}, {row: 3, col: 11}, {row: 3, col: 12}],
  yellow: [{row: 11, col: 11}, {row: 11, col: 12}, {row: 12, col: 11}, {row: 12, col: 12}],
  blue:   [{row: 11, col: 2}, {row: 11, col: 3}, {row: 12, col: 2}, {row: 12, col: 3}],
  white: [], black: [] // fallback for strict type checking
};

/**
 * The shared 52-cell outer track (standard Ludo), in board coordinates, index 0..51.
 * Built from one hand-placed quadrant (red's) rotated 90° three times. The 3x3
 * center is not track, so the path steps diagonally around each of its corners,
 * e.g. (6,5) -> (5,6), as on a real board.
 */
const rotate90 = (p: Position): Position => ({ row: p.col, col: 14 - p.row });

const RED_QUADRANT: Position[] = [
  { row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 },
  { row: 6, col: 4 }, { row: 6, col: 5 },
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 },
  { row: 1, col: 6 }, { row: 0, col: 6 },
  { row: 0, col: 7 }, // branches into GREEN's home column
];

function buildQuadrants(): Record<PlayerColor, Position[]> {
  const green = RED_QUADRANT.map(rotate90);
  const yellow = green.map(rotate90);
  const blue = yellow.map(rotate90);
  return { red: RED_QUADRANT, green, yellow, blue, white: [], black: [] };
}

const QUADRANTS = buildQuadrants();

export const LUDO_TRACK_LENGTH = RED_QUADRANT.length * 4; // 52

export const LUDO_PATH: Position[] = [
  ...QUADRANTS.red, ...QUADRANTS.green, ...QUADRANTS.yellow, ...QUADRANTS.blue,
];

/** Global index into LUDO_PATH where each color's tokens re-enter the track. */
export const LUDO_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: RED_QUADRANT.length,
  yellow: RED_QUADRANT.length * 2,
  blue: RED_QUADRANT.length * 3,
  white: 0, black: 0
};

export const LUDO_HOME_LENGTH = 5;

/**
 * Each color's private 5-cell home stretch, from the entrance (adjacent to
 * the branch cell in LUDO_PATH) to the cell next to the center.
 */
export const LUDO_HOME_PATH: Record<PlayerColor, Position[]> = {
  red:    [{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }],
  green:  [{ row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, { row: 4, col: 7 }, { row: 5, col: 7 }],
  yellow: [{ row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 }, { row: 7, col: 10 }, { row: 7, col: 9 }],
  blue:   [{ row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, { row: 10, col: 7 }, { row: 9, col: 7 }],
  white: [], black: []
};

/** Steps taken (0-based) at which a token leaves the shared track for its home column. */
export const LUDO_HOME_ENTRY_STEP = LUDO_TRACK_LENGTH; // 52 - a token uses all 52 shared cells (steps 0-51) first
/** Total steps (0-based target) for a token to go from base-exit to finished. */
export const LUDO_TOTAL_STEPS = LUDO_HOME_ENTRY_STEP + LUDO_HOME_LENGTH; // 57

/** Each color's star square sits this many steps after its entry square. */
export const LUDO_STAR_OFFSET = 8;

/** Global track squares where a token can't be captured: the 4 entry squares and the 4 star squares. */
export const LUDO_SAFE_INDICES: ReadonlySet<number> = new Set(
  Object.values(LUDO_START_INDEX).flatMap((i) => [i, i + LUDO_STAR_OFFSET]),
);

/** Board position for a token that has taken `steps` steps since leaving base. */
export function ludoPositionForSteps(color: PlayerColor, steps: number): Position {
  if (steps >= LUDO_HOME_ENTRY_STEP) {
    const homeIndex = Math.min(steps - LUDO_HOME_ENTRY_STEP, LUDO_HOME_LENGTH - 1);
    return LUDO_HOME_PATH[color][homeIndex];
  }
  const globalIndex = (LUDO_START_INDEX[color] + steps) % LUDO_TRACK_LENGTH;
  return LUDO_PATH[globalIndex];
}
