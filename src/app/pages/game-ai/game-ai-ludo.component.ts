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
import { CommonModule } from '@angular/common';
import { LudoEngineService } from '../../core/services';
import { AIDifficulty, TimeMode, PlayerColor } from '../../core/models';
import {
  LudoBoardComponent,
  DiceComponent,
  GameInfoLudoComponent,
  GameOverModalLudoComponent,
} from '../../components';

@Component({
  selector: 'app-game-ai-ludo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, LudoBoardComponent, DiceComponent, GameInfoLudoComponent, GameOverModalLudoComponent],
  template: `
    <div class="game-container ludo-theme">
      <header class="game-header">
        <a routerLink="/" class="back-link" aria-label="Retour au menu">
          ← Menu
        </a>
        <h1 class="game-title">Partie contre l'IA (Ludo)</h1>
        <div class="header-actions">
          <div class="color-selector">
            <span class="selector-label">Votre couleur :</span>
            <button
              class="color-btn"
              [class.active]="playerColor() === 'red'"
              (click)="setPlayerColor('red')"
              aria-label="Jouer avec les rouges"
            >Rouge</button>
            <button
              class="color-btn"
              [class.active]="playerColor() === 'blue'"
              (click)="setPlayerColor('blue')"
              aria-label="Jouer avec les bleus"
            >Bleu</button>
          </div>
          <select
            class="difficulty-select"
            [value]="difficulty()"
            (change)="setDifficulty($event)"
            aria-label="Niveau de l'IA"
          >
            <option value="easy">Facile</option>
            <option value="medium">Moyen</option>
          </select>
          <button type="button" class="action-btn" (click)="newGame()">🔄 Nouvelle partie</button>
        </div>
      </header>

      <main class="game-main">
        <section class="board-section" aria-label="Plateau de jeu">
          <div style="display:flex; flex-direction:column; gap:1rem; align-items:center; width:100%;">
             <div style="display:flex; justify-content:space-between; width:100%; align-items:center; padding: 0 1rem;">
               <app-game-info-ludo />
               <div style="display:flex; align-items:center; gap:1rem;">
                 @if (isAiThinking()) {
                  <div class="thinking-indicator">
                    <span class="spinner" aria-hidden="true"></span>
                    L'IA réfléchit...
                  </div>
                 }
                 <span style="font-weight:bold; color:white;">Lancer le dé => </span>
                 <app-dice
                    [value]="diceRoll()"
                    [isRolling]="isRolling()"
                    [disabled]="phase() !== 'rolling' || currentPlayer() !== playerColor()"
                    (roll)="onPlayerRollDice()"
                  />
               </div>
             </div>
             <app-ludo-board
                [board]="board()"
                [selectedPiece]="undefined"
                [movablePieces]="[]"
              />
          </div>
        </section>
      </main>

      @if (isGameOver()) {
        <app-game-over-modal-ludo
          [winner]="null"
          [reason]="'En attente'"
          (newGame)="newGame()"
          (close)="closeModal()"
        />
      }
    </div>
  `,
  styles: `
    .ludo-theme {
      background: linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #451a03 100%);
    }

    :host-context(.light-theme) .ludo-theme {
      background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 50%, #fef3c7 100%);
    }

    .game-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      transition: background 0.3s ease;
    }

    :host-context(.light-theme) .game-container {
      background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
    }

    .game-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #374151;
    }

    :host-context(.light-theme) .game-header {
      background: rgba(255, 255, 255, 0.9);
      border-bottom-color: #d1d5db;
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

    :host-context(.light-theme) .back-link {
      color: #4b5563;

      &:hover {
        color: #111827;
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .game-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    :host-context(.light-theme) .game-title {
      color: #111827;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .color-selector {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: #374151;
      padding: 0.25rem;
      border-radius: 0.5rem;
    }

    :host-context(.light-theme) .color-selector {
      background: #e5e7eb;
    }

    .selector-label {
      padding: 0 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    :host-context(.light-theme) .selector-label {
      color: #6b7280;
    }

    .color-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.375rem;
      color: #9ca3af;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      &.active {
        background: #4f46e5;
        color: white;
      }
    }

    :host-context(.light-theme) .color-btn {
      color: #6b7280;

      &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #111827;
      }

      &.active {
        background: #4f46e5;
        color: white;
      }
    }

    .settings-bar {
      display: flex;
      justify-content: center;
      gap: 2rem;
      padding: 0.5rem 1rem;
      background: rgba(79, 70, 229, 0.1);
      border-bottom: 1px solid rgba(79, 70, 229, 0.2);
    }

    :host-context(.light-theme) .settings-bar {
      background: rgba(79, 70, 229, 0.05);
    }

    .setting-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .setting-icon {
      font-size: 1rem;
    }

    .setting-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #a5b4fc;
    }

    :host-context(.light-theme) .setting-value {
      color: #4f46e5;
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

    :host-context(.light-theme) .difficulty-select,
    :host-context(.light-theme) .time-select {
      background: #ffffff;
      border-color: #d1d5db;
      color: #111827;
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
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      padding: 1rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    .board-section {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
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

    :host-context(.light-theme) .thinking-indicator {
      background: #ffffff;
      color: #4b5563;
      border: 1px solid #e5e7eb;
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

    :host-context(.light-theme) .modal-content {
      background: #ffffff;
      color: #111827;
    }

    .modal-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: white;
      margin: 0 0 1rem 0;
    }

    :host-context(.light-theme) .modal-title {
      color: #111827;
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

    :host-context(.light-theme) .modal-btn {
      background: #f3f4f6;
      border-color: #d1d5db;
      color: #111827;

      &:hover {
        background: #e5e7eb;
      }

      &.primary {
        background: #4f46e5;
        color: white;
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
export class GameAiLudoComponent implements OnInit, OnDestroy {
  private readonly ludoEngine = inject(LudoEngineService);

  readonly status = this.ludoEngine.status;
  readonly board = this.ludoEngine.board;
  readonly phase = this.ludoEngine.phase;
  readonly diceRoll = this.ludoEngine.diceRoll;
  readonly currentPlayer = this.ludoEngine.currentPlayer;

  readonly difficulty = signal<AIDifficulty>('medium');
  readonly isAiThinking = signal(false);
  readonly showModal = signal(true);
  readonly playerColor = signal<PlayerColor>('red');
  readonly isRolling = signal(false);

  private aiTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

  constructor() {
    effect(() => {
      const currentPlayerColor = this.currentPlayer();
      const st = this.status();
      const currentPhase = this.phase();
      const isMyTurn = currentPlayerColor === this.playerColor();

      if (st === 'playing' && !isMyTurn) {
        if (currentPhase === 'rolling' && !this.isRolling()) {
          this.playAiRoll();
        } else if (currentPhase === 'moving') {
          this.playAiMove();
        }
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
  }

  isGameOver(): boolean {
    return this.status() === 'finished' && this.showModal();
  }

  newGame(): void {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId);
    }
    this.isAiThinking.set(false);
    this.showModal.set(true);

    // Play with 2 colors for simplicity in AI for now
    const aiColor = this.playerColor() === 'red' ? 'blue' : 'red';
    this.ludoEngine.startNewGame([this.playerColor(), aiColor]);
  }

  setDifficulty(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.difficulty.set(target.value as AIDifficulty);
  }

  setPlayerColor(color: PlayerColor): void {
    if (this.playerColor() !== color) {
      this.playerColor.set(color);
      this.newGame();
    }
  }

  onPlayerRollDice(): void {
    if (this.phase() !== 'rolling' || this.isRolling() || this.currentPlayer() !== this.playerColor()) return;
    this.isRolling.set(true);
    setTimeout(() => {
      this.ludoEngine.rollDice();
      this.isRolling.set(false);
    }, 500);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  private playAiRoll(): void {
    if (this.isRolling()) return;
    this.isAiThinking.set(true);
    this.isRolling.set(true);
    this.aiTimeoutId = setTimeout(() => {
      this.ludoEngine.rollDice();
      this.isRolling.set(false);
      this.isAiThinking.set(false);
    }, 1000);
  }

  private playAiMove(): void {
    this.isAiThinking.set(true);
    this.aiTimeoutId = setTimeout(() => {
       // Quick arbitrary random move for testing (as Ludo AI isn't fully implemented in AI service yet)
       const state = this.ludoEngine.gameState()
       if(state) {
         // Fake switch turn
         const roll = state.lastDiceRoll ?? 1;
         const pieces = state.pieces.filter(p => p.color === state.currentPlayer);
         // Simulate moving piece internally by calling an engine "force move" or doing it
         // Since engine doesn't have open API for arbitrary moves without validation currently we just force pass.
         // We would ideally call: this.ludoEngine.moveTo(...)
         console.warn("AI Moving not fully mapped in strict board tracks yet.");
       }
       this.isAiThinking.set(false);
    }, 1000);
  }
}
