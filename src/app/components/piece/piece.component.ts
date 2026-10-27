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
    '[attr.role]': 'isInteractiveToken() ? "button" : "img"',
    '[attr.tabindex]': 'isInteractiveToken() ? 0 : null',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
  template: `
    @if (piece().type === 'king') {
      <span class="crown" aria-hidden="true">♔</span>
    }
    @if (piece().type === 'token') {
      <span class="token-inner" aria-hidden="true">{{ tokenMark() }}</span>
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

      &.red {
        background: linear-gradient(145deg, #fca5a5, #b91c1c);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
      }

      &.blue {
        background: linear-gradient(145deg, #93c5fd, #1d4ed8);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
      }

      &.yellow {
        background: linear-gradient(145deg, #fde047, #b45309);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
      }

      &.green {
        background: linear-gradient(145deg, #86efac, #15803d);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
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

    .token-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56%;
      height: 56%;
      font-size: clamp(8px, 1.7vw, 16px);
      line-height: 1;
      color: rgba(0, 0, 0, 0.7);
      border-radius: 50%;
      background: rgba(255,255,255, 0.5);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
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

  private static readonly TOKEN_MARKS: Partial<Record<Piece['color'], string>> = {
    red: '▲',
    green: '■',
    yellow: '◆',
    blue: '●',
  };

  private static readonly COLOR_LABELS: Record<Piece['color'], string> = {
    white: 'blanc',
    black: 'noir',
    red: 'rouge',
    blue: 'bleu',
    yellow: 'jaune',
    green: 'vert',
  };

  protected readonly ariaLabel = computed(() => {
    const piece = this.piece();
    const type = piece.type === 'king' ? 'Dame' : 'Pion';
    const base = `${type} ${PieceComponent.COLOR_LABELS[piece.color]}`;
    return this.isInteractiveToken() ? `${base}, jouable` : base;
  });

  /** Ludo tokens can be played: expose them as buttons reachable by keyboard. */
  protected readonly isInteractiveToken = computed(() => this.piece().type === 'token' && this.isMovable());

  /** A shape per color, so colors never rely on hue alone (WCAG 1.4.1). */
  protected readonly tokenMark = computed(() => PieceComponent.TOKEN_MARKS[this.piece().color] ?? '');

  /** Enter/Space on a focused token acts like a click (it bubbles to the board cell). */
  protected activate(event: Event): void {
    if (!this.isInteractiveToken()) return;
    event.preventDefault();
    (event.target as HTMLElement).click();
  }
}
