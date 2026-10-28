import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  ElementRef,
  afterRenderEffect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Position, Piece, Move } from '../../core/models';
import { LUDO_TOTAL_STEPS, ludoPositionForSteps } from '../../core/models/ludo.model';
import { PieceComponent } from '../piece/piece.component';

/** Last track cell before each color's home column, with the arrow shown there. */
const LUDO_ARROW_CELLS: Record<string, string> = {
  '7,0': 'red',
  '0,7': 'green',
  '7,14': 'yellow',
  '14,7': 'blue',
};

/** Entry square of each color (safe), keyed "row,col". */
const LUDO_START_CELLS: Record<string, string> = {
  '6,0': 'red',
  '0,8': 'green',
  '8,14': 'yellow',
  '14,6': 'blue',
};

/** Star squares (safe, white): LUDO_STAR_OFFSET steps after each entry square. */
const LUDO_STAR_CELLS = new Set(['3,6', '6,11', '11,8', '8,3']);

const HOP_MS = 150; // one square
const COLOR_HEX: Record<string, string> = { red: '#ef4444', green: '#22c55e', yellow: '#eab308', blue: '#3b82f6' };

interface Seen {
  pos: Position;
  step?: number; // steps since leaving the yard; undefined = in the yard
  color: string;
}

@Component({
  selector: 'app-ludo-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PieceComponent],
  template: `
    <div class="ludo-board-container" role="group" aria-label="Plateau de Ludo">
      <div class="ludo-grid" [attr.data-active]="diceCorner()">
        @for (row of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track row) {
          @for (col of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track col) {
            <div
              class="ludo-cell"
              [class]="getCellClasses(row, col)"
              (click)="onSquareClick(row, col)"
            >
              @if (getPieceAt(row, col); as p) {
                <app-piece
                  class="ludo-piece-slot"
                  [piece]="p"
                  [isSelected]="p.id === selectedPiece()?.id"
                  [isMovable]="isPieceMovable(p)"
                />
              }

              <!-- Valid move indicator overlay -->
              @if (isValidMoveTarget(row, col)) {
                <div class="valid-move-indicator"></div>
              }
            </div>
          }
        }
        <div class="ludo-center" aria-hidden="true"></div>
        <!-- Projected dice, parked in the yard corner of the player whose turn it is -->
        <div class="dice-slot" [attr.data-corner]="diceCorner()" [hidden]="!diceCorner()"><ng-content /></div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    /* The yard of the player to move breathes slowly (under 3 flashes a second, off for reduced motion) */
    @keyframes yard-pulse { 50% { filter: brightness(1.18) saturate(1.4); } }
    @media (prefers-reduced-motion: no-preference) {
      .ludo-grid[data-active='red'] .base-red,
      .ludo-grid[data-active='green'] .base-green,
      .ludo-grid[data-active='yellow'] .base-yellow,
      .ludo-grid[data-active='blue'] .base-blue {
        animation: yard-pulse 1.2s ease-in-out infinite;
      }
    }

    .dice-slot {
      position: absolute;
      z-index: 10;
      --dice-size: clamp(28px, 11cqw, 60px);
    }
    .dice-slot[data-corner='red'] { left: 1%; top: 1%; }
    .dice-slot[data-corner='green'] { right: 1%; top: 1%; }
    .dice-slot[data-corner='yellow'] { right: 1%; bottom: 1%; }
    .dice-slot[data-corner='blue'] { left: 1%; bottom: 1%; }

    .ludo-board-container {
      container-type: inline-size;
      width: 100%;
      height: auto;
      max-width: min(90vw, 800px);
      aspect-ratio: 1;
      margin: 0 auto;
      padding: 10px;
      background: var(--surface);
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    @media (max-width: 480px) {
      .ludo-board-container {
        max-width: 100vw;
        padding: 0;
        border-radius: 0;
      }
    }

    .ludo-grid {
      position: relative;
      display: grid;
      width: 100%;
      height: 100%;
      grid-template-columns: repeat(15, 1fr);
      grid-template-rows: repeat(15, 1fr);
      background: white;
      border: 3px solid #333;
      gap: 0; /* track cells draw their own borders; yards stay solid */
    }

    .ludo-cell {
      position: relative;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0,0,0,0.1);
    }

    /* Yards are one solid block each (as on a real board): no grid lines between their cells */
    .ludo-cell[class*='base-'] { border: none; }

    .ludo-piece-slot {
      width: 80%;
      height: 80%;
      z-index: 5;
    }

    /* Valid move marker overlay */
    .valid-move-indicator {
      position: absolute;
      width: 60%;
      height: 60%;
      background: rgba(0, 128, 0, 0.4);
      border-radius: 50%;
      pointer-events: none;
      z-index: 6;
      animation: pulse-marker 1.5s infinite;
    }

    @keyframes pulse-marker {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 0.4; }
    }

    /* Track (Non Base) cells */
    .ludo-cell.track {
      background: #fdfdfd;
    }

    /* Base zones */
    .base-red { background: #fca5a5; }
    .base-green { background: #86efac; }
    .base-yellow { background: #fde047; }
    .base-blue { background: #93c5fd; }

    /* Home zones (track leading to center) */
    .home-red { background: #ef4444; }
    .home-green { background: #22c55e; }
    .home-yellow { background: #eab308; }
    .home-blue { background: #3b82f6; }

    /* Start squares: safe, drawn in the owner's color with a star */
    .ludo-cell.start-red { background: #ef4444; }
    .ludo-cell.start-green { background: #22c55e; }
    .ludo-cell.start-yellow { background: #eab308; }
    .ludo-cell.start-blue { background: #3b82f6; }
    .safe::after {
      content: '★';
      position: absolute;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
      font-size: clamp(10px, 2.4vw, 22px);
      line-height: 1;
      pointer-events: none;
    }

    /* Star squares: safe too, but plain track squares with a dark star */
    .ludo-cell.star::after {
      color: #374151;
      text-shadow: none;
    }

    /* Center: the 3x3 block is home, drawn as four triangles (one per color) by an overlay */
    .ludo-cell.center { background: transparent; }
    .ludo-center {
      position: absolute;
      left: 40%;
      top: 40%;
      width: 20%;
      height: 20%;
      background: conic-gradient(from -45deg, #22c55e 0 90deg, #eab308 90deg 180deg, #3b82f6 180deg 270deg, #ef4444 270deg 360deg);
      pointer-events: none;
    }

    /* Yard nests: a white square with four colored spots, as on a real board */
    .base-red { --c: #ef4444; }
    .base-green { --c: #22c55e; }
    .base-yellow { --c: #eab308; }
    .base-blue { --c: #3b82f6; }
    .ludo-cell.nest { background: #fff; }
    .ludo-cell.nest-spot { background: radial-gradient(circle closest-side, var(--c) 0 98%, #fff 100%); }

    /* Arrow on the cell just before each home column, in that color */
    .arrow::after {
      position: absolute;
      font-size: clamp(10px, 2.2vw, 20px);
      line-height: 1;
      pointer-events: none;
    }
    .arrow-red::after { content: '▶'; color: #ef4444; }
    .arrow-green::after { content: '▼'; color: #22c55e; }
    .arrow-yellow::after { content: '◀'; color: #eab308; }
    .arrow-blue::after { content: '▲'; color: #3b82f6; }
  `
})
export class LudoBoardComponent {
  board = input.required<(Piece | null)[][]>();
  selectedPiece = input<Piece | undefined>();
  validMoves = input<Move[]>([]);
  movablePieces = input<Piece[]>([]);
  /** Color whose yard corner holds the projected dice. */
  diceCorner = input<string | undefined>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private seen = new Map<string, Seen>();

