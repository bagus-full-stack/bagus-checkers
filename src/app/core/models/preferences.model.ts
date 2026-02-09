/**
 * Board theme options
 */
export type BoardTheme = 'wood' | 'classic' | 'futuristic' | 'dark';

/**
 * Piece style options
 */
export type PieceStyle = 'flat' | '3d' | 'minimal';

/**
 * Board theme configuration
 */
export interface BoardThemeConfig {
  readonly id: BoardTheme;
  readonly name: string;
  readonly lightSquare: string;
  readonly darkSquare: string;
  readonly border: string;
  readonly highlight: string;
  readonly validMove: string;
}

/**
 * Piece style configuration
 */
export interface PieceStyleConfig {
  readonly id: PieceStyle;
  readonly name: string;
  readonly whitePrimary: string;
  readonly whiteSecondary: string;
  readonly blackPrimary: string;
  readonly blackSecondary: string;
  readonly use3dEffect: boolean;
}

/**
 * User preferences
 */
export interface UserPreferences {
  readonly boardTheme: BoardTheme;
  readonly pieceStyle: PieceStyle;
  readonly soundEnabled: boolean;
  readonly animationsEnabled: boolean;
  readonly showValidMoves: boolean;
  readonly showLastMove: boolean;
  readonly autoQueen: boolean;
}

/**
 * Available board themes
 */
export const BOARD_THEMES: Record<BoardTheme, BoardThemeConfig> = {
  wood: {
    id: 'wood',
    name: 'Bois',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    border: '#5d4e37',
    highlight: '#4f46e5',
    validMove: 'rgba(0, 128, 0, 0.5)',
  },
  classic: {
    id: 'classic',
    name: 'Classique',
    lightSquare: '#eeeed2',
    darkSquare: '#769656',
    border: '#4a5d23',
    highlight: '#baca44',
    validMove: 'rgba(186, 202, 68, 0.6)',
  },
  futuristic: {
    id: 'futuristic',
    name: 'Futuriste',
    lightSquare: '#1a1a2e',
    darkSquare: '#16213e',
    border: '#0f3460',
    highlight: '#e94560',
    validMove: 'rgba(233, 69, 96, 0.5)',
  },
  dark: {
    id: 'dark',
    name: 'Sombre',
    lightSquare: '#4a4a4a',
    darkSquare: '#2d2d2d',
    border: '#1a1a1a',
    highlight: '#7c3aed',
    validMove: 'rgba(124, 58, 237, 0.5)',
  },
};

/**
 * Available piece styles
 */
export const PIECE_STYLES: Record<PieceStyle, PieceStyleConfig> = {
  flat: {
    id: 'flat',
    name: '2D Plat',
    whitePrimary: '#f5f5f5',
    whiteSecondary: '#d4d4d4',
    blackPrimary: '#2d2d2d',
    blackSecondary: '#1a1a1a',
    use3dEffect: false,
  },
  '3d': {
    id: '3d',
    name: '3D Simulé',
    whitePrimary: '#f5f5f5',
    whiteSecondary: '#a3a3a3',
    blackPrimary: '#3d3d3d',
    blackSecondary: '#1a1a1a',
    use3dEffect: true,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimaliste',
    whitePrimary: '#ffffff',
    whiteSecondary: '#e5e5e5',
    blackPrimary: '#000000',
    blackSecondary: '#262626',
    use3dEffect: false,
  },
};

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  boardTheme: 'wood',
  pieceStyle: '3d',
  soundEnabled: true,
  animationsEnabled: true,
  showValidMoves: true,
  showLastMove: true,
  autoQueen: true,
};

/**
 * Creates default preferences
 */
export function createDefaultPreferences(): UserPreferences {
  return { ...DEFAULT_PREFERENCES };
}

