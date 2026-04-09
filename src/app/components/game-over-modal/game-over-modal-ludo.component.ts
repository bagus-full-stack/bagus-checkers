import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { PlayerColor } from '../../core/models/piece.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-over-modal-ludo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      (click)="onBackdropClick($event)"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h2 id="game-over-title" class="modal-title">
          {{ titleText() }}
        </h2>

        <div class="result-display">
          @if (winner()) {
            <div class="winner-animation">
              <div class="winner-badge" [style.color]="getColorHex(winner())">
                <span class="winner-icon">🏆</span>
                <span class="winner-text">
                  Le joueur <span style="text-transform: uppercase;">{{ getPlayerName(winner()) }}</span> gagne !
                </span>
              </div>
            </div>
          }

          <p class="reason-text">{{ reason() }}</p>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-primary"
            (click)="newGame.emit()"
          >
            🆕 Nouvelle partie
          </button>

          <button class="modal-btn secondary" (click)="close.emit()">
            Fermer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      animation: fadeIn 0.2s ease;
      padding: 1rem;
    }

    .modal-content {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    }

    :host-context(.light-theme) .modal-content {
      background: #ffffff;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      text-align: center;
      margin: 0 0 1.5rem;
    }

    :host-context(.light-theme) .modal-title {
      color: #111827;
    }

    .result-display {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .winner-animation {
      display: inline-block;
      animation: bounce 1s infinite;
    }

    .winner-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      position: relative;
      overflow: hidden;
    }

    .winner-badge:before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 300%;
      height: 300%;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      animation: wave 1.5s ease-in-out infinite;
    }

    .reason-text {
      margin: 0.75rem 0 0;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    :host-context(.light-theme) .reason-text {
      color: #6b7280;
    }

    .modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }

    .btn {
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }

    .btn-primary {
      background: #4f46e5;
      color: white;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    .btn-secondary {
      background: #374151;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #4b5563;
      color: #9ca3af;
    }

    .btn-outline:hover {
      background: #374151;
      color: white;
    }

    .btn-ghost {
      background: transparent;
      color: #6b7280;
    }

    .btn-ghost:hover {
      color: white;
    }

    .btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    @keyframes wave {
      0% {
        transform: translate(-50%, -50%) scale(0);
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
      }
    }
  `
})
export class GameOverModalLudoComponent {
  winner = input<string | null>(null);
  reason = input<string>('Partie terminée');

  newGame = output<void>();
  close = output<void>();

  titleText = computed(() => {
    if (this.winner()) return 'Victoire !';
    return 'Partie Terminée';
  });

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  getColorHex(color: string | null): string {
    if (!color) return 'white';
    switch (color) {
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      default: return 'white';
    }
  }

  getPlayerName(color: string | null): string {
    if (!color) return '';
    switch (color) {
      case 'red': return 'Rouge';
      case 'blue': return 'Bleu';
      case 'green': return 'Vert';
      case 'yellow': return 'Jaune';
      default: return color;
    }
  }
}
