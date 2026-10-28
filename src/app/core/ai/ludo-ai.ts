import { PlayerColor } from '../models/piece.model';
import {
  LudoGameState,
  LUDO_SAFE_INDICES,
  LUDO_START_INDEX,
  LUDO_TOTAL_STEPS,
  LUDO_TRACK_LENGTH,
} from '../models/ludo.model';

/**
 * Ludo AI, with the same five levels as the draughts AI. Ludo has a die, so the
 * tree searches are expectimax: a "chance" layer averages the six faces (1/6 each)
 * between the decision layers.
 *   easy   - random move, captures first (as in draughts)
 *   medium - search 3 plies deep (draughts: minimax depth 3)
 *   hard   - search 5 plies, transposition table + node budget (draughts: alpha-beta + TT, depth 5)
 *   expert - search 7 plies, bigger budget (draughts: depth 7)
 *   master - Monte-Carlo playouts (draughts: MCTS)
 * Budgets count search nodes, not milliseconds, so a level always plays the same way on any machine.
 */
export type LudoAiLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

/** Compact game state for the search: steps per token (-1 in the yard, 0..57 on the way, 57 finished). */
interface Sim {
  steps: readonly number[];
  turn: number; // seat index
  sixes: number; // consecutive sixes before the next roll
}

interface Ctx {
  owner: number[]; // seat index of each token
  start: number[]; // entry square (global track index) of each seat
  seats: number;
  root: number;
  tt: Map<string, number>;
  nodes: number;
  budget: number;
}

const FINISHED = LUDO_TOTAL_STEPS;
const TRACK = LUDO_TRACK_LENGTH;
const WIN = 1e5;
const NODE_BUDGET: Record<'hard' | 'expert', number> = { hard: 150_000, expert: 600_000 };
const PLAYOUTS = 2400;
const MAX_PLAYOUT_PLIES = 250;

function globalIndex(ctx: Ctx, seat: number, steps: number): number {
  return (ctx.start[seat] + steps) % TRACK;
}

function legalMoves(ctx: Ctx, st: Sim, roll: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < st.steps.length; i++) {
    if (ctx.owner[i] !== st.turn) continue;
    const s = st.steps[i];
    if (s === FINISHED) continue;
    if (s < 0 ? roll === 6 : s + roll <= FINISHED) out.push(i);
  }
  return out;
}

/** Plays `piece` (or nothing, -1) for `roll`, captures, and hands the turn over like the real rules. */
function play(ctx: Ctx, st: Sim, roll: number, piece: number): Sim {
  const steps = st.steps.slice();
  const sixes = roll === 6 ? st.sixes + 1 : 0;
  if (piece >= 0) {
    const n = steps[piece] < 0 ? 0 : steps[piece] + roll;
    steps[piece] = n;
    if (n < TRACK) {
      const g = globalIndex(ctx, st.turn, n);
      if (!LUDO_SAFE_INDICES.has(g)) {
        for (let j = 0; j < steps.length; j++) {
          if (ctx.owner[j] !== st.turn && steps[j] >= 0 && steps[j] < TRACK && globalIndex(ctx, ctx.owner[j], steps[j]) === g) steps[j] = -1;
        }
      }
    }
  }
  const again = roll === 6 && sixes < 3;
  return { steps, turn: again ? st.turn : (st.turn + 1) % ctx.seats, sixes: again ? sixes : 0 };
}

function winner(ctx: Ctx, st: Sim): number {
  const done = new Array(ctx.seats).fill(0);
  for (let i = 0; i < st.steps.length; i++) if (st.steps[i] === FINISHED) done[ctx.owner[i]]++;
  return done.findIndex((n) => n === 4);
}

/** Progress of one seat; tokens a rival can hit on the next roll are worth less. */
function seatScore(ctx: Ctx, st: Sim, seat: number): number {
  let score = 0;
  for (let i = 0; i < st.steps.length; i++) {
    if (ctx.owner[i] !== seat) continue;
    const s = st.steps[i];
    if (s < 0) continue;
    if (s === FINISHED) { score += 90; continue; }
    let value = s + 12;
    if (s < TRACK) {
      const g = globalIndex(ctx, seat, s);
      if (!LUDO_SAFE_INDICES.has(g)) {
        for (let j = 0; j < st.steps.length; j++) {
          const e = st.steps[j];
          if (ctx.owner[j] === seat || e < 0 || e >= TRACK) continue;
          const gap = (g - globalIndex(ctx, ctx.owner[j], e) + TRACK) % TRACK;
          if (gap >= 1 && gap <= 6) { value -= 0.3 * (s + 12); break; }
        }
      }
    }
    score += value;
  }
  return score;
}

function evaluate(ctx: Ctx, st: Sim): number {
  const w = winner(ctx, st);
  if (w >= 0) return w === ctx.root ? WIN : -WIN;
  let others = 0;
  for (let s = 0; s < ctx.seats; s++) if (s !== ctx.root) others += seatScore(ctx, st, s);
  return seatScore(ctx, st, ctx.root) - others / Math.max(1, ctx.seats - 1);
}

