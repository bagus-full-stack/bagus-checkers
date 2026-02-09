import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { Position, Piece, isDarkSquare } from '../../core/models';
import { PieceComponent } from '../piece/piece.component';

@Component({
  selector: 'app-square',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PieceComponent],
  host: {
    '[class]': 'hostClasses()',
    '[attr.aria-label]': 'ariaLabel()',
    '(click)': 'handleClick()',
    '(keydown.enter)': 'handleClick()',
    '(keydown.space)': 'handleClick()',
    '[tabindex]': 'isInteractive() ? 0 : -1',
    'role': 'button',
  },
  template: `
    @if (piece()) {
      <app-piece
        [piece]="piece()!"
        [isSelected]="isSelected()"
        [isMovable]="isMovable()"
      />
    }
    @if (isValidTarget()) {
      <div class="valid-move-indicator" aria-hidden="true"></div>
    }
    @if (isLastMoveFrom() || isLastMoveTo()) {
      <div class="last-move-indicator" aria-hidden="true"></div>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      aspect-ratio: 1;
      transition: background-color 0.15s ease;

      &.light {
        background-color: #f0d9b5;
      }

      &.dark {
        background-color: #b58863;
      }

      &.valid-target {
        cursor: pointer;
      }

      &.valid-target:hover {
        background-color: #7fc97f;
      }

      &:focus-visible {
        outline: 3px solid #4f46e5;
        outline-offset: -3px;
        z-index: 1;
      }
    }

    .valid-move-indicator {
      position: absolute;
      width: 30%;
      height: 30%;
      background-color: rgba(0, 128, 0, 0.5);
      border-radius: 50%;
      pointer-events: none;
    }

    :host.has-piece .valid-move-indicator {
      width: 100%;
      height: 100%;
      background-color: transparent;
      border: 4px solid rgba(0, 128, 0, 0.6);
      border-radius: 0;
      box-sizing: border-box;
    }

    .last-move-indicator {
      position: absolute;
      inset: 0;
      background-color: rgba(255, 255, 0, 0.3);
      pointer-events: none;
    }
  `,
})
export class SquareComponent {
  readonly position = input.required<Position>();
  readonly piece = input<Piece | null>(null);
  readonly isSelected = input(false);
  readonly isMovable = input(false);
  readonly isValidTarget = input(false);
  readonly isLastMoveFrom = input(false);
  readonly isLastMoveTo = input(false);

  readonly squareClicked = output<Position>();
  readonly pieceClicked = output<Piece>();

  protected readonly isDark = computed(() => isDarkSquare(this.position()));

  protected readonly hostClasses = computed(() => {
    const classes = [this.isDark() ? 'dark' : 'light'];
    if (this.isValidTarget()) classes.push('valid-target');
    if (this.piece()) classes.push('has-piece');
    return classes.join(' ');
  });

  protected readonly ariaLabel = computed(() => {
    const pos = this.position();
    const piece = this.piece();
    const row = pos.row + 1;
    const col = String.fromCharCode(65 + pos.col); // A, B, C...

    let label = `Case ${col}${row}`;
    if (piece) {
      const type = piece.type === 'king' ? 'Dame' : 'Pion';
      const color = piece.color === 'white' ? 'blanc' : 'noir';
      label += `, ${type} ${color}`;
    }
    if (this.isValidTarget()) {
      label += ', destination possible';
    }
    return label;
  });

  protected readonly isInteractive = computed(() =>
    this.isValidTarget() || this.piece() !== null
  );

  protected handleClick(): void {
    const piece = this.piece();
    if (piece) {
      this.pieceClicked.emit(piece);
    }
    this.squareClicked.emit(this.position());
  }
}

