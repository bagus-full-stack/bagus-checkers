import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Database types for Supabase
 */
export interface DbUserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_streak: number;
  best_win_streak: number;
  created_at: string;
  last_played_at: string;
}

export interface DbGameHistory {
  id: string;
  white_player_id: string;
  black_player_id: string;
  white_player_name: string;
  black_player_name: string;
  winner: 'white' | 'black' | 'draw' | null;
  reason?: string;
  variant: string;
  total_moves: number;
  duration: number;
  moves_json: string;
  material_history_json: string;
  white_rating_before: number;
  black_rating_before: number;
  white_rating_after: number;
  black_rating_after: number;
  played_at: string;
}

export interface DbGlobalStats {
  total_games: number;
  total_players: number;
  total_moves: number;
  avg_game_duration: number;
  most_popular_variant: string;
  white_wins_percentage: number;
  black_wins_percentage: number;
  draws_percentage: number;
}

/**
 * Service for Supabase database operations
 */
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private supabase: SupabaseClient | null = null;

  private readonly _currentUser = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);
  private readonly _isLoading = signal(true);

  /** Current authenticated user */
  readonly currentUser = this._currentUser.asReadonly();

  /** Current session */
  readonly session = this._session.asReadonly();

  /** Is user authenticated */
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /** Is loading */
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    if (this.isBrowser) {
      this.initSupabase();
    }
  }

  private async initSupabase(): Promise<void> {
    try {
      this.supabase = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
        }
      );

      // Get initial session
      const { data: { session } } = await this.supabase.auth.getSession();
      this._session.set(session);
      this._currentUser.set(session?.user ?? null);

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange((event, session) => {
        this._session.set(session);
        this._currentUser.set(session?.user ?? null);
      });
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Gets the Supabase client
   */
  getClient(): SupabaseClient | null {
    return this.supabase;
  }

  // ==================== Authentication ====================

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, username: string): Promise<{ user: User | null; error: Error | null }> {
    if (!this.supabase) return { user: null, error: new Error('Supabase not initialized') };

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (data.user && !error) {
      // Create user profile
      await this.createUserProfile(data.user.id, username);
    }

    return { user: data.user, error: error as Error | null };
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    if (!this.supabase) return { user: null, error: new Error('Supabase not initialized') };

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { user: data.user, error: error as Error | null };
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<void> {
    if (!this.supabase) return;

    await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
  }

  // ==================== User Profiles ====================

  /**
   * Creates a new user profile
   */
  async createUserProfile(userId: string, username: string): Promise<DbUserProfile | null> {
    if (!this.supabase) return null;

    const now = new Date().toISOString();
    const profile: Omit<DbUserProfile, 'id'> & { id: string } = {
      id: userId,
      username,
      display_name: username,
      rating: 1200,
      games_played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      win_streak: 0,
      best_win_streak: 0,
      created_at: now,
      last_played_at: now,
    };

    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Gets a user profile by ID
   */
  async getUserProfile(userId: string): Promise<DbUserProfile | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Gets current user's profile
   */
  async getCurrentUserProfile(): Promise<DbUserProfile | null> {
    const user = this._currentUser();
    if (!user) return null;
    return this.getUserProfile(user.id);
  }

  /**
   * Updates a user profile
   */
  async updateUserProfile(userId: string, updates: Partial<DbUserProfile>): Promise<DbUserProfile | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Updates user rating after a game
   */
  async updateUserRating(
    userId: string,
    newRating: number,
    result: 'win' | 'loss' | 'draw'
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const updates: Partial<DbUserProfile> = {
      rating: newRating,
      games_played: profile.games_played + 1,
      last_played_at: new Date().toISOString(),
    };

    if (result === 'win') {
      updates.wins = profile.wins + 1;
      updates.win_streak = profile.win_streak + 1;
      updates.best_win_streak = Math.max(profile.best_win_streak, updates.win_streak);
    } else if (result === 'loss') {
      updates.losses = profile.losses + 1;
      updates.win_streak = 0;
    } else {
      updates.draws = profile.draws + 1;
      updates.win_streak = 0;
    }

    await this.updateUserProfile(userId, updates);
  }

  // ==================== Leaderboard ====================

  /**
   * Gets the leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<DbUserProfile[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data ?? [];
  }

  /**
   * Gets user rank in leaderboard
   */
  async getUserRank(userId: string): Promise<number | null> {
    if (!this.supabase) return null;

    const profile = await this.getUserProfile(userId);
    if (!profile) return null;

    const { count, error } = await this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gt('rating', profile.rating);

    if (error) {
      console.error('Error fetching rank:', error);
      return null;
    }

    return (count ?? 0) + 1;
  }

  // ==================== Game History ====================

  /**
   * Saves a game to history
   */
  async saveGameHistory(game: Omit<DbGameHistory, 'id' | 'played_at'>): Promise<DbGameHistory | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('game_history')
      .insert({
        ...game,
        played_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving game:', error);
      return null;
    }

    return data;
  }

  /**
   * Gets game history for a user
   */
  async getUserGameHistory(userId: string, limit: number = 50): Promise<DbGameHistory[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('game_history')
      .select('*')
      .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
      .order('played_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching game history:', error);
      return [];
    }

    return data ?? [];
  }

  /**
   * Gets a specific game by ID
   */
  async getGameById(gameId: string): Promise<DbGameHistory | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('game_history')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Error fetching game:', error);
      return null;
    }

    return data;
  }

  /**
   * Gets recent games (global)
   */
  async getRecentGames(limit: number = 20): Promise<DbGameHistory[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('game_history')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent games:', error);
      return [];
    }

    return data ?? [];
  }

  // ==================== Global Statistics ====================

  /**
   * Gets global statistics
   */
  async getGlobalStats(): Promise<DbGlobalStats | null> {
    if (!this.supabase) return null;

    try {
      // Get total players
      const { count: totalPlayers } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get game statistics
      const { data: games } = await this.supabase
        .from('game_history')
        .select('winner, total_moves, duration, variant');

      if (!games) return null;

      const totalGames = games.length;
      const totalMoves = games.reduce((sum, g) => sum + g.total_moves, 0);
      const avgDuration = totalGames > 0
        ? games.reduce((sum, g) => sum + g.duration, 0) / totalGames
        : 0;

      const whiteWins = games.filter(g => g.winner === 'white').length;
      const blackWins = games.filter(g => g.winner === 'black').length;
      const draws = games.filter(g => g.winner === 'draw').length;

      // Find most popular variant
      const variantCounts: Record<string, number> = {};
      games.forEach(g => {
        variantCounts[g.variant] = (variantCounts[g.variant] || 0) + 1;
      });
      const mostPopularVariant = Object.entries(variantCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Dames Internationales';

      return {
        total_games: totalGames,
        total_players: totalPlayers ?? 0,
        total_moves: totalMoves,
        avg_game_duration: avgDuration,
        most_popular_variant: mostPopularVariant,
        white_wins_percentage: totalGames > 0 ? (whiteWins / totalGames) * 100 : 0,
        black_wins_percentage: totalGames > 0 ? (blackWins / totalGames) * 100 : 0,
        draws_percentage: totalGames > 0 ? (draws / totalGames) * 100 : 0,
      };
    } catch (error) {
      console.error('Error fetching global stats:', error);
      return null;
    }
  }

  // ==================== Search ====================

  /**
   * Search users by username
   */
  async searchUsers(query: string, limit: number = 10): Promise<DbUserProfile[]> {
    if (!this.supabase || !query.trim()) return [];

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data ?? [];
  }
}