/** Expectimax value of `st` for the root seat: max on its turns, min on rivals', average over the die. */
function expectimax(ctx: Ctx, st: Sim, depth: number): number {
  const w = winner(ctx, st);
  if (w >= 0) return w === ctx.root ? WIN : -WIN;
  if (depth === 0 || ctx.nodes >= ctx.budget) return evaluate(ctx, st);
  ctx.nodes++;

  const key = `${st.steps.join(',')}|${st.turn}|${st.sixes}|${depth}`;
  const cached = ctx.tt.get(key);
  if (cached !== undefined) return cached;

  const maximizing = st.turn === ctx.root;
  let total = 0;
  for (let roll = 1; roll <= 6; roll++) {
    const moves = legalMoves(ctx, st, roll);
    if (moves.length === 0) {
      total += expectimax(ctx, play(ctx, st, roll, -1), depth - 1) / 6;
      continue;
    }
    let best = maximizing ? -Infinity : Infinity;
    for (const m of moves) {
      const v = expectimax(ctx, play(ctx, st, roll, m), depth - 1);
      best = maximizing ? Math.max(best, v) : Math.min(best, v);
    }
    total += best / 6;
  }
  if (ctx.nodes < ctx.budget) ctx.tt.set(key, total);
  return total;
}

function rankMoves(ctx: Ctx, st: Sim, roll: number, moves: number[], depth: number): number {
  let best = moves[0];
  let bestValue = -Infinity;
  for (const m of moves) {
    const v = expectimax(ctx, play(ctx, st, roll, m), depth - 1);
    if (v > bestValue) { bestValue = v; best = m; }
  }
  return best;
}

/** Deepens one ply at a time and keeps the last depth that finished inside the budget. */
function iterativeBest(ctx: Ctx, st: Sim, roll: number, moves: number[], maxDepth: number): number {
  let best = moves[0];
  for (let d = 1; d <= maxDepth; d++) {
    ctx.tt.clear();
    const candidate = rankMoves(ctx, st, roll, moves, d);
    if (ctx.nodes >= ctx.budget) break; // depth d was cut short: its answer is unreliable
    best = candidate;
  }
  return best;
}

function capturesCount(ctx: Ctx, st: Sim, roll: number, m: number): number {
  const yard = (s: Sim) => s.steps.filter((v) => v < 0).length;
  return yard(play(ctx, st, roll, m)) - yard(st);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Master: flat Monte-Carlo - random games from each candidate, keep the one that wins most. */
function monteCarlo(ctx: Ctx, st: Sim, roll: number, moves: number[]): number {
  const wins = new Array(moves.length).fill(0);
  const runs = new Array(moves.length).fill(0);
  for (let n = 0; n < PLAYOUTS; n++) {
    const k = n % moves.length;
    let cur = play(ctx, st, roll, moves[k]);
    for (let ply = 0; ply < MAX_PLAYOUT_PLIES; ply++) {
      if (winner(ctx, cur) >= 0) break;
      const r = 1 + Math.floor(Math.random() * 6);
      const options = legalMoves(ctx, cur, r);
      cur = play(ctx, cur, r, options.length ? pickRandom(options) : -1);
    }
    const w = winner(ctx, cur);
    const ev = evaluate(ctx, cur);
    wins[k] += w >= 0 ? (w === ctx.root ? 1 : 0) : 0.5 + ev / (2 * (Math.abs(ev) + 200));
    runs[k]++;
  }
  let best = 0;
  for (let k = 1; k < moves.length; k++) if (wins[k] / runs[k] > wins[best] / runs[best]) best = k;
  return moves[best];
}

/**
 * Picks the token to play for `color` after it rolled `roll`.
 * Returns the id of the chosen piece, or null when no move is legal.
 */
export function ludoAiMove(state: LudoGameState, color: PlayerColor, roll: number, level: LudoAiLevel): string | null {
  const seat = state.players.indexOf(color);
  if (seat < 0) return null;

  const ctx: Ctx = {
    owner: state.pieces.map((p) => state.players.indexOf(p.color)),
    start: state.players.map((c) => LUDO_START_INDEX[c]),
    seats: state.players.length,
    root: seat,
    tt: new Map(),
    nodes: 0,
    budget: Infinity,
  };
  // the engine already counted this roll if it was a six
  const sim: Sim = {
    steps: state.pieces.map((p) => p.trackIndex ?? -1),
    turn: seat,
    sixes: Math.max(0, state.consecutiveSixes - (roll === 6 ? 1 : 0)),
  };

  const moves = legalMoves(ctx, sim, roll);
  if (moves.length === 0) return null;

  let chosen = moves[0];
  if (moves.length > 1) {
    switch (level) {
      case 'easy': {
        const captures = moves.filter((m) => capturesCount(ctx, sim, roll, m) > 0);
        chosen = pickRandom(captures.length ? captures : moves);
        break;
      }
      case 'medium':
        chosen = rankMoves(ctx, sim, roll, moves, 3);
        break;
      case 'hard':
      case 'expert':
        ctx.budget = NODE_BUDGET[level];
        chosen = iterativeBest(ctx, sim, roll, moves, level === 'hard' ? 5 : 7);
        break;
      case 'master':
        chosen = monteCarlo(ctx, sim, roll, moves);
        break;
    }
  }
  return state.pieces[chosen].id;
}
