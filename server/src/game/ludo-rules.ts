import { Piece, PlayerColor, Position } from './types';

/**
 * Server-side reimplementation of the Ludo rules engine
 * (src/app/core/services/ludo-engine.service.ts + src/app/core/models/ludo.model.ts).
 * Duplicated rather than shared across the Angular/NestJS build boundary,
 * same precedent as checkers-rules.ts.
 */

export interface LudoGameState {
  pieces: Piece[];
  currentPlayer: PlayerColor;
  status: 'playing' | 'finished';
  winner?: PlayerColor;
  phase: 'rolling' | 'moving';
  lastDiceRoll?: number;
  consecutiveSixes: number;
  players: PlayerColor[];
}

interface LudoMoveOption {
  pieceId: string;
  steps: number;
  destination: Position;
  capturedPieceIds: string[];
}

const LUDO_BASES: Record<PlayerColor, Position[]> = {
  red: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 3 }],
  green: [{ row: 2, col: 11 }, { row: 2, col: 12 }, { row: 3, col: 11 }, { row: 3, col: 12 }],
  yellow: [{ row: 11, col: 11 }, { row: 11, col: 12 }, { row: 12, col: 11 }, { row: 12, col: 12 }],
  blue: [{ row: 11, col: 2 }, { row: 11, col: 3 }, { row: 12, col: 2 }, { row: 12, col: 3 }],
  white: [],
  black: [],
};

const rotate90 = (p: Position): Position => ({ row: p.col, col: 14 - p.row });

const RED_QUADRANT: Position[] = [
  { row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 },
  { row: 6, col: 4 }, { row: 6, col: 5 },
  { row: 6, col: 6 },
  { row: 5, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 6 }, { row: 2, col: 6 },
  { row: 1, col: 6 }, { row: 0, col: 6 },
  { row: 0, col: 7 },
];

function buildQuadrants(): Record<PlayerColor, Position[]> {
  const green = RED_QUADRANT.map(rotate90);
  const yellow = green.map(rotate90);
  const blue = yellow.map(rotate90);
  return { red: RED_QUADRANT, green, yellow, blue, white: [], black: [] };
}

const QUADRANTS = buildQuadrants();
const LUDO_TRACK_LENGTH = RED_QUADRANT.length * 4; // 56
const LUDO_PATH: Position[] = [...QUADRANTS.red, ...QUADRANTS.green, ...QUADRANTS.yellow, ...QUADRANTS.blue];

const LUDO_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: RED_QUADRANT.length,
  yellow: RED_QUADRANT.length * 2,
  blue: RED_QUADRANT.length * 3,
  white: 0,
  black: 0,
};

const LUDO_HOME_LENGTH = 5;

