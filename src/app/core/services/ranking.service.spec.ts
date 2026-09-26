import { TestBed } from '@angular/core/testing';
import { RankingService } from './ranking.service';
import { SupabaseService } from './supabase.service';
import { DEFAULT_RATING } from '../models/ranking.model';

// SupabaseService creates a real client and hits the network from its
// constructor when running in a browser context - always mock it here.
function mockSupabaseService(isAuthenticated = false) {
  return {
    isAuthenticated: () => isAuthenticated,
    signUp: vi.fn(),
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmationEmail: vi.fn(),
    signInWithProvider: vi.fn(),
    updateUserProfile: vi.fn(),
    recordGameResult: vi.fn(),
    getCurrentUserProfile: vi.fn(),
    getLeaderboard: vi.fn(),
    signOut: vi.fn(),
  };
}

describe('RankingService', () => {
  let service: RankingService;
  let supabase: ReturnType<typeof mockSupabaseService>;

  beforeEach(() => {
    supabase = mockSupabaseService();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: supabase }],
    });
    service = TestBed.inject(RankingService);
  });

  it('starts logged out with the default rating', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.userRating()).toBe(DEFAULT_RATING);
    expect(service.userRankTitle()).toBe('Amateur');
  });

  it('createProfile logs the user in and adds them to the leaderboard as rank 1', () => {
    const profile = service.createProfile('alice');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.userProfile()).toEqual(profile);
    expect(service.leaderboard()).toHaveLength(1);
    expect(service.leaderboard()[0]).toMatchObject({ userId: profile.id, rank: 1, username: 'alice' });
  });

  describe('recordGameResult', () => {
    it('returns null when there is no active profile', async () => {
      const result = await service.recordGameResult(1200, 'white', 'win');
      expect(result).toBeNull();
    });

    it('increases rating and win streak on a win', async () => {
      service.createProfile('alice');
      const before = service.userRating();

      const eloResult = await service.recordGameResult(1200, 'white', 'win');

      expect(eloResult).not.toBeNull();
      expect(service.userRating()).toBeGreaterThan(before);
      expect(service.userProfile()!.wins).toBe(1);
      expect(service.userProfile()!.gamesPlayed).toBe(1);
      expect(service.userProfile()!.winStreak).toBe(1);
      expect(service.userProfile()!.bestWinStreak).toBe(1);
    });

    it('resets the win streak on a loss but keeps the best streak recorded', async () => {
      service.createProfile('alice');
      await service.recordGameResult(1200, 'white', 'win');
      await service.recordGameResult(1200, 'white', 'loss');

      expect(service.userProfile()!.winStreak).toBe(0);
      expect(service.userProfile()!.bestWinStreak).toBe(1);
      expect(service.userProfile()!.losses).toBe(1);
    });

    it('a draw increments draws and does not change rank title thresholds unexpectedly', async () => {
      service.createProfile('alice');
      await service.recordGameResult(1200, 'white', 'draw');
      expect(service.userProfile()!.draws).toBe(1);
      expect(service.userProfile()!.winStreak).toBe(0);
    });

    it('updates the leaderboard entry for the current user', async () => {
      service.createProfile('alice');
      await service.recordGameResult(1200, 'white', 'win');
      const entry = service.leaderboard().find((e) => e.userId === service.userProfile()!.id);
      expect(entry?.rating).toBe(service.userProfile()!.rating);
      expect(entry?.gamesPlayed).toBe(1);
    });
  });

  describe('matchmaking helpers', () => {
    it('getMatchmakingRange centers on the current rating', () => {
      const range = service.getMatchmakingRange(150);
      expect(range).toEqual({ min: DEFAULT_RATING - 150, max: DEFAULT_RATING + 150 });
    });

    it('getMatchmakingRange floors the minimum at 100', () => {
      service.createProfile('alice');
      const range = service.getMatchmakingRange(5000);
      expect(range.min).toBe(100);
    });

    it('isInMatchmakingRange reflects whether an opponent rating is within range', () => {
      expect(service.isInMatchmakingRange(DEFAULT_RATING + 50, 100)).toBe(true);
      expect(service.isInMatchmakingRange(DEFAULT_RATING + 500, 100)).toBe(false);
    });
  });

  it('getRankInfo returns the title and color for an arbitrary rating', () => {
    expect(service.getRankInfo(2500)).toEqual({ title: 'Grand Maître', color: '#ffd700' });
  });

  describe('updateDisplayName / updateAvatar (offline)', () => {
    it('updates the profile display name locally when not online', async () => {
      service.createProfile('alice');
      await service.updateDisplayName('Alice B.');
      expect(service.userProfile()!.displayName).toBe('Alice B.');
      expect(supabase.updateUserProfile).not.toHaveBeenCalled();
    });

    it('is a no-op when there is no profile', async () => {
      await service.updateDisplayName('nobody');
      expect(service.userProfile()).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears the local profile without calling supabase signOut when offline', async () => {
      service.createProfile('alice');
      await service.logout();
      expect(service.userProfile()).toBeNull();
      expect(supabase.signOut).not.toHaveBeenCalled();
    });
  });
});
