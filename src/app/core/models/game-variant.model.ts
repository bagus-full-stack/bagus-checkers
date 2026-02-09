/**
 * Game variant configuration
 */
export interface GameVariant {
  readonly id: string;
  readonly name: string;
  readonly boardSize: number;
  readonly piecesPerPlayer: number;
  readonly flyingKings: boolean; // Kings can move multiple squares
  readonly backwardCapture: boolean; // Pawns can capture backward
  readonly mandatoryMaxCapture: boolean; // Must take maximum captures
  readonly promotionOnLastRow: boolean; // Promote only when reaching last row
  readonly captureStopOnPromotion: boolean; // Stop capture sequence when promoted
}

/**
 * International Draughts (10x10) - Default variant
 */
export const INTERNATIONAL_DRAUGHTS: GameVariant = {
  id: 'international',
  name: 'Dames Internationales',
  boardSize: 10,
  piecesPerPlayer: 20,
  flyingKings: true,
  backwardCapture: true,
  mandatoryMaxCapture: true,
  promotionOnLastRow: true,
  captureStopOnPromotion: false,
};

/**
 * English Draughts (8x8)
 */
export const ENGLISH_DRAUGHTS: GameVariant = {
  id: 'english',
  name: 'Dames Anglaises',
  boardSize: 8,
  piecesPerPlayer: 12,
  flyingKings: false, // Kings move only one square
  backwardCapture: false, // Pawns cannot capture backward
  mandatoryMaxCapture: false, // Can choose any capture
  promotionOnLastRow: true,
  captureStopOnPromotion: true, // Turn ends on promotion
};

/**
 * Brazilian Draughts (8x8 with international rules)
 */
export const BRAZILIAN_DRAUGHTS: GameVariant = {
  id: 'brazilian',
  name: 'Dames Brésiliennes',
  boardSize: 8,
  piecesPerPlayer: 12,
  flyingKings: true,
  backwardCapture: true,
  mandatoryMaxCapture: true,
  promotionOnLastRow: true,
  captureStopOnPromotion: false,
};

/**
 * All available variants
 */
export const GAME_VARIANTS: readonly GameVariant[] = [
  INTERNATIONAL_DRAUGHTS,
  ENGLISH_DRAUGHTS,
  BRAZILIAN_DRAUGHTS,
];

/**
 * Gets a variant by ID
 */
export function getVariantById(id: string): GameVariant {
  const variant = GAME_VARIANTS.find(v => v.id === id);
  return variant ?? INTERNATIONAL_DRAUGHTS;
}

