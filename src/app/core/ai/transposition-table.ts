/**
 * Transposition Table for AI optimization
 * Caches evaluated positions to avoid redundant calculations
 */

import { GameState, PlayerColor } from '../models';

export interface TranspositionEntry {
  hash: string;
  depth: number;
  score: number;
  flag: 'exact' | 'lowerbound' | 'upperbound';
  bestMoveKey?: string;
  timestamp: number;
}

/**
 * Zobrist hashing for board positions
 */
class ZobristHasher {
  private readonly pieceHashes: Map<string, bigint> = new Map();
  private readonly turnHash: bigint;

  constructor() {
    // Initialize random hashes for each piece type/color/position combination
    // Using BigInt for 64-bit hashes
    const random64 = () => {
      const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
      const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
      return (high << 32n) | low;
    };

    // Generate hashes for all possible piece positions (10x10 board)
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        for (const color of ['white', 'black']) {
          for (const type of ['pawn', 'king']) {
            const key = `${row},${col},${color},${type}`;
            this.pieceHashes.set(key, random64());
          }
        }
      }
    }

    this.turnHash = random64();
  }

  /**
   * Computes the Zobrist hash for a game state
   */
  hash(state: GameState): string {
    let h = 0n;

    for (const piece of state.pieces) {
      const key = `${piece.position.row},${piece.position.col},${piece.color},${piece.type}`;
      const pieceHash = this.pieceHashes.get(key);
      if (pieceHash) {
        h ^= pieceHash;
      }
    }

    if (state.currentPlayer === 'black') {
      h ^= this.turnHash;
    }

    return h.toString(16);
  }
}

/**
 * Transposition Table with LRU-like eviction
 */
export class TranspositionTable {
  private readonly table: Map<string, TranspositionEntry> = new Map();
  private readonly maxSize: number;
  private readonly hasher: ZobristHasher;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 1_000_000) {
    this.maxSize = maxSize;
    this.hasher = new ZobristHasher();
  }

  /**
   * Clears the transposition table
   */
  clear(): void {
    this.table.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gets an entry from the table
   */
  get(state: GameState, depth: number): TranspositionEntry | null {
    const hash = this.hasher.hash(state);
    const entry = this.table.get(hash);

    if (entry && entry.depth >= depth) {
      this.hits++;
      return entry;
    }

    this.misses++;
    return null;
  }

  /**
   * Stores an entry in the table
   */
  set(
    state: GameState,
    depth: number,
    score: number,
    flag: 'exact' | 'lowerbound' | 'upperbound',
    bestMoveKey?: string
  ): void {
    const hash = this.hasher.hash(state);

    // Evict old entries if table is full
    if (this.table.size >= this.maxSize) {
      this.evictOldEntries();
    }

    const entry: TranspositionEntry = {
      hash,
      depth,
      score,
      flag,
      bestMoveKey,
      timestamp: Date.now(),
    };

    this.table.set(hash, entry);
  }

  /**
   * Probes the table for a usable entry
   */
  probe(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number
  ): { score: number; valid: boolean } {
    const entry = this.get(state, depth);

    if (!entry) {
      return { score: 0, valid: false };
    }

    if (entry.flag === 'exact') {
      return { score: entry.score, valid: true };
    }

    if (entry.flag === 'lowerbound' && entry.score >= beta) {
      return { score: entry.score, valid: true };
    }

    if (entry.flag === 'upperbound' && entry.score <= alpha) {
      return { score: entry.score, valid: true };
    }

    return { score: 0, valid: false };
  }

  /**
   * Gets the best move key from a cached position
   */
  getBestMoveKey(state: GameState): string | undefined {
    const hash = this.hasher.hash(state);
    const entry = this.table.get(hash);
    return entry?.bestMoveKey;
  }

  /**
   * Evicts old entries to make room for new ones
   */
  private evictOldEntries(): void {
    const entriesToRemove = Math.floor(this.maxSize * 0.1); // Remove 10%
    const entries = Array.from(this.table.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      this.table.delete(entries[i][0]);
    }
  }

  /**
   * Gets statistics about the table
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.table.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

export const transpositionTable = new TranspositionTable();

