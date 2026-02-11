import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';
import {
  GameAnalysis,
  MoveAnalysis,
  MoveClassification,
  CLASSIFICATION_ICONS,
  CLASSIFICATION_COLORS,
} from '../../core/ai';

@Component({
  selector: 'app-game-analysis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="analysis-container">
      <header class="analysis-header">
        <h2 class="analysis-title">📊 Analyse de la partie</h2>
        <button
          type="button"
          class="close-btn"
          (click)="close.emit()"
          aria-label="Fermer"
        >
          ✕
        </button>
      </header>

      @if (analysis(); as data) {
        <div class="analysis-content">
          <!-- Summary -->
          <section class="summary-section">
            <h3 class="section-title">Résumé</h3>

            <div class="accuracy-bars">
              <div class="accuracy-item white">
                <span class="accuracy-label">Blancs</span>
                <div class="accuracy-bar">
                  <div
                    class="accuracy-fill"
                    [style.width.%]="data.summary.whiteAccuracy"
                  ></div>
                </div>
                <span class="accuracy-value">{{ data.summary.whiteAccuracy }}%</span>
              </div>

              <div class="accuracy-item black">
                <span class="accuracy-label">Noirs</span>
                <div class="accuracy-bar">
                  <div
                    class="accuracy-fill"
                    [style.width.%]="data.summary.blackAccuracy"
                  ></div>
                </div>
                <span class="accuracy-value">{{ data.summary.blackAccuracy }}%</span>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-value">{{ data.summary.totalMoves }}</span>
                <span class="stat-label">Coups</span>
              </div>
              <div class="stat-box mistake">
                <span class="stat-value">
                  {{ data.summary.whiteMistakes + data.summary.blackMistakes }}
                </span>
                <span class="stat-label">Erreurs</span>
              </div>
              <div class="stat-box blunder">
                <span class="stat-value">
                  {{ data.summary.whiteBlunders + data.summary.blackBlunders }}
                </span>
                <span class="stat-label">Gaffes</span>
              </div>
            </div>
          </section>

          <!-- Critical Moments -->
          @if (data.criticalMoments.length > 0) {
            <section class="critical-section">
              <h3 class="section-title">⚡ Moments clés</h3>
              <ul class="critical-list">
                @for (moment of data.criticalMoments; track moment.moveNumber) {
                  <li class="critical-item" [class]="moment.type">
                    <span class="moment-move">Coup {{ moment.moveNumber }}</span>
                    <span class="moment-desc">{{ moment.description }}</span>
                    <span class="moment-swing">
                      {{ moment.evaluationSwing > 0 ? '+' : '' }}{{ formatEval(moment.evaluationSwing) }}
                    </span>
                  </li>
                }
              </ul>
            </section>
          }

          <!-- Suggestions -->
          @if (data.suggestions.length > 0) {
            <section class="suggestions-section">
              <h3 class="section-title">💡 Suggestions d'amélioration</h3>
              <ul class="suggestions-list">
                @for (suggestion of data.suggestions; track suggestion) {
                  <li class="suggestion-item">{{ suggestion }}</li>
                }
              </ul>
            </section>
          }

          <!-- Move by Move (collapsible) -->
          <section class="moves-section">
            <button
              type="button"
              class="section-toggle"
              (click)="showMoves.set(!showMoves())"
            >
              <h3 class="section-title">📋 Analyse coup par coup</h3>
              <span class="toggle-icon">{{ showMoves() ? '▼' : '▶' }}</span>
            </button>

            @if (showMoves()) {
              <div class="moves-list">
                @for (move of data.moves; track move.moveNumber) {
                  <div
                    class="move-item"
                    [class]="move.classification"
                  >
                    <span class="move-number">{{ move.moveNumber }}.</span>
                    <span class="move-player" [class]="move.player">
                      {{ move.player === 'white' ? '○' : '●' }}
                    </span>
                    <span class="move-classification" [style.color]="getColor(move.classification)">
                      {{ getIcon(move.classification) }}
                    </span>
                    <span class="move-eval">
                      {{ formatEval(move.evaluation) }}
                    </span>
                    @if (move.comment) {
                      <span class="move-comment">{{ move.comment }}</span>
                    }
                  </div>
                }
              </div>
            }
          </section>

          @if (data.openingName) {
            <div class="opening-info">
              <span class="opening-label">Ouverture:</span>
              <span class="opening-name">{{ data.openingName }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="no-analysis">
          <p>Aucune analyse disponible</p>
        </div>
      }
    </div>
  `,
  styles: `
    .analysis-container {
      background: #1f2937;
      border-radius: 0.75rem;
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    :host-context(.light-theme) .analysis-container {
      background: #ffffff;
    }

    .analysis-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #374151;
    }

    :host-context(.light-theme) .analysis-header {
      border-bottom-color: #e5e7eb;
    }

    .analysis-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    :host-context(.light-theme) .analysis-title {
      color: #111827;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #374151;
      border: none;
      border-radius: 0.375rem;
      color: #9ca3af;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context(.light-theme) .close-btn {
      background: #f3f4f6;
    }

    .close-btn:hover {
      background: #4b5563;
      color: white;
    }

    .analysis-content {
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    :host-context(.light-theme) .section-title {
      color: #6b7280;
    }

    .accuracy-bars {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .accuracy-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .accuracy-label {
      width: 60px;
      font-size: 0.875rem;
      color: #d1d5db;
    }

    :host-context(.light-theme) .accuracy-label {
      color: #4b5563;
    }

    .accuracy-bar {
      flex: 1;
      height: 8px;
      background: #374151;
      border-radius: 4px;
      overflow: hidden;
    }

    :host-context(.light-theme) .accuracy-bar {
      background: #e5e7eb;
    }

    .accuracy-fill {
      height: 100%;
      background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e);
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .accuracy-value {
      width: 40px;
      text-align: right;
      font-weight: 600;
      color: white;
    }

    :host-context(.light-theme) .accuracy-value {
      color: #111827;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .stat-box {
      background: #374151;
      padding: 0.75rem;
      border-radius: 0.5rem;
      text-align: center;
    }

    :host-context(.light-theme) .stat-box {
      background: #f3f4f6;
    }

    .stat-box.mistake {
      border-left: 3px solid #f59e0b;
    }

    .stat-box.blunder {
      border-left: 3px solid #ef4444;
    }

    .stat-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
    }

    :host-context(.light-theme) .stat-value {
      color: #111827;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .critical-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .critical-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #374151;
      border-radius: 0.375rem;
      border-left: 3px solid #6b7280;
    }

    :host-context(.light-theme) .critical-item {
      background: #f3f4f6;
    }

    .critical-item.blunder {
      border-left-color: #ef4444;
    }

    .critical-item.brilliant {
      border-left-color: #1abc9c;
    }

    .critical-item.turning_point {
      border-left-color: #f59e0b;
    }

    .moment-move {
      font-weight: 600;
      color: white;
      min-width: 60px;
    }

    :host-context(.light-theme) .moment-move {
      color: #111827;
    }

    .moment-desc {
      flex: 1;
      font-size: 0.875rem;
      color: #d1d5db;
    }

    :host-context(.light-theme) .moment-desc {
      color: #4b5563;
    }

    .moment-swing {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .suggestions-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .suggestion-item {
      padding: 0.75rem;
      background: rgba(79, 70, 229, 0.1);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #d1d5db;
      border-left: 3px solid #4f46e5;
    }

    :host-context(.light-theme) .suggestion-item {
      color: #4b5563;
    }

    .section-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .toggle-icon {
      color: #9ca3af;
    }

    .moves-list {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .move-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: #374151;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    :host-context(.light-theme) .move-item {
      background: #f3f4f6;
    }

    .move-item.blunder {
      background: rgba(239, 68, 68, 0.1);
    }

    .move-item.mistake {
      background: rgba(245, 158, 11, 0.1);
    }

    .move-item.brilliant {
      background: rgba(26, 188, 156, 0.1);
    }

    .move-number {
      color: #6b7280;
      width: 24px;
    }

    .move-player {
      font-size: 0.875rem;
    }

    .move-player.white {
      color: #f5f5f5;
    }

    .move-player.black {
      color: #3d3d3d;
    }

    .move-classification {
      font-weight: 700;
      min-width: 16px;
    }

    .move-eval {
      color: #9ca3af;
    }

    .move-comment {
      color: #9ca3af;
      font-style: italic;
      flex: 1;
      text-align: right;
    }

    .opening-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #374151;
      border-radius: 0.5rem;
    }

    :host-context(.light-theme) .opening-info {
      background: #f3f4f6;
    }

    .opening-label {
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .opening-name {
      color: white;
      font-weight: 600;
    }

    :host-context(.light-theme) .opening-name {
      color: #111827;
    }

    .no-analysis {
      padding: 2rem;
      text-align: center;
      color: #9ca3af;
    }
  `,
})
export class GameAnalysisComponent {
  readonly analysis = input<GameAnalysis | null>(null);
  readonly close = output<void>();

  readonly showMoves = signal(false);

  getIcon(classification: MoveClassification): string {
    return CLASSIFICATION_ICONS[classification];
  }

  getColor(classification: MoveClassification): string {
    return CLASSIFICATION_COLORS[classification];
  }

  formatEval(value: number): string {
    const normalized = value / 100;
    if (normalized >= 0) {
      return `+${normalized.toFixed(1)}`;
    }
    return normalized.toFixed(1);
  }
}


