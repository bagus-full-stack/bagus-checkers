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
import { ludoAiMoveAsync } from '../../core/ai';
import { AIDifficulty, TimeMode, PlayerColor, Piece } from '../../core/models';
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
              [class.active]="playerColor() === 'red'" [attr.aria-pressed]="playerColor() === 'red'"
              (click)="setPlayerColor('red')"
              aria-label="Rouge : jouer avec les rouges"
            >Rouge</button>
            <button
              class="color-btn"
              [class.active]="playerColor() === 'blue'" [attr.aria-pressed]="playerColor() === 'blue'"
              (click)="setPlayerColor('blue')"
              aria-label="Bleu : jouer avec les bleus"
            >Bleu</button>
            <button
              class="color-btn"
              [class.active]="playerColor() === 'green'" [attr.aria-pressed]="playerColor() === 'green'"
              (click)="setPlayerColor('green')"
              aria-label="Vert : jouer avec les verts"
            >Vert</button>
            <button
              class="color-btn"
              [class.active]="playerColor() === 'yellow'" [attr.aria-pressed]="playerColor() === 'yellow'"
              (click)="setPlayerColor('yellow')"
              aria-label="Jaune : jouer avec les jaunes"
            >Jaune</button>
          </div>
          <button type="button" class="action-btn" (click)="newGame()">🔄 Nouvelle partie</button>
        </div>
      </header>

      <main class="game-main">
        <details class="ai-setup-box">
          <summary>Réglages : joueurs et algorithmes de l'IA</summary>
        <section class="ai-setup" aria-label="Réglages de la partie">
          <label class="setup-field">
            <span>Joueurs</span>
            <select class="difficulty-select" [value]="playerCount()" (change)="setPlayerCount($event)" aria-label="Nombre de joueurs">
              <option value="2">2 joueurs</option>
              <option value="3">3 joueurs</option>
              <option value="4">4 joueurs</option>
            </select>
          </label>
          <label class="setup-field">
            <span>Même algorithme pour tous</span>
            <select class="difficulty-select" (change)="setAllDifficulty($event)" aria-label="Même algorithme pour tous les IA">
              <option value="">Choisir…</option>
              @for (level of levels; track level.value) {
                <option [value]="level.value">{{ level.label }}</option>
              }
            </select>
          </label>
          @for (color of aiSeats(); track color) {
            <label class="setup-field">
              <span><span class="seat-dot" [style.background]="colorHex[color]" aria-hidden="true"></span>IA {{ colorName[color] }}</span>
              <select
                class="difficulty-select"
                [value]="difficulties()[color]"
                (change)="setSeatDifficulty(color, $event)"
                [attr.aria-label]="'Algorithme IA ' + colorName[color]"
              >
                @for (level of levels; track level.value) {
                  <option [value]="level.value">{{ level.label }}</option>
                }
              </select>
            </label>
          }
        </section>
        </details>

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
               </div>
             </div>
             <app-ludo-board
                [board]="board()"
                [selectedPiece]="undefined"
                [movablePieces]="movablePieces()"
                (pieceClicked)="onPieceClicked($event)"
                [diceCorner]="currentPlayer()">
                <app-dice
                  [value]="diceRoll()"
                  [isRolling]="isRolling()"
                  [disabled]="phase() !== 'rolling' || currentPlayer() !== playerColor()"
                  (roll)="onPlayerRollDice()"
                />
              </app-ludo-board>
          </div>
        </section>
      </main>

      @if (isGameOver()) {
        <app-game-over-modal-ludo
          [winner]="result()?.winner ?? null"
          [reason]="'Terminé'"
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
      color: #d1d5db;
    }

    :host-context(.light-theme) .selector-label {
      color: #4b5563;
    }

    /* Beats the global button styles, which left the chosen color almost unmarked */
    .color-selector .color-btn.active {
      background: #4f46e5 !important; /* global light-theme button rules out-rank any selector */
      color: #ffffff !important;
      font-weight: 700;
      box-shadow: 0 0 0 2px #c7d2fe;
    }

    .color-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.375rem;
      color: #d1d5db;
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
      color: #4b5563;

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

    .ai-setup-box { width: 100%; padding: 0 1rem; }
    .ai-setup-box summary {
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-primary);
      padding: 0.5rem 0;
    }
    .ai-setup-box summary:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }
    .ai-setup {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      align-items: flex-end;
      justify-content: center;
      width: 100%;
      padding: 0.5rem 1rem;
    }
    .setup-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .seat-dot {
      display: inline-block;
      width: 0.8em;
      height: 0.8em;
      margin-right: 0.35em;
      border-radius: 50%;
      border: 2px solid currentColor;
      vertical-align: -0.1em;
    }
    .ai-setup .difficulty-select { padding: 0.375rem 0.5rem; max-width: 100%; }

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
    /* Phones: free every pixel for the board so cells stay as large as possible */
    @media (max-width: 480px) {
      .game-header { padding: 0.5rem; gap: 0.5rem; flex-wrap: wrap; }
      .game-title { font-size: 1rem; text-align: center; }
      .action-btn { padding: 0.375rem 0.5rem; font-size: 0.75rem; white-space: nowrap; }
      .game-main { padding: 0; gap: 0.5rem; }
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
  readonly result = this.ludoEngine.result;
  readonly movablePieces = computed(() =>
    this.currentPlayer() === this.playerColor() ? this.ludoEngine.movableOptions().map(o => o.piece) : []
  );

  readonly levels: { value: AIDifficulty; label: string }[] = [
    { value: 'easy', label: 'Facile (au hasard, capture si possible)' },
    { value: 'medium', label: 'Moyen (anticipe 3 coups)' },
    { value: 'hard', label: 'Difficile (anticipe 5 coups)' },
    { value: 'expert', label: 'Expert (anticipe 7 coups)' },
    { value: 'master', label: 'Maître (simulations Monte-Carlo)' },
  ];
  readonly colorName: Record<string, string> = { red: 'Rouge', green: 'Vert', yellow: 'Jaune', blue: 'Bleu' };
  readonly colorHex: Record<string, string> = { red: '#ef4444', green: '#22c55e', yellow: '#eab308', blue: '#3b82f6' };

  /** Each color keeps its own algorithm, so settings survive a change of player count or color. */
  readonly difficulties = signal<Record<string, AIDifficulty>>({ red: 'medium', green: 'medium', yellow: 'medium', blue: 'medium' });
  readonly playerCount = signal(4);
  /** Turn order, clockwise, human first; two players sit opposite each other. */
  readonly seats = computed<PlayerColor[]>(() => {
    const start = this.colors.indexOf(this.playerColor());
    const ring = [...this.colors.slice(start), ...this.colors.slice(0, start)];
    return this.playerCount() === 2 ? [ring[0], ring[2]] : ring.slice(0, this.playerCount());
  });
  readonly aiSeats = computed(() => this.seats().slice(1));
  readonly isAiThinking = signal(false);
  readonly showModal = signal(true);
  readonly playerColor = signal<PlayerColor>('red');
  readonly isRolling = signal(false);

  private gameId = 0;
  private aiTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

  constructor() {
    // Auto-move: a single legal move (e.g. only one token out, no 6) plays itself
    effect((onCleanup) => {
      const options = this.ludoEngine.movableOptions();
      if (this.status() !== 'playing' || options.length !== 1 || this.currentPlayer() !== this.playerColor()) return;
      const timer = setTimeout(() => this.ludoEngine.moveTo(options[0].piece, options[0].destination), 450);
      onCleanup(() => clearTimeout(timer));
    });
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
    this.gameId++;
    this.isAiThinking.set(false);
    this.showModal.set(true);

    this.ludoEngine.startNewGame(this.seats());
  }

  setPlayerCount(event: Event): void {
    this.playerCount.set(Number((event.target as HTMLSelectElement).value));
    this.newGame();
  }

  setSeatDifficulty(color: string, event: Event): void {
    const level = (event.target as HTMLSelectElement).value as AIDifficulty;
    this.difficulties.update(d => ({ ...d, [color]: level }));
  }

  /** Same algorithm for every AI seat; the selector snaps back to its placeholder. */
  setAllDifficulty(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const level = select.value as AIDifficulty;
    if (!level) return;
    this.difficulties.set({ red: level, green: level, yellow: level, blue: level });
    select.value = '';
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
    const game = this.gameId;
    this.aiTimeoutId = setTimeout(async () => {
      const state = this.ludoEngine.gameState();
      const color = this.currentPlayer();
      const roll = this.diceRoll();
      const id = state && roll ? await ludoAiMoveAsync(state, color, roll, this.difficulties()[color] ?? 'medium') : null;
      if (game !== this.gameId) return; // a new game started while the AI was thinking
      const option = this.ludoEngine.movableOptions().find(o => o.piece.id === id);
      if (option) {
        this.ludoEngine.moveTo(option.piece, option.destination);
      }
      this.isAiThinking.set(false);
    }, 1000);
  }

  onPieceClicked(piece: Piece): void {
    if (this.currentPlayer() !== this.playerColor()) return;
    const option = this.ludoEngine.movableOptions().find(o => o.piece.id === piece.id);
    if (!option) return;
    this.ludoEngine.moveTo(option.piece, option.destination);
  }
}
