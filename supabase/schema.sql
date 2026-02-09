-- =============================================
-- Supabase Database Schema for Angular Checkers Master
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- User Profiles Table
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER DEFAULT 1200 NOT NULL,
  games_played INTEGER DEFAULT 0 NOT NULL,
  wins INTEGER DEFAULT 0 NOT NULL,
  losses INTEGER DEFAULT 0 NOT NULL,
  draws INTEGER DEFAULT 0 NOT NULL,
  win_streak INTEGER DEFAULT 0 NOT NULL,
  best_win_streak INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_played_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_rating ON user_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- Game History Table
-- =============================================
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  white_player_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  black_player_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  white_player_name TEXT NOT NULL,
  black_player_name TEXT NOT NULL,
  winner TEXT CHECK (winner IN ('white', 'black', 'draw')),
  reason TEXT,
  variant TEXT DEFAULT 'Dames Internationales' NOT NULL,
  total_moves INTEGER DEFAULT 0 NOT NULL,
  duration INTEGER DEFAULT 0 NOT NULL, -- in seconds
  moves_json JSONB NOT NULL,
  material_history_json JSONB NOT NULL,
  white_rating_before INTEGER NOT NULL,
  black_rating_before INTEGER NOT NULL,
  white_rating_after INTEGER NOT NULL,
  black_rating_after INTEGER NOT NULL,
  played_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for game history queries
CREATE INDEX IF NOT EXISTS idx_game_history_white_player ON game_history(white_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_black_player ON game_history(black_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_played_at ON game_history(played_at DESC);

-- Enable Row Level Security
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Policies for game_history
CREATE POLICY "Anyone can view game history"
  ON game_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert games"
  ON game_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- Global Statistics View
-- =============================================
CREATE OR REPLACE VIEW global_stats AS
SELECT
  COUNT(*) AS total_games,
  (SELECT COUNT(*) FROM user_profiles) AS total_players,
  COALESCE(SUM(total_moves), 0) AS total_moves,
  COALESCE(AVG(duration), 0) AS avg_game_duration,
  (
    SELECT variant
    FROM game_history
    GROUP BY variant
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS most_popular_variant,
  COALESCE(
    COUNT(CASE WHEN winner = 'white' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    0
  ) AS white_wins_percentage,
  COALESCE(
    COUNT(CASE WHEN winner = 'black' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    0
  ) AS black_wins_percentage,
  COALESCE(
    COUNT(CASE WHEN winner = 'draw' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
    0
  ) AS draws_percentage
FROM game_history;

-- =============================================
-- Function to automatically create user profile
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Function to get user rank
-- =============================================
CREATE OR REPLACE FUNCTION get_user_rank(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_rating INTEGER;
  rank_position INTEGER;
BEGIN
  SELECT rating INTO user_rating FROM user_profiles WHERE id = user_id;

  IF user_rating IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) + 1 INTO rank_position
  FROM user_profiles
  WHERE rating > user_rating;

  RETURN rank_position;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Sample data for testing (optional)
-- =============================================
-- Uncomment below to insert test data

/*
INSERT INTO user_profiles (id, username, display_name, rating, games_played, wins, losses, draws)
VALUES
  (uuid_generate_v4(), 'testuser1', 'Test User 1', 1450, 25, 15, 8, 2),
  (uuid_generate_v4(), 'testuser2', 'Test User 2', 1320, 18, 9, 7, 2),
  (uuid_generate_v4(), 'testuser3', 'Test User 3', 1550, 42, 28, 12, 2);
*/

