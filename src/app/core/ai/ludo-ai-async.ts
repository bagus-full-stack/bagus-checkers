import { PlayerColor } from '../models/piece.model';
import { LudoGameState } from '../models/ludo.model';
import { LudoAiLevel, ludoAiMove } from './ludo-ai';

type Args = [LudoGameState, PlayerColor, number, LudoAiLevel];

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 0;
const pending = new Map<number, { resolve: (pieceId: string | null) => void; args: Args }>();

/** The worker is gone (script blocked, offline, crashed): answer what waits inline and never use it again. */
function failWorker(): void {
  workerFailed = true;
  worker?.terminate();
  worker = null;
  for (const { resolve, args } of pending.values()) resolve(ludoAiMove(...args));
  pending.clear();
}

function getWorker(): Worker | null {
  if (worker || workerFailed || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./ludo-ai.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      pending.get(data.id)?.resolve(data.pieceId);
      pending.delete(data.id);
    };
    worker.onerror = failWorker;
    worker.onmessageerror = failWorker;
  } catch {
    failWorker();
  }
  return worker;
}

/**
 * Same answer as ludoAiMove, but the heavy levels (hard, expert, master) run in a Web Worker so the
 * page never freezes while the AI thinks. Easy and medium are instant and stay inline, as does any
 * browser where the worker is missing or breaks.
 */
export function ludoAiMoveAsync(state: LudoGameState, color: PlayerColor, roll: number, level: LudoAiLevel): Promise<string | null> {
  const w = level === 'easy' || level === 'medium' ? null : getWorker();
  if (!w) return Promise.resolve(ludoAiMove(state, color, roll, level));
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, { resolve, args: [state, color, roll, level] });
    w.postMessage({ id, state, color, roll, level });
  });
}
