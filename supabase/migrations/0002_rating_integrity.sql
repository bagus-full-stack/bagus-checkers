-- =============================================
-- Anti-cheat: rating/history can only change through record_game_result()
-- =============================================
-- Without this, any authenticated client can call
-- `.from('user_profiles').update({ rating: 9999 })` directly with the public
-- anon key (RLS only checks auth.uid() = id, not which columns changed) and
-- forge an arbitrary leaderboard position or game history entry.

-- Block direct client writes to the columns that define a player's rank.
-- Profile edits like display_name/avatar_url are untouched.
REVOKE UPDATE (rating, games_played, wins, losses, draws, win_streak, best_win_streak)
  ON user_profiles FROM authenticated;

-- game_history rows are only ever written by record_game_result() below.
DROP POLICY IF EXISTS "Authenticated users can insert games" ON game_history;

-- Recomputes ELO server-side from the ratings actually stored in the DB
-- (never trusting numbers the client sends) and applies both players' updates
-- and the history row atomically. `p_result` is from the caller's perspective.
CREATE OR REPLACE FUNCTION record_game_result(
  p_opponent_id uuid,
  p_my_color text,
  p_result text,
  p_variant text,
  p_total_moves integer,
  p_duration integer,
  p_moves_json jsonb,
  p_material_history_json jsonb
) RETURNS TABLE (new_rating integer, rating_change integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_my_rating integer;
  v_opp_rating integer;
  v_score numeric;
  v_expected numeric;
  v_new_my_rating integer;
  v_new_opp_rating integer;
  v_k constant integer := 32; -- keep in sync with K_FACTOR in ranking.model.ts
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_me = p_opponent_id THEN
    RAISE EXCEPTION 'Cannot record a game against yourself';
  END IF;
  IF p_result NOT IN ('win', 'loss', 'draw') THEN
    RAISE EXCEPTION 'Invalid result';
  END IF;
  IF p_my_color NOT IN ('white', 'black') THEN
    RAISE EXCEPTION 'Invalid color';
  END IF;

  SELECT rating INTO v_my_rating FROM user_profiles WHERE id = v_me FOR UPDATE;
  SELECT rating INTO v_opp_rating FROM user_profiles WHERE id = p_opponent_id FOR UPDATE;
  IF v_my_rating IS NULL OR v_opp_rating IS NULL THEN
    RAISE EXCEPTION 'Unknown player';
  END IF;

  v_score := CASE p_result WHEN 'win' THEN 1 WHEN 'draw' THEN 0.5 ELSE 0 END;
  v_expected := 1.0 / (1.0 + power(10, (v_opp_rating - v_my_rating) / 400.0));
  v_new_my_rating := GREATEST(100, ROUND(v_my_rating + v_k * (v_score - v_expected)));
  v_new_opp_rating := GREATEST(100, ROUND(v_opp_rating + v_k * ((1 - v_score) - (1 - v_expected))));

  UPDATE user_profiles SET
    rating = v_new_my_rating,
    games_played = games_played + 1,
    wins = wins + (p_result = 'win')::int,
    losses = losses + (p_result = 'loss')::int,
    draws = draws + (p_result = 'draw')::int,
    win_streak = CASE WHEN p_result = 'win' THEN win_streak + 1 ELSE 0 END,
    best_win_streak = GREATEST(best_win_streak, CASE WHEN p_result = 'win' THEN win_streak + 1 ELSE 0 END),
    last_played_at = now()
  WHERE id = v_me;

  UPDATE user_profiles SET
    rating = v_new_opp_rating,
    games_played = games_played + 1,
    wins = wins + (p_result = 'loss')::int,
    losses = losses + (p_result = 'win')::int,
    draws = draws + (p_result = 'draw')::int,
    win_streak = CASE WHEN p_result = 'loss' THEN win_streak + 1 ELSE 0 END,
    best_win_streak = GREATEST(best_win_streak, CASE WHEN p_result = 'loss' THEN win_streak + 1 ELSE 0 END),
    last_played_at = now()
  WHERE id = p_opponent_id;

  INSERT INTO game_history (
    white_player_id, black_player_id, white_player_name, black_player_name,
    winner, variant, total_moves, duration, moves_json, material_history_json,
    white_rating_before, black_rating_before, white_rating_after, black_rating_after
  )
  SELECT
    CASE WHEN p_my_color = 'white' THEN v_me ELSE p_opponent_id END,
    CASE WHEN p_my_color = 'white' THEN p_opponent_id ELSE v_me END,
    (SELECT display_name FROM user_profiles WHERE id = CASE WHEN p_my_color = 'white' THEN v_me ELSE p_opponent_id END),
    (SELECT display_name FROM user_profiles WHERE id = CASE WHEN p_my_color = 'white' THEN p_opponent_id ELSE v_me END),
    CASE p_result
      WHEN 'draw' THEN 'draw'
      WHEN 'win' THEN p_my_color
      ELSE (CASE WHEN p_my_color = 'white' THEN 'black' ELSE 'white' END)
    END,
    p_variant, p_total_moves, p_duration, p_moves_json, p_material_history_json,
    CASE WHEN p_my_color = 'white' THEN v_my_rating ELSE v_opp_rating END,
    CASE WHEN p_my_color = 'white' THEN v_opp_rating ELSE v_my_rating END,
    CASE WHEN p_my_color = 'white' THEN v_new_my_rating ELSE v_new_opp_rating END,
    CASE WHEN p_my_color = 'white' THEN v_new_opp_rating ELSE v_new_my_rating END;

  RETURN QUERY SELECT v_new_my_rating, v_new_my_rating - v_my_rating;
END;
$$;

GRANT EXECUTE ON FUNCTION record_game_result TO authenticated;
