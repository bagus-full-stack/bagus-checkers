import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { LudoEngineService } from '../../core/services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game-info-ludo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="info-container">
      <div class="game-status">
        <span class="status-text">
          Tour du joueur: <span [style.color]="getColorHex(currentPlayer())" style="text-transform: capitalize; font-weight: bold;">{{ getPlayerName(currentPlayer()) }}</span>
        </span>
      </div>
    </div>
  `,
  styles: `
    .info-container {
      background: #374151;
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      color: white;
    }

    :host-context(.light-theme) .info-container {
      background: #ffffff;
      color: #111827;
      border: 1px solid #e5e7eb;
    }

    .game-status {
      text-align: center;
      padding: 0.75rem;
    }

    .status-text {
      font-size: 1.125rem;
      font-weight: 500;
    }
  `
})
export class GameInfoLudoComponent {
  private readonly ludoEngine = inject(LudoEngineService);

  readonly currentPlayer = this.ludoEngine.currentPlayer;
  readonly status = this.ludoEngine.status;

  getColorHex(color: string | undefined): string {
    if (!color) return 'white';
    switch (color) {
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      default: return 'white';
    }
  }

  getPlayerName(color: string | undefined): string {
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

