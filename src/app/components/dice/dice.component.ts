import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dice',
  standalone: true,
  template: `
    <button
      class="dice btn"
      [class.rolling]="isRolling()"
      [disabled]="disabled() || isRolling()"
      (click)="roll.emit()"
    >
      <div class="dice-face" [attr.data-value]="value()">
        @if (value() === 1) {
          <span class="dot"></span>
        } @else if (value() === 2) {
          <span class="dot"></span><span class="dot"></span>
        } @else if (value() === 3) {
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        } @else if (value() === 4) {
          <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
        } @else if (value() === 5) {
          <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
        } @else if (value() === 6) {
          <span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>
        } @else {
          <span>🎲</span>
        }
      </div>
    </button>
  `,
  styles: [`
    .dice {
      width: 60px;
      height: 60px;
      padding: 0;
      border-radius: 12px;
      background: var(--surface-2);
      border: 2px solid var(--border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .dice:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
    }

    .dice:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .dice.rolling {
      animation: roll 0.5s ease-in-out infinite;
    }

    .dice-face {
      width: 100%;
      height: 100%;
      display: grid;
      padding: 8px;
    }

    .dice-face[data-value="1"] { grid-template: "c" 1fr / 1fr; place-items: center; }
    .dice-face[data-value="2"] { grid-template: "a ." 1fr ". b" 1fr / 1fr 1fr; padding: 12px;}
    .dice-face[data-value="3"] { grid-template: "a . ." 1fr ". b ." 1fr ". . c" 1fr / 1fr 1fr 1fr; padding: 10px;}
    .dice-face[data-value="4"] { grid-template: "a b" 1fr "c d" 1fr / 1fr 1fr; padding: 12px;}
    .dice-face[data-value="5"] { grid-template: "a . b" 1fr ". c ." 1fr "d . e" 1fr / 1fr 1fr 1fr; padding: 10px;}
    .dice-face[data-value="6"] { grid-template: "a b" 1fr "c d" 1fr "e f" 1fr / 1fr 1fr; padding: 10px;}

    .dot {
      display: block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--text);
      justify-self: center;
      align-self: center;
    }

    @keyframes roll {
      0% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(90deg) scale(1.1); background-color: var(--primary); }
      50% { transform: rotate(180deg) scale(1); }
      75% { transform: rotate(270deg) scale(1.1); background-color: var(--primary-dark); }
      100% { transform: rotate(360deg) scale(1); }
    }
  `]
})
export class DiceComponent {
  value = input<number | undefined>();
  disabled = input<boolean>(false);
  isRolling = input<boolean>(false);

  roll = output<void>();
}

