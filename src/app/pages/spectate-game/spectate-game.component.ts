import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SpectatorService } from '../../core/services/spectator.service';
import { GameVariantService } from '../../core/services/game-variant.service';
import { Piece, createPosition } from '../../core/models';

@Component({
  selector: 'app-spectate-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="spectate-game-page">
      <header class="page-header">
        <a routerLink="/spectate" class="back-link" (click)="stopSpectating()">
          ← Parties en direct
        </a>

        @if (currentGame(); as game) {
          <div class="game-title">
            <span class="player white">{{ game.game.whitePlayer.name }}</span>
            <span class="vs">VS</span>
            <span class="player black">{{ game.game.blackPlayer.name }}</span>
          </div>

          <div class="live-badge">
            <span class="live-dot"></span>
            EN DIRECT
            <span class="viewer-count">👁️ {{ game.liveViewers }}</span>
          </div>
        }
      </header>

      <main class="spectate-main">
        @if (!currentGame()) {
          <div class="loading-state">
            <span class="spinner"></span>
            <p>Chargement de la partie...</p>
          </div>
        } @else {
          <aside class="sidebar left-sidebar">
            <!-- White Player Info -->
            <div class="player-card white" [class.active]="currentGame()!.gameState.currentPlayer === 'white'">
              <div class="player-avatar">
                {{ currentGame()!.game.whitePlayer.name.charAt(0).toUpperCase() }}
              </div>
              <div class="player-details">
                <span class="player-name">{{ currentGame()!.game.whitePlayer.name }}</span>
                <span class="player-rating">{{ currentGame()!.game.whitePlayer.rating }}</span>
              </div>
              <div class="captured-pieces">
                @for (i of getCapturedCount('black'); track i) {
                  <span class="captured-piece black">●</span>
                }
              </div>
            </div>

            <!-- Game Stats -->
            <div class="game-stats">
              <div class="stat">
                <span class="stat-label">Coups</span>
                <span class="stat-value">{{ currentGame()!.game.moveCount }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Variante</span>
                <span class="stat-value">{{ currentGame()!.game.variant }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Temps</span>
                <span class="stat-value">{{ currentGame()!.game.timeMode }}</span>
              </div>
            </div>

            <!-- Black Player Info -->
            <div class="player-card black" [class.active]="currentGame()!.gameState.currentPlayer === 'black'">
              <div class="player-avatar">
                {{ currentGame()!.game.blackPlayer.name.charAt(0).toUpperCase() }}
              </div>
              <div class="player-details">
                <span class="player-name">{{ currentGame()!.game.blackPlayer.name }}</span>
                <span class="player-rating">{{ currentGame()!.game.blackPlayer.rating }}</span>
              </div>
              <div class="captured-pieces">
                @for (i of getCapturedCount('white'); track i) {
                  <span class="captured-piece white">●</span>
                }
              </div>
            </div>
          </aside>

          <section class="board-section">
            <div
              class="board"
              [style.--board-size]="boardSize()"
            >
              @for (row of rows(); track row) {
                @for (col of cols(); track col) {
                  @let piece = getPieceAt(row, col);
                  <div
                    class="square"
                    [class.dark]="isDarkSquare(row, col)"
                    [class.light]="!isDarkSquare(row, col)"
                  >
                    @if (piece) {
                      <div
                        class="piece"
                        [class.white]="piece.color === 'white'"
                        [class.black]="piece.color === 'black'"
                        [class.king]="piece.type === 'king'"
                      >
                        @if (piece.type === 'king') {
                          <span class="crown">♔</span>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>

            @if (currentGame()!.game.status === 'finished') {
              <div class="game-over-overlay">
                <div class="game-over-content">
                  <h2>Partie terminée</h2>
                  <p>{{ getWinnerText() }}</p>
                </div>
              </div>
            }
          </section>

          <aside class="sidebar right-sidebar">
            <!-- Comments Section -->
            <div class="comments-section">
              <h3 class="section-title">💬 Commentaires</h3>

              <div class="comments-list">
                @for (comment of comments(); track comment.id) {
                  <div class="comment" [class.highlighted]="comment.isHighlighted">
                    <span class="comment-author">{{ comment.playerName }}</span>
                    <span class="comment-text">{{ comment.message }}</span>
                    <span class="comment-time">{{ formatTime(comment.timestamp) }}</span>
                  </div>
                }
                @if (comments().length === 0) {
                  <p class="no-comments">Aucun commentaire. Soyez le premier !</p>
                }
              </div>

              <form class="comment-form" (submit)="sendComment($event)">
                <input
                  type="text"
                  class="comment-input"
                  [(ngModel)]="commentInput"
                  name="commentInput"
                  placeholder="Ajouter un commentaire..."
                  maxlength="200"
                  autocomplete="off"
                />
                <button type="submit" class="send-btn" [disabled]="!commentInput().trim()">
                  Envoyer
                </button>
              </form>
            </div>

            <!-- Move History -->
            <div class="moves-section">
              <h3 class="section-title">📋 Historique</h3>
              <div class="moves-list">
                @for (move of currentGame()!.gameState.moveHistory; track $index; let i = $index) {
                  <div class="move-item" [class.white]="move.piece.color === 'white'" [class.black]="move.piece.color === 'black'">
                    <span class="move-number">{{ i + 1 }}.</span>
                    <span class="move-notation">{{ getMoveNotation(move) }}</span>
                  </div>
                }
              </div>
            </div>
          </aside>
        }
      </main>
    </div>
  `,
  styles: `
    .spectate-game-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      display: flex;
      flex-direction: column;
      transition: background 0.3s ease;
    }

    :host-context(.light-theme) .spectate-game-page {
      background: linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%);
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1rem 2rem;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid #374151;
    }

    :host-context(.light-theme) .page-header {
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
    }

    .back-link:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    :host-context(.light-theme) .back-link {
      color: #4b5563;
    }

    :host-context(.light-theme) .back-link:hover {
      color: #111827;
      background: rgba(0, 0, 0, 0.05);
    }

    .game-title {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .game-title .white {
      color: #f5f5f5;
    }

    :host-context(.light-theme) .game-title .white {
      color: #4b5563;
    }

    .game-title .black {
      color: #9ca3af;
    }

    :host-context(.light-theme) .game-title .black {
      color: #111827;
    }

    .game-title .vs {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 9999px;
      color: #ef4444;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .viewer-count {
      color: #9ca3af;
      font-weight: 400;
    }

    .spectate-main {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr 320px;
      gap: 2rem;
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    .loading-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 4rem;
      color: #9ca3af;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #374151;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .player-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #1f2937;
      border-radius: 0.75rem;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .player-card.active {
      border-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.3);
    }

    .player-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .player-card.white .player-avatar {
      background: linear-gradient(145deg, #f5f5f5, #d4d4d4);
      color: #1f2937;
    }

    .player-card.black .player-avatar {
      background: linear-gradient(145deg, #3d3d3d, #1a1a1a);
      color: white;
    }

    .player-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .player-name {
      font-weight: 600;
      color: white;
    }

    .player-rating {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .captured-pieces {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      max-width: 60px;
    }

    .captured-piece {
      font-size: 0.75rem;
    }

    .captured-piece.white {
      color: #f5f5f5;
    }

    .captured-piece.black {
      color: #4b5563;
    }

    .game-stats {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: #1f2937;
      border-radius: 0.75rem;
    }

    .stat {
      display: flex;
      justify-content: space-between;
    }

    .stat-label {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .stat-value {
      color: white;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .board-section {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      position: relative;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(var(--board-size), 1fr);
      grid-template-rows: repeat(var(--board-size), 1fr);
      border: 4px solid #5d4e37;
      border-radius: 4px;
      aspect-ratio: 1;
      width: 100%;
      max-width: 600px;
    }

    .square {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .square.light {
      background: #f0d9b5;
    }

    .square.dark {
      background: #b58863;
    }

    .piece {
      width: 80%;
      height: 80%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }

    .piece.white {
      background: linear-gradient(145deg, #f5f5f5, #d4d4d4);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .piece.black {
      background: linear-gradient(145deg, #3d3d3d, #1a1a1a);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    }

    .crown {
      font-size: 1.25rem;
    }

    .piece.white .crown {
      color: #8b5a2b;
    }

    .piece.black .crown {
      color: #ffd700;
    }

    .game-over-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 4px;
    }

    .game-over-content {
      text-align: center;
      padding: 2rem;
      background: #1f2937;
      border-radius: 1rem;
    }

    .game-over-content h2 {
      color: white;
      margin: 0 0 0.5rem;
    }

    .game-over-content p {
      color: #9ca3af;
      margin: 0;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.75rem;
    }

    .comments-section {
      background: #1f2937;
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      max-height: 350px;
    }

    .comments-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      min-height: 150px;
    }

    .comment {
      padding: 0.5rem 0.75rem;
      background: #374151;
      border-radius: 0.5rem;
    }

    .comment.highlighted {
      background: rgba(79, 70, 229, 0.2);
      border: 1px solid rgba(79, 70, 229, 0.4);
    }

    .comment-author {
      font-size: 0.75rem;
      font-weight: 600;
      color: #4f46e5;
      margin-right: 0.5rem;
    }

    .comment-text {
      font-size: 0.875rem;
      color: white;
    }

    .comment-time {
      display: block;
      font-size: 0.625rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .no-comments {
      color: #6b7280;
      font-style: italic;
      text-align: center;
      margin: auto;
      font-size: 0.875rem;
    }

    .comment-form {
      display: flex;
      gap: 0.5rem;
    }

    .comment-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: #374151;
      border: 1px solid #4b5563;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
    }

    .comment-input:focus {
      outline: none;
      border-color: #4f46e5;
    }

    .send-btn {
      padding: 0.5rem 1rem;
      background: #4f46e5;
      border: none;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .moves-section {
      background: #1f2937;
      border-radius: 0.75rem;
      padding: 1rem;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .moves-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .move-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      background: #111827;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .move-item.white {
      border-left: 2px solid #f5f5f5;
    }

    .move-item.black {
      border-left: 2px solid #4b5563;
    }

    .move-number {
      color: #6b7280;
      min-width: 1.5rem;
    }

    .move-notation {
      color: white;
    }

    @media (max-width: 1200px) {
      .spectate-main {
        grid-template-columns: 1fr;
      }

      .sidebar {
        flex-direction: row;
        flex-wrap: wrap;
      }

      .left-sidebar {
        order: 2;
      }

      .board-section {
        order: 1;
      }

      .right-sidebar {
        order: 3;
      }
    }
  `,
})
export class SpectateGameComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly spectatorService = inject(SpectatorService);
  private readonly variantService = inject(GameVariantService);

  readonly currentGame = this.spectatorService.currentSpectating;
  readonly comments = this.spectatorService.comments;
  readonly boardSize = this.variantService.boardSize;

  readonly commentInput = signal('');

  readonly rows = computed(() =>
    Array.from({ length: this.boardSize() }, (_, i) => i)
  );

  readonly cols = computed(() =>
    Array.from({ length: this.boardSize() }, (_, i) => i)
  );

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      this.spectatorService.spectateGame(gameId);
    } else {
      this.router.navigate(['/spectate']);
    }
  }

  ngOnDestroy(): void {
    this.spectatorService.stopSpectating();
  }

  stopSpectating(): void {
    this.spectatorService.stopSpectating();
  }

  isDarkSquare(row: number, col: number): boolean {
    return (row + col) % 2 === 1;
  }

  getPieceAt(row: number, col: number): Piece | null {
    const game = this.currentGame();
    if (!game) return null;

    return game.gameState.pieces.find(
      p => p.position.row === row && p.position.col === col
    ) ?? null;
  }

  getCapturedCount(color: 'white' | 'black'): number[] {
    const game = this.currentGame();
    if (!game) return [];

    const initialCount = 20; // For 10x10 board
    const currentCount = game.gameState.pieces.filter(p => p.color === color).length;
    const captured = initialCount - currentCount;

    return Array.from({ length: Math.max(0, captured) }, (_, i) => i);
  }

  getMoveNotation(move: { from: { row: number; col: number }; to: { row: number; col: number }; capturedPieces: readonly unknown[] }): string {
    const fromCol = String.fromCharCode(65 + move.from.col);
    const fromRow = move.from.row + 1;
    const toCol = String.fromCharCode(65 + move.to.col);
    const toRow = move.to.row + 1;
    const separator = move.capturedPieces.length > 0 ? 'x' : '-';
    return `${fromCol}${fromRow}${separator}${toCol}${toRow}`;
  }

  getWinnerText(): string {
    const game = this.currentGame();
    if (!game) return '';

    const result = game.gameState.result;
    if (!result) return 'Partie terminée';

    if (result.winner === 'draw') return 'Match nul !';

    const winnerName = result.winner === 'white'
      ? game.game.whitePlayer.name
      : game.game.blackPlayer.name;

    return `${winnerName} a gagné !`;
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  sendComment(event: Event): void {
    event.preventDefault();
    const message = this.commentInput().trim();
    if (message) {
      this.spectatorService.sendComment(message);
      this.commentInput.set('');
    }
  }
}

