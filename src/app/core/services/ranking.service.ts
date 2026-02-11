import { Injectable, signal, computed, inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  UserProfile,
  RankingEntry,
  EloResult,
  createUserProfile,
  calculateElo,
  calculateWinRate,
  getRankTitle,
  getRankColor,
  DEFAULT_RATING,
} from '../models/ranking.model';
import { PlayerColor } from '../models/piece.model';
import { SupabaseService, DbUserProfile } from './supabase.service';

const PROFILE_STORAGE_KEY = 'checkers_user_profile';
const LEADERBOARD_STORAGE_KEY = 'checkers_leaderboard';

/**
 * Service for managing user rankings and profiles
 * Uses Supabase when authenticated, falls back to localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class RankingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly supabaseService = inject(SupabaseService);

  private readonly _userProfile = signal<UserProfile | null>(this.loadProfile());
  private readonly _leaderboard = signal<RankingEntry[]>(this.loadLeaderboard());
  private readonly _isOnline = signal(false);

  /** Current user profile */
  readonly userProfile = this._userProfile.asReadonly();

  /** Leaderboard entries */
  readonly leaderboard = this._leaderboard.asReadonly();

  /** Is using online mode (Supabase) */
  readonly isOnline = this._isOnline.asReadonly();

  /** Is user logged in */
  readonly isLoggedIn = computed(() => this._userProfile() !== null);

  /** Current user rating */
  readonly userRating = computed(() => this._userProfile()?.rating ?? DEFAULT_RATING);

  /** Current user rank title */
  readonly userRankTitle = computed(() => getRankTitle(this.userRating()));

  /** Current user rank color */
  readonly userRankColor = computed(() => getRankColor(this.userRating()));

  /** User win rate */
  readonly userWinRate = computed(() => {
    const profile = this._userProfile();
    if (!profile) return 0;
    return calculateWinRate(profile.wins, profile.gamesPlayed);
  });

  constructor() {
    // Watch for Supabase auth changes
    effect(() => {
      const isAuthenticated = this.supabaseService.isAuthenticated();
      this._isOnline.set(isAuthenticated);

      if (isAuthenticated) {
        this.loadProfileFromSupabase();
        this.loadLeaderboardFromSupabase();
      }
    });
  }

  /**
   * Creates or updates user profile (local only)
   */
  createProfile(username: string): UserProfile {
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const profile = createUserProfile(id, username);
    this._userProfile.set(profile);
    this.saveProfile(profile);
    this.addToLeaderboard(profile);
    return profile;
  }

  /**
   * Signs up with Supabase and creates profile
   */
  async signUp(email: string, password: string, username: string): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> {
    const { user, error, needsConfirmation } = await this.supabaseService.signUp(email, password, username);

    if (error) {
      return { success: false, error: error.message };
    }

    if (needsConfirmation) {
      return { success: true, needsConfirmation: true };
    }

    if (user) {
      await this.loadProfileFromSupabase();
      return { success: true };
    }

    return { success: false, error: 'Unknown error' };
  }

  /**
   * Signs in with Supabase
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { user, error } = await this.supabaseService.signIn(email, password);

    if (error) {
      return { success: false, error: error.message };
    }

    if (user) {
      await this.loadProfileFromSupabase();
      await this.loadLeaderboardFromSupabase();
      return { success: true };
    }

    return { success: false, error: 'Unknown error' };
  }

  /**
   * Sends password reset email
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const { success, error } = await this.supabaseService.resetPassword(email);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success };
  }

  /**
   * Resends confirmation email
   */
  async resendConfirmation(email: string): Promise<{ success: boolean; error?: string }> {
    const { success, error } = await this.supabaseService.resendConfirmationEmail(email);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success };
  }

  /**
   * Signs in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<void> {
    await this.supabaseService.signInWithProvider(provider);
  }

  /**
   * Updates display name
   */
  async updateDisplayName(displayName: string): Promise<void> {
    const profile = this._userProfile();
    if (!profile) return;

    const updated = { ...profile, displayName };
    this._userProfile.set(updated);

    if (this._isOnline()) {
      await this.supabaseService.updateUserProfile(profile.id, { display_name: displayName });
    } else {
      this.saveProfile(updated);
    }

    this.updateLeaderboardEntry(updated);
  }

  /**
   * Updates avatar
   */
  async updateAvatar(avatar: string): Promise<void> {
    const profile = this._userProfile();
    if (!profile) return;

    const updated = { ...profile, avatar };
    this._userProfile.set(updated);

    if (this._isOnline()) {
      await this.supabaseService.updateUserProfile(profile.id, { avatar_url: avatar });
    } else {
      this.saveProfile(updated);
    }

    this.updateLeaderboardEntry(updated);
  }

  /**
   * Records game result and updates ELO
   */
  async recordGameResult(
    opponentRating: number,
    playerColor: PlayerColor,
    result: 'win' | 'loss' | 'draw'
  ): Promise<EloResult | null> {
    const profile = this._userProfile();
    if (!profile) return null;

    // Calculate ELO change
    const whiteRating = playerColor === 'white' ? profile.rating : opponentRating;
    const blackRating = playerColor === 'black' ? profile.rating : opponentRating;

    let gameResult: 0 | 0.5 | 1;
    if (result === 'draw') {
      gameResult = 0.5;
    } else if (
      (result === 'win' && playerColor === 'white') ||
      (result === 'loss' && playerColor === 'black')
    ) {
      gameResult = 1;
    } else {
      gameResult = 0;
    }

    const eloResult = calculateElo(whiteRating, blackRating, gameResult);
    const newRating = playerColor === 'white' ? eloResult.newWhiteRating : eloResult.newBlackRating;

    // Update profile
    const newWinStreak = result === 'win' ? profile.winStreak + 1 : 0;
    const updated: UserProfile = {
      ...profile,
      rating: newRating,
      gamesPlayed: profile.gamesPlayed + 1,
      wins: profile.wins + (result === 'win' ? 1 : 0),
      losses: profile.losses + (result === 'loss' ? 1 : 0),
      draws: profile.draws + (result === 'draw' ? 1 : 0),
      winStreak: newWinStreak,
      bestWinStreak: Math.max(profile.bestWinStreak, newWinStreak),
      lastPlayedAt: new Date().toISOString(),
    };

    this._userProfile.set(updated);

    if (this._isOnline()) {
      await this.supabaseService.updateUserRating(profile.id, newRating, result);
    } else {
      this.saveProfile(updated);
    }

    this.updateLeaderboardEntry(updated);

    return eloResult;
  }

  /**
   * Gets matchmaking rating range
   */
  getMatchmakingRange(preferredRange: number = 200): { min: number; max: number } {
    const rating = this.userRating();
    return {
      min: Math.max(100, rating - preferredRange),
      max: rating + preferredRange,
    };
  }

  /**
   * Checks if opponent is in acceptable rating range
   */
  isInMatchmakingRange(opponentRating: number, range: number = 200): boolean {
    const { min, max } = this.getMatchmakingRange(range);
    return opponentRating >= min && opponentRating <= max;
  }

  /**
   * Gets rank info for a rating
   */
  getRankInfo(rating: number): { title: string; color: string } {
    return {
      title: getRankTitle(rating),
      color: getRankColor(rating),
    };
  }

  /**
   * Logs out current user
   */
  /**
   * Logs out current user
   */
  async logout(): Promise<void> {
    if (this._isOnline()) {
      await this.supabaseService.signOut();
    }

    this._userProfile.set(null);
    this._isOnline.set(false);

    if (this.isBrowser) {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  }

  /**
   * Loads profile from Supabase
   */
  private async loadProfileFromSupabase(): Promise<void> {
    const dbProfile = await this.supabaseService.getCurrentUserProfile();
    if (dbProfile) {
      const profile = this.dbProfileToUserProfile(dbProfile);
      this._userProfile.set(profile);
    }
  }

  /**
   * Loads leaderboard from Supabase
   */
  private async loadLeaderboardFromSupabase(): Promise<void> {
    const dbProfiles = await this.supabaseService.getLeaderboard(100);
    const entries: RankingEntry[] = dbProfiles.map((p, index) => ({
      rank: index + 1,
      userId: p.id,
      username: p.username,
      displayName: p.display_name,
      avatar: p.avatar_url,
      rating: p.rating,
      gamesPlayed: p.games_played,
      winRate: calculateWinRate(p.wins, p.games_played),
    }));
    this._leaderboard.set(entries);
  }

  /**
   * Converts DB profile to UserProfile
   */
  private dbProfileToUserProfile(db: DbUserProfile): UserProfile {
    return {
      id: db.id,
      username: db.username,
      displayName: db.display_name,
      avatar: db.avatar_url,
      rating: db.rating,
      gamesPlayed: db.games_played,
      wins: db.wins,
      losses: db.losses,
      draws: db.draws,
      winStreak: db.win_streak,
      bestWinStreak: db.best_win_streak,
      createdAt: db.created_at,
      lastPlayedAt: db.last_played_at,
    };
  }

  private loadProfile(): UserProfile | null {
    if (!this.isBrowser) return null;

    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      console.warn('Failed to load user profile');
    }
    return null;
  }

  private saveProfile(profile: UserProfile): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      console.warn('Failed to save user profile');
    }
  }

  private loadLeaderboard(): RankingEntry[] {
    if (!this.isBrowser) return [];

    try {
      const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      console.warn('Failed to load leaderboard');
    }
    return [];
  }

  private saveLeaderboard(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(this._leaderboard()));
    } catch {
      console.warn('Failed to save leaderboard');
    }
  }

  private addToLeaderboard(profile: UserProfile): void {
    const entry: RankingEntry = {
      rank: 0,
      userId: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      rating: profile.rating,
      gamesPlayed: profile.gamesPlayed,
      winRate: calculateWinRate(profile.wins, profile.gamesPlayed),
    };

    this._leaderboard.update(board => {
      const filtered = board.filter(e => e.userId !== profile.id);
      const updated = [...filtered, entry]
        .sort((a, b) => b.rating - a.rating)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      return updated;
    });

    this.saveLeaderboard();
  }

  private updateLeaderboardEntry(profile: UserProfile): void {
    this._leaderboard.update(board => {
      return board
        .map(e =>
          e.userId === profile.id
            ? {
                ...e,
                displayName: profile.displayName,
                avatar: profile.avatar,
                rating: profile.rating,
                gamesPlayed: profile.gamesPlayed,
                winRate: calculateWinRate(profile.wins, profile.gamesPlayed),
              }
            : e
        )
        .sort((a, b) => b.rating - a.rating)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    });

    this.saveLeaderboard();
  }
}

