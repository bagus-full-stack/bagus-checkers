import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { MaterialSnapshot } from '../../core/models/replay.model';

@Component({
  selector: 'app-material-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="graph-container" role="img" [attr.aria-label]="ariaLabel()">
      <div class="graph-header">
        <span class="graph-title">Avantage Matériel</span>
        <span class="current-advantage" [class]="advantageClass()">
          {{ advantageText() }}
        </span>
      </div>

      <div class="graph-body">
        <div class="y-axis">
          <span class="y-label white-label">Blancs</span>
          <span class="y-label center-label">0</span>
          <span class="y-label black-label">Noirs</span>
        </div>

        <div class="bars-container">
          @for (snapshot of history(); track snapshot.moveNumber) {
            <div
              class="bar-wrapper"
              [title]="'Coup ' + snapshot.moveNumber + ': ' + (snapshot.advantage > 0 ? '+' : '') + snapshot.advantage"
            >
              <div
                class="bar"
                [class.positive]="snapshot.advantage > 0"
                [class.negative]="snapshot.advantage < 0"
                [style.height.%]="getBarHeight(snapshot.advantage)"
                [style.top.%]="getBarTop(snapshot.advantage)"
              ></div>
            </div>
          }
        </div>
      </div>

      <div class="x-axis">
        <span>Début</span>
        <span>Fin</span>
      </div>
    </div>
  `,
  styles: `
    .graph-container {
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 1rem;
      width: 100%;
    }

    .graph-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .graph-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
    }

    .current-advantage {
      font-size: 0.875rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .current-advantage.positive {
      background: rgba(255, 255, 255, 0.2);
      color: #f5f5f5;
    }

    .current-advantage.negative {
      background: rgba(0, 0, 0, 0.3);
      color: #a3a3a3;
    }

    .current-advantage.neutral {
      background: rgba(107, 114, 128, 0.3);
      color: #9ca3af;
    }

    .graph-body {
      display: flex;
      height: 120px;
      gap: 0.5rem;
    }

    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 50px;
      flex-shrink: 0;
    }

    .y-label {
      font-size: 0.625rem;
      color: #9ca3af;
    }

    .white-label {
      color: #f5f5f5;
    }

    .black-label {
      color: #6b7280;
    }

    .center-label {
      color: #9ca3af;
    }

    .bars-container {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 1px;
      background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.05) 0%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(0, 0, 0, 0.1) 50%,
        rgba(0, 0, 0, 0.05) 100%
      );
      border-radius: 0.25rem;
      position: relative;
      overflow: hidden;
    }

    .bars-container::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: #4b5563;
    }

    .bar-wrapper {
      flex: 1;
      height: 100%;
      position: relative;
      min-width: 2px;
      max-width: 8px;
    }

    .bar {
      position: absolute;
      left: 0;
      right: 0;
      background: #6b7280;
      transition: height 0.2s ease, top 0.2s ease;
    }

    .bar.positive {
      background: linear-gradient(to top, #d4d4d4, #f5f5f5);
    }

    .bar.negative {
      background: linear-gradient(to bottom, #404040, #262626);
    }

    .x-axis {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.625rem;
      color: #6b7280;
    }
  `,
})
export class MaterialGraphComponent {
  readonly history = input.required<readonly MaterialSnapshot[]>();

  readonly currentAdvantage = computed(() => {
    const h = this.history();
    if (h.length === 0) return 0;
    return h[h.length - 1].advantage;
  });

  readonly advantageText = computed(() => {
    const adv = this.currentAdvantage();
    if (adv === 0) return 'Égalité';
    return (adv > 0 ? '+' : '') + adv;
  });

  readonly advantageClass = computed(() => {
    const adv = this.currentAdvantage();
    if (adv > 0) return 'positive';
    if (adv < 0) return 'negative';
    return 'neutral';
  });

  readonly ariaLabel = computed(() => {
    const adv = this.currentAdvantage();
    if (adv === 0) return 'Graphique montrant une égalité matérielle';
    const player = adv > 0 ? 'blancs' : 'noirs';
    return `Graphique montrant un avantage de ${Math.abs(adv)} pour les ${player}`;
  });

  getBarHeight(advantage: number): number {
    const maxAdvantage = 20; // Max expected advantage
    const normalized = Math.min(Math.abs(advantage), maxAdvantage) / maxAdvantage;
    return normalized * 45; // Max 45% of container height (each direction)
  }

  getBarTop(advantage: number): number {
    if (advantage >= 0) {
      return 50 - this.getBarHeight(advantage);
    }
    return 50;
  }
}

