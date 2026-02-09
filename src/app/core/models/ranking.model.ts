/**
 * User profile
 */
export interface UserProfile {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatar?: string;
  readonly rating: number;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winStreak: number;
  readonly bestWinStreak: number;
  readonly createdAt: string;
  readonly lastPlayedAt: string;
}

/**
 * Ranking entry for leaderboard
 */
export interface RankingEntry {
  readonly rank: number;
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatar?: string;
  readonly rating: number;
  readonly gamesPlayed: number;
  readonly winRate: number;
}

/**
 * ELO calculation result
 */
export interface EloResult {
  readonly newWhiteRating: number;
  readonly newBlackRating: number;
  readonly whiteChange: number;
  readonly blackChange: number;
}

/**
 * Matchmaking preferences
 */
export interface MatchmakingPreferences {
  readonly ratingRange: number; // +/- from current rating
  readonly preferSameLevel: boolean;
}

/**
 * Default starting ELO rating
 */
export const DEFAULT_RATING = 1200;

/**
 * K-factor for ELO calculation (higher = more volatile)
 */
export const K_FACTOR = 32;

/**
 * Creates a new user profile
 */
export function createUserProfile(id: string, username: string): UserProfile {
  const now = new Date().toISOString();
  return {
    id,
    username,
    displayName: username,
    rating: DEFAULT_RATING,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    bestWinStreak: 0,
    createdAt: now,
    lastPlayedAt: now,
  };
}

/**
 * Calculates expected score based on ratings
 */
export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculates new ELO ratings after a game
 * @param whiteRating - White player's current rating
 * @param blackRating - Black player's current rating
 * @param result - 1 = white wins, 0 = black wins, 0.5 = draw
 */
export function calculateElo(
  whiteRating: number,
  blackRating: number,
  result: 0 | 0.5 | 1
): EloResult {
  const expectedWhite = calculateExpectedScore(whiteRating, blackRating);
  const expectedBlack = 1 - expectedWhite;

  const whiteChange = Math.round(K_FACTOR * (result - expectedWhite));
  const blackChange = Math.round(K_FACTOR * ((1 - result) - expectedBlack));

  return {
    newWhiteRating: Math.max(100, whiteRating + whiteChange),
    newBlackRating: Math.max(100, blackRating + blackChange),
    whiteChange,
    blackChange,
  };
}

/**
 * Gets rank title based on rating
 */
export function getRankTitle(rating: number): string {
  if (rating >= 2400) return 'Grand Maître';
  if (rating >= 2200) return 'Maître International';
  if (rating >= 2000) return 'Maître';
  if (rating >= 1800) return 'Expert';
  if (rating >= 1600) return 'Avancé';
  if (rating >= 1400) return 'Intermédiaire';
  if (rating >= 1200) return 'Amateur';
  return 'Débutant';
}

/**
 * Gets rank color based on rating
 */
export function getRankColor(rating: number): string {
  if (rating >= 2400) return '#ffd700'; // Gold
  if (rating >= 2200) return '#c0c0c0'; // Silver
  if (rating >= 2000) return '#cd7f32'; // Bronze
  if (rating >= 1800) return '#9333ea'; // Purple
  if (rating >= 1600) return '#3b82f6'; // Blue
  if (rating >= 1400) return '#22c55e'; // Green
  if (rating >= 1200) return '#eab308'; // Yellow
  return '#6b7280'; // Gray
}

/**
 * Calculates win rate percentage
 */
export function calculateWinRate(wins: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((wins / gamesPlayed) * 100);
}