const LUDO_HOME_PATH: Record<PlayerColor, Position[]> = {
  red: [{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }],
  green: [{ row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, { row: 4, col: 7 }, { row: 5, col: 7 }],
  yellow: [{ row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 }, { row: 7, col: 10 }, { row: 7, col: 9 }],
  blue: [{ row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, { row: 10, col: 7 }, { row: 9, col: 7 }],
  white: [],
  black: [],
};

const LUDO_HOME_ENTRY_STEP = LUDO_TRACK_LENGTH; // 56
const LUDO_TOTAL_STEPS = LUDO_HOME_ENTRY_STEP + LUDO_HOME_LENGTH; // 61
const LUDO_SAFE_INDICES: ReadonlySet<number> = new Set(Object.values(LUDO_START_INDEX));

function ludoPositionForSteps(color: PlayerColor, steps: number): Position {
  if (steps >= LUDO_HOME_ENTRY_STEP) {
    const homeIndex = Math.min(steps - LUDO_HOME_ENTRY_STEP, LUDO_HOME_LENGTH - 1);
    return LUDO_HOME_PATH[color][homeIndex];
  }
  const globalIndex = (LUDO_START_INDEX[color] + steps) % LUDO_TRACK_LENGTH;
  return LUDO_PATH[globalIndex];
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function createLudoState(players: PlayerColor[]): LudoGameState {
  const pieces: Piece[] = [];
  let pieceId = 0;
  players.forEach((color) => {
    LUDO_BASES[color].forEach((pos) => {
      pieces.push({ id: `${color}-${pieceId++}`, color, type: 'token', position: pos });
    });
  });

  return {
    pieces,
    currentPlayer: players[0],
    status: 'playing',
    phase: 'rolling',
    consecutiveSixes: 0,
    players,
  };
}

function isInBase(piece: Piece): boolean {
  return piece.trackIndex === undefined;
}

function isFinished(piece: Piece): boolean {
  return piece.trackIndex === LUDO_TOTAL_STEPS;
}

function capturesAt(state: LudoGameState, color: PlayerColor, destination: Position, newSteps: number): string[] {
  if (newSteps >= LUDO_TRACK_LENGTH) return [];
  const globalIndex = (LUDO_START_INDEX[color] + newSteps) % LUDO_TRACK_LENGTH;
  if (LUDO_SAFE_INDICES.has(globalIndex)) return [];

  return state.pieces
    .filter((p) => p.color !== color && !isInBase(p) && positionsEqual(p.position, destination))
    .map((p) => p.id);
}

function getMoveOptions(state: LudoGameState, color: PlayerColor, roll: number): LudoMoveOption[] {
  const options: LudoMoveOption[] = [];

  for (const piece of state.pieces.filter((p) => p.color === color)) {
    if (isFinished(piece)) continue;

    if (isInBase(piece)) {
      if (roll !== 6) continue;
      const destination = ludoPositionForSteps(color, 0);
      options.push({ pieceId: piece.id, steps: 0, destination, capturedPieceIds: capturesAt(state, color, destination, 0) });
      continue;
    }

    const newSteps = piece.trackIndex! + roll;
    if (newSteps > LUDO_TOTAL_STEPS) continue;

    const destination = ludoPositionForSteps(color, newSteps);
    options.push({ pieceId: piece.id, steps: newSteps, destination, capturedPieceIds: capturesAt(state, color, destination, newSteps) });
  }

  return options;
}

function checkWinner(state: LudoGameState, color: PlayerColor): PlayerColor | null {
  return state.pieces.filter((p) => p.color === color).every((p) => isFinished(p)) ? color : null;
}

function advanceTurn(state: LudoGameState, lastRoll: number): LudoGameState {
  if (lastRoll === 6 && state.consecutiveSixes < 3) {
    return { ...state, phase: 'rolling' };
  }

  const currentIndex = state.players.indexOf(state.currentPlayer);
  const nextPlayer = state.players[(currentIndex + 1) % state.players.length];
  return { ...state, currentPlayer: nextPlayer, phase: 'rolling', consecutiveSixes: 0, lastDiceRoll: undefined };
}

/** Server rolls the die itself - the client never sends a roll value. */
export function rollLudoDice(state: LudoGameState): { roll: number; state: LudoGameState } {
  const roll = Math.floor(Math.random() * 6) + 1;
  const options = getMoveOptions(state, state.currentPlayer, roll);

  if (options.length > 0) {
    return {
      roll,
      state: {
        ...state,
        lastDiceRoll: roll,
        phase: 'moving',
        consecutiveSixes: roll === 6 ? state.consecutiveSixes + 1 : 0,
      },
    };
  }

  return { roll, state: advanceTurn(state, roll) };
}

/** Validates and applies moving `pieceId` for `playerColor`. Returns null if illegal. */
export function applyLudoMove(state: LudoGameState, playerColor: PlayerColor, pieceId: string): LudoGameState | null {
  if (state.status !== 'playing' || state.phase !== 'moving' || state.currentPlayer !== playerColor || !state.lastDiceRoll) {
    return null;
  }

  const option = getMoveOptions(state, playerColor, state.lastDiceRoll).find((o) => o.pieceId === pieceId);
  if (!option) return null;

  const capturedIds = new Set(option.capturedPieceIds);
  const takenBaseSlots = new Set<string>();

  const newPieces = state.pieces.map((p) => {
    if (p.id === pieceId) return { ...p, position: option.destination, trackIndex: option.steps };
    if (!capturedIds.has(p.id)) return p;

    const freeSpot =
      LUDO_BASES[p.color].find((spot) => {
        const key = `${p.color}:${spot.row},${spot.col}`;
        if (takenBaseSlots.has(key)) return false;
        const occupied = state.pieces.some(
          (op) => op.color === p.color && op.trackIndex === undefined && positionsEqual(op.position, spot)
        );
        return !occupied;
      }) ?? LUDO_BASES[p.color][0];
    takenBaseSlots.add(`${p.color}:${freeSpot.row},${freeSpot.col}`);
    return { ...p, position: freeSpot, trackIndex: undefined };
  });

  const nextState: LudoGameState = { ...state, pieces: newPieces };
  const winner = checkWinner(nextState, playerColor);
  if (winner) {
    return { ...nextState, status: 'finished', winner, phase: 'rolling' };
  }

  return advanceTurn(nextState, state.lastDiceRoll);
}
