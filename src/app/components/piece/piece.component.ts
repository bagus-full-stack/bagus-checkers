import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { Piece } from '../../core/models';

@Component({
  selector: 'app-piece',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.aria-label]': 'ariaLabel()',
    'role': 'img',
  },
  template: `
    @if (piece().type === 'king') {
      <span class="crown" aria-hidden="true">♔</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80%;
      height: 80%;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }

      &.white {
        background: linear-gradient(
          145deg,
          var(--piece-white-primary, #f5f5f5),
          var(--piece-white-secondary, #d4d4d4)
        );
        box-shadow:
          0 4px 8px rgba(0, 0, 0, 0.3),
          inset 0 2px 4px rgba(255, 255, 255, 0.5);
      }

      &.black {
        background: linear-gradient(
          145deg,
          var(--piece-black-primary, #3d3d3d),
          var(--piece-black-secondary, #1a1a1a)
        );
        box-shadow:
          0 4px 8px rgba(0, 0, 0, 0.4),
          inset 0 2px 4px rgba(255, 255, 255, 0.1);
      }

      &.selected {
        transform: scale(1.1);
        box-shadow:
          0 0 0 3px var(--board-highlight, #4f46e5),
          0 8px 16px rgba(79, 70, 229, 0.4);
      }

      &.movable:not(.selected) {
        animation: pulse 1.5s infinite;
      }

      &:hover:not(.selected) {
        transform: scale(1.05);
      }

      &:focus-visible {
        outline: 3px solid var(--board-highlight, #4f46e5);
        outline-offset: 2px;
      }
    }

    .crown {
      font-size: 1.5rem;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    :host.white .crown {
      color: #8b5a2b;
    }

    :host.black .crown {
      color: #ffd700;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow:
          0 0 0 0 rgba(79, 70, 229, 0.4),
          0 4px 8px rgba(0, 0, 0, 0.3);
      }
      50% {
        box-shadow:
          0 0 0 6px rgba(79, 70, 229, 0),
          0 4px 8px rgba(0, 0, 0, 0.3);
      }
    }
  `,
})
export class PieceComponent {
  readonly piece = input.required<Piece>();
  readonly isSelected = input(false);
  readonly isMovable = input(false);

  readonly clicked = output<Piece>();

  protected readonly hostClasses = computed(() => {
    const classes: string[] = [this.piece().color];
    if (this.isSelected()) classes.push('selected');
    if (this.isMovable()) classes.push('movable');
    return classes.join(' ');
  });

  protected readonly ariaLabel = computed(() => {
    const piece = this.piece();
    const type = piece.type === 'king' ? 'Dame' : 'Pion';
    const color = piece.color === 'white' ? 'blanc' : 'noir';
    return `${type} ${color}`;
  });
}

