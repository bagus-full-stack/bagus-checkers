import { PlayerColor } from '../models/piece.model';
import { LudoGameState } from '../models/ludo.model';
import { LudoAiLevel, ludoAiMove } from './ludo-ai';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (pieceId: string | null) => void>();

function getWorker(): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./ludo-ai.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      pending.get(data.id)?.(data.pieceId);
      pending.delete(data.id);
    };
  } catch {
    worker = null; // no worker support: the search runs inline
  }
  return worker;
}

/**
 * Same answer as ludoAiMove, but the heavy levels (hard, expert, master) run in a Web Worker so the
 * page never freezes while the AI thinks. Easy and medium are instant and stay inline, as does any
 * browser without worker support.
 */
export function ludoAiMoveAsync(state: LudoGameState, color: PlayerColor, roll: number, level: LudoAiLevel): Promise<string | null> {
  const w = level === 'easy' || level === 'medium' ? null : getWorker();
  if (!w) return Promise.resolve(ludoAiMove(state, color, roll, level));
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    w.postMessage({ id, state, color, roll, level });
  });
}