  constructor() {
    afterRenderEffect(() => this.animateChanges(this.board()));
  }

  squareClicked = output<Position>();
  pieceClicked = output<Piece>();

  /**
   * Compares the board with the previous one and plays, per piece: a hop square by square (with a
   * ring where it leaves the yard), a spin-and-fly back to the yard when captured (with a burst on
   * the square), and sparkles when it reaches home. Skipped for reduced motion and first render.
   */
  private animateChanges(grid: (Piece | null)[][]): void {
    const now = new Map<string, Seen>();
    grid.forEach((line, row) =>
      line.forEach((p, col) => p && now.set(p.id, { pos: { row, col }, step: p.trackIndex, color: p.color })),
    );
    const before = this.seen;
    this.seen = now;

    const root = this.host.nativeElement;
    const cells = root.querySelectorAll<HTMLElement>('.ludo-grid > .ludo-cell');
    if (!before.size || cells.length < 225 || typeof cells[0].animate !== 'function') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { width, height } = cells[0].getBoundingClientRect();
    if (!width) return;

    const cellOf = (p: Position) => cells[p.row * 15 + p.col];
    let landed = 0; // when the last mover arrives: captures and sparkles wait for it
    const captured: [Seen, Seen][] = [];

    for (const [id, cur] of now) {
      const old = before.get(id);
      if (!old || (old.pos.row === cur.pos.row && old.pos.col === cur.pos.col)) continue;
      if (cur.step === undefined) { captured.push([old, cur]); continue; }

      const el = cellOf(cur.pos).querySelector<HTMLElement>('.ludo-piece-slot');
      if (!el) continue;
      const at = (p: Position, extra = '') =>
        `translate(${(p.col - cur.pos.col) * width}px, ${(p.row - cur.pos.row) * height}px)${extra}`;

      // squares crossed, from where it was to where it is
      const path: Position[] =
        old.step !== undefined && cur.step > old.step && cur.step - old.step <= 6
          ? Array.from({ length: cur.step - old.step }, (_, i) => ludoPositionForSteps(cur.color as never, old.step! + 1 + i))
          : [cur.pos];
      const frames: Keyframe[] = [{ transform: at(old.pos), zIndex: '20' }];
      for (const p of path) {
        frames.push({ transform: at(p, ' scale(1.3)'), zIndex: '20' }, { transform: at(p), zIndex: '20' });
      }
      const duration = path.length * HOP_MS;
      landed = Math.max(landed, duration);
      el.animate(frames, { duration, easing: 'ease-in-out' });

      if (old.step === undefined) this.burst(cellOf(cur.pos), '', COLOR_HEX[cur.color], 0, duration); // leaves the yard
      if (cur.step === LUDO_TOTAL_STEPS) {
        this.burst(cellOf(cur.pos), '✨', '#f59e0b', duration, 900);
        el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 500, delay: duration });
      }
    }

    for (const [old, cur] of captured) {
      const el = cellOf(cur.pos).querySelector<HTMLElement>('.ludo-piece-slot');
      if (!el) continue;
      const from = `translate(${(old.pos.col - cur.pos.col) * width}px, ${(old.pos.row - cur.pos.row) * height}px)`;
      el.animate(
        [
          { transform: `${from} scale(1)`, opacity: 1, zIndex: '20' },
          { transform: `${from} scale(0.2) rotate(360deg)`, opacity: 0.3, zIndex: '20', offset: 0.3 },
          { transform: `${from} scale(0.2) rotate(360deg)`, opacity: 0.3, zIndex: '20', offset: 0.4 },
          { transform: 'none', opacity: 1, zIndex: '20' },
        ],
        { duration: 800, delay: landed, easing: 'ease-in-out', fill: 'backwards' },
      );
      this.burst(cellOf(old.pos), '💥', '#ef4444', landed, 600);
    }
  }

  /** A ring (and an optional symbol) that grows and fades on one square. */
  private burst(cell: HTMLElement, symbol: string, color: string, delay: number, duration: number): void {
    const fx = document.createElement('div');
    fx.textContent = symbol;
    fx.style.cssText = `position:absolute;inset:-25%;border-radius:50%;border:3px solid ${color};display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:25;font-size:clamp(14px,4cqw,32px)`;
    cell.appendChild(fx);
    const run = fx.animate(
      [
        { transform: 'scale(0.2)', opacity: 0 },
        { transform: 'scale(0.8)', opacity: 1, offset: 0.25 },
        { transform: 'scale(1.8)', opacity: 0 },
      ],
      { duration: Math.max(duration, 400), delay, easing: 'ease-out', fill: 'both' },
    );
    run.onfinish = () => fx.remove();
  }

  getPieceAt(row: number, col: number): Piece | null {
    const grid = this.board();
    if (!grid || !grid[row]) return null;
    return grid[row][col];
  }

  isPieceMovable(piece: Piece): boolean {
    return this.movablePieces().some((p) => p.id === piece.id);
  }

  isValidMoveTarget(row: number, col: number): boolean {
    return this.validMoves().some((m) => m.to.row === row && m.to.col === col);
  }

  onSquareClick(row: number, col: number): void {
    const piece = this.getPieceAt(row, col);
    if (piece) {
      this.pieceClicked.emit(piece);
    }
    this.squareClicked.emit({ row, col });
  }

  getCellClasses(row: number, col: number): string {
    const classes = [];

    // Yards: RED top-left, GREEN top-right, BLUE bottom-left, YELLOW bottom-right.
    // The inner 4x4 is the white nest; its 2x2 core holds the four spots.
    const yard = row < 6 ? (col < 6 ? 'red' : col > 8 ? 'green' : null) : row > 8 ? (col < 6 ? 'blue' : col > 8 ? 'yellow' : null) : null;
    if (yard) {
      classes.push(`base-${yard}`);
      const r = row % 9, c = col % 9; // 0..5 inside a yard
      if (r >= 1 && r <= 4 && c >= 1 && c <= 4) classes.push('nest');
      if (r >= 2 && r <= 3 && c >= 2 && c <= 3) classes.push('nest-spot');
    }

    // Home columns/rows - each color's private run-in to the center, adjacent to
    // the shared-track branch cell a token reaches after (almost) a full lap.
    else if (row === 7 && col > 0 && col < 6) classes.push('home-red'); // Red home path (left)
    else if (col === 7 && row > 0 && row < 6) classes.push('home-green'); // Green home path (top)
    else if (row === 7 && col > 8 && col < 14) classes.push('home-yellow'); // Yellow home path (right)
    else if (col === 7 && row > 8 && row < 14) classes.push('home-blue'); // Blue home path (bottom)

    // Center 3x3: home, painted as four triangles by the .ludo-center overlay. Not track.
    else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) classes.push('center');

    else {
      classes.push('track');
      const start = LUDO_START_CELLS[`${row},${col}`];
      if (start) classes.push(`start-${start}`, 'safe');
      else if (LUDO_STAR_CELLS.has(`${row},${col}`)) classes.push('star', 'safe');
      const arrow = LUDO_ARROW_CELLS[`${row},${col}`];
      if (arrow) classes.push('arrow', `arrow-${arrow}`);
    }
    return classes.join(' ');
  }
}
