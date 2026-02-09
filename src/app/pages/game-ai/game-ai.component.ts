import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  signal,
  effect,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameEngineService, AiService, TimerService, ReplayService } from '../../core/services';
import { AIDifficulty, TimeMode, TIME_MODES } from '../../core/models';
import {
  BoardComponent,
  MoveHistoryComponent,
  GameInfoComponent,
  GameTimerComponent,
  GameOverModalComponent,
} from '../../components';

@Component({
  selector: 'app-game-ai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BoardComponent, MoveHistoryComponent, GameInfoComponent, GameTimerComponent, GameOverModalComponent],
  template: `
    <div class="game-container">
      <header class="game-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="game-title">Contre l'IA</h1>
        <div class="header-actions">
          <select
            class="time-select"
            [value]="selectedTimeMode()"
            (change)="onTimeModeChange($event)"
            aria-label="Mode de temps"
          >
            @for (mode of timeModes; track mode.id) {
              <option [value]="mode.id">{{ mode.name }}</option>
            }
          </select>
          <select
            class="difficulty-select"
            [value]="difficulty()"
            (change)="setDifficulty($event)"
            aria-label="Sélectionner la difficulté"
          >
            <option value="easy">Facile</option>
            <option value="medium">Moyen</option>
            <option value="hard">Difficile</option>
          </select>
          <button
            type="button"
            class="action-btn"
            (click)="newGame()"
            aria-label="Nouvelle partie"
          >
            🔄 Nouvelle partie
          </button>
        </div>
      </header>

      <main class="game-main">
        <aside class="sidebar left-sidebar">
          <app-game-timer [player]="'black'" />
          <app-game-info />

          <div class="ai-status">
            @if (isAiThinking()) {
              <div class="thinking-indicator" role="status" aria-live="polite">
                <span class="spinner" aria-hidden="true"></span>
                L'IA réfléchit...
              </div>
            }
          </div>
        </aside>

        <section class="board-section" aria-label="Plateau de jeu">
          <app-board />
        </section>

        <aside class="sidebar right-sidebar">
          <app-game-timer [player]="'white'" />
          <app-move-history />
        </aside>
      </main>

      @if (isGameOver()) {
        <app-game-over-modal
          [winner]="gameResult()?.winner ?? null"
          [reason]="gameResult()?.reason"
          [stats]="gameStats()"
          (newGame)="newGame()"
          (saveReplay)="saveReplay()"
          (close)="closeModal()"
        />
      }
    </div>
  `,
  styles: `
    .game-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    }

    .game-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #374151;
    }

    .back-link {
      color: #9ca3af;
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .game-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .difficulty-select, .time-select {
      padding: 0.5rem 1rem;
      background: #374151;
      border: 1px solid #4b5563;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
    }

    .action-btn {
      padding: 0.5rem 1rem;
      background: #4f46e5;
      border: none;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background: #4338ca;
      }

      &:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
      }
    }

    .game-main {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr 280px;
      gap: 2rem;
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;

      @media (max-width: 1200px) {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @media (max-width: 1200px) {
        order: 2;
      }
    }

    .board-section {
      display: flex;
      align-items: flex-start;
      justify-content: center;

      @media (max-width: 1200px) {
        order: 1;
      }
    }

    .right-sidebar {
      @media (max-width: 1200px) {
        order: 3;
      }
    }

    .ai-status {
      min-height: 48px;
    }

    .thinking-indicator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #374151;
      border-radius: 0.5rem;
      color: #d1d5db;
      font-size: 0.875rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #6b7280;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .game-over-modal {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
      animation: fadeIn 0.3s ease;
    }

    .modal-content {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s ease;
    }

    .modal-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: white;
      margin: 0 0 1rem 0;
    }

    .winner-text {
      font-size: 1.125rem;
      color: #9ca3af;
      margin: 0 0 2rem 0;

      &.victory {
        color: #10b981;
      }

      &.defeat {
        color: #ef4444;
      }
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .modal-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      background: #374151;
      border: 1px solid #4b5563;
      color: white;

      &:hover {
        background: #4b5563;
      }

      &.primary {
        background: #4f46e5;
        border-color: #4f46e5;

        &:hover {
          background: #4338ca;
        }
      }

      &:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
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
  `,
})
export class GameAiComponent implements OnInit, OnDestroy {
  private readonly gameEngine = inject(GameEngineService);
  private readonly aiService = inject(AiService);
  private readonly timerService = inject(TimerService);
  private readonly replayService = inject(ReplayService);

  readonly gameResult = this.gameEngine.gameResult;
  readonly status = this.gameEngine.status;
  readonly currentPlayer = this.gameEngine.currentPlayer;

  readonly difficulty = signal<AIDifficulty>('medium');
  readonly isAiThinking = signal(false);
  readonly selectedTimeMode = signal<TimeMode>('unlimited');
  readonly showModal = signal(true);

  readonly timeModes = Object.values(TIME_MODES);

  readonly gameStats = computed(() => {
    if (this.status() !== 'finished') return undefined;
    return this.gameEngine.getGameStatistics() ?? undefined;
  });

  private aiTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly playerColor = 'white';
  private readonly aiColor = 'black';

  constructor() {
    // Watch for AI's turn
    effect(() => {
      const currentPlayer = this.currentPlayer();
      const status = this.status();

      if (status === 'playing' && currentPlayer === this.aiColor) {
        this.playAiMove();
      }
    });

    // Watch for timeout
    effect(() => {
      const timedOut = this.timerService.timedOutPlayer();
      if (timedOut) {
        this.gameEngine.handleTimeout(timedOut);
      }
    });
  }

  ngOnInit(): void {
    this.newGame();
  }

  ngOnDestroy(): void {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
    }
    this.timerService.stopTimer();
  }

  isGameOver(): boolean {
    return this.status() === 'finished' && this.showModal();
  }

  onTimeModeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedTimeMode.set(target.value as TimeMode);
  }

  newGame(): void {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
    }
    this.isAiThinking.set(false);
    this.showModal.set(true);
    this.gameEngine.startNewGame(this.selectedTimeMode());
  }

  setDifficulty(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.difficulty.set(target.value as AIDifficulty);
  }

  saveReplay(): void {
    const stats = this.gameStats();
    const result = this.gameResult();
    if (!stats) return;

    this.replayService.saveGame(
      this.gameEngine.gameState()?.moveHistory ?? [],
      this.gameEngine.getMaterialHistory(),
      'Vous',
      'IA (' + this.difficulty() + ')',
      result?.winner ?? null,
      result?.reason ?? '',
      'Dames Internationales',
      stats.duration
    );

    alert('Partie sauvegardée !');
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  private playAiMove(): void {
    const state = this.gameEngine.gameState();
    if (!state || state.status !== 'playing') return;

    this.isAiThinking.set(true);

    // Add a small delay for better UX
    this.aiTimeoutId = setTimeout(() => {
      const move = this.aiService.getBestMove(
        state,
        this.aiColor,
        this.difficulty()
      );

      if (move) {
        this.gameEngine.selectPiece(move.piece);
        this.gameEngine.executeMove(move);
      }

      this.isAiThinking.set(false);
    }, 500);
  }
}

