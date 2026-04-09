import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Position, Piece, Move } from '../../core/models';
import { PieceComponent } from '../piece/piece.component';

@Component({
  selector: 'app-ludo-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PieceComponent],
  template: `
    <div class="ludo-board-container">
      <div class="ludo-grid">
        @for (row of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track row) {
          @for (col of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track col) {
            <div
              class="ludo-cell"
              [ngClass]="getCellClasses(row, col)"
              (click)="onSquareClick(row, col)"
            >
              @if (getPieceAt(row, col); as p) {
                <app-piece
                  class="ludo-piece-container"
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
      </div>
    </div>
  `,
  styles: [`
    .ludo-board-container {
      width: 100%;
      max-width: 600px;
      aspect-ratio: 1;
      margin: 0 auto;
      padding: 10px;
      background: var(--surface);
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    .ludo-grid {
      display: grid;
      width: 100%;
      height: 100%;
      grid-template-columns: repeat(15, 1fr);
      grid-template-rows: repeat(15, 1fr);
      background: white;
      border: 3px solid #333;
      gap: 1px; /* border simulation */
    }

    .ludo-cell {
      position: relative;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0,0,0,0.1);
    }

    .ludo-piece-container {
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

    /* Center */
    .center-cross { background: #333; }
  `]
})
export class LudoBoardComponent {
  board = input.required<(Piece | null)[][]>();
  selectedPiece = input<Piece | undefined>();
  validMoves = input<Move[]>([]);
  movablePieces = input<Piece[]>([]);

  squareClicked = output<Position>();
  pieceClicked = output<Piece>();

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

    // Top-left: RED
    if (row < 6 && col < 6) classes.push('base-red');
    // Top-right: GREEN
    else if (row < 6 && col > 8) classes.push('base-green');
    // Bottom-left: BLUE
    else if (row > 8 && col < 6) classes.push('base-blue');
    // Bottom-right: YELLOW
    else if (row > 8 && col > 8) classes.push('base-yellow');

    // Home columns/rows
    else if (col === 7 && row > 0 && row < 6) classes.push('home-red'); // Red home path (top)
    else if (row === 7 && col > 8 && col < 14) classes.push('home-green'); // Green home path (right)
    else if (col === 7 && row > 8 && row < 14) classes.push('home-yellow'); // Yellow home path (bottom)
    else if (row === 7 && col > 0 && col < 6) classes.push('home-blue'); // Blue home path (left)

    // Center area
    else if (row > 5 && row < 9 && col > 5 && col < 9) classes.push('center-cross');

    else classes.push('track');

    return classes.join(' ');
  }
}
