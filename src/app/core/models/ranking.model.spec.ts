import {
  createUserProfile,
  calculateExpectedScore,
  calculateElo,
  getRankTitle,
  getRankColor,
  calculateWinRate,
  DEFAULT_RATING,
} from './ranking.model';

describe('ranking.model', () => {
  it('creates a fresh profile at the default rating with zeroed stats', () => {
    const profile = createUserProfile('u1', 'sami');
    expect(profile.rating).toBe(DEFAULT_RATING);
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.wins).toBe(0);
    expect(profile.username).toBe('sami');
  });

  describe('calculateExpectedScore', () => {
    it('gives 0.5 for equal ratings', () => {
      expect(calculateExpectedScore(1200, 1200)).toBeCloseTo(0.5);
    });

    it('favors the higher-rated player', () => {
      expect(calculateExpectedScore(1600, 1200)).toBeGreaterThan(0.5);
      expect(calculateExpectedScore(1200, 1600)).toBeLessThan(0.5);
    });
  });

  describe('calculateElo', () => {
    it('rewards the winner and penalizes the loser symmetrically for equal ratings', () => {
      const result = calculateElo(1200, 1200, 1);
      expect(result.whiteChange).toBeGreaterThan(0);
      expect(result.blackChange).toBeLessThan(0);
      expect(result.newWhiteRating).toBe(1200 + result.whiteChange);
      expect(result.newBlackRating).toBe(1200 + result.blackChange);
    });

    it('leaves ratings unchanged on a draw between equals', () => {
      const result = calculateElo(1200, 1200, 0.5);
      expect(result.whiteChange).toBe(0);
      expect(result.blackChange).toBe(0);
    });

    it('never drops a rating below the 100 floor', () => {
      const result = calculateElo(110, 2000, 0);
      expect(result.newWhiteRating).toBeGreaterThanOrEqual(100);
    });
  });

  describe('getRankTitle', () => {
    it('maps rating thresholds to titles', () => {
      expect(getRankTitle(2500)).toBe('Grand Maître');
      expect(getRankTitle(1200)).toBe('Amateur');
      expect(getRankTitle(0)).toBe('Débutant');
    });
  });

  describe('getRankColor', () => {
    it('returns gold for the top tier and gray for the bottom', () => {
      expect(getRankColor(2500)).toBe('#ffd700');
      expect(getRankColor(0)).toBe('#6b7280');
    });
  });

  describe('calculateWinRate', () => {
    it('returns 0 when no games have been played', () => {
      expect(calculateWinRate(0, 0)).toBe(0);
    });

    it('rounds to the nearest percent', () => {
      expect(calculateWinRate(1, 3)).toBe(33);
      expect(calculateWinRate(2, 4)).toBe(50);
    });
  });
});
