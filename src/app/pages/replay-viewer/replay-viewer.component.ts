import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReplayService } from '../../core/services/replay.service';
import { GameVariantService } from '../../core/services/game-variant.service';
import { SavedGame } from '../../core/models/replay.model';
import { Piece, createPosition, positionsEqual } from '../../core/models';
import { BoardComponent } from '../../components/board/board.component';
import { ReplayControlsComponent } from '../../components/replay-controls/replay-controls.component';
import { MaterialGraphComponent } from '../../components/material-graph/material-graph.component';

@Component({
  selector: 'app-replay-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReplayControlsComponent, MaterialGraphComponent],
  template: `
    <div class="replay-page">
      <header class="page-header">
        <a routerLink="/replays" class="back-link" aria-label="Retour aux parties">
          ← Parties sauvegardées
        </a>
        <h1 class="page-title">📼 Replay</h1>

        @if (game()) {
          <div class="game-info-header">
            <span class="player white">{{ game()!.metadata.whitePlayer }}</span>
            <span class="vs">vs</span>
            <span class="player black">{{ game()!.metadata.blackPlayer }}</span>
          </div>
        }
      </header>

      <main class="replay-content">
        @if (!game()) {
          <div class="error-state">
            <span class="error-icon">❌</span>
            <h2>Partie introuvable</h2>
            <p>Cette partie n'existe pas ou a été supprimée.</p>
            <a routerLink="/replays" class="btn btn-primary">
              Retour aux parties
            </a>
          </div>
        } @else {
          <div class="replay-layout">
            <aside class="sidebar">
              <div class="info-card">
                <h3>Informations</h3>
                <dl class="info-list">
                  <dt>Date</dt>
                  <dd>{{ formatDate(game()!.metadata.date) }}</dd>

                  <dt>Variante</dt>
                  <dd>{{ game()!.metadata.variant }}</dd>

                  <dt>Coups</dt>
                  <dd>{{ game()!.metadata.totalMoves }}</dd>

                  <dt>Durée</dt>
                  <dd>{{ formatDuration(game()!.metadata.duration) }}</dd>

                  <dt>Résultat</dt>
                  <dd class="result" [class]="getResultClass()">
                    {{ getResultText() }}
                  </dd>
                </dl>
              </div>

              @if (game()!.materialHistory.length > 1) {
                <app-material-graph [history]="game()!.materialHistory" />
              }
            </aside>

            <section class="board-section">
              <div class="replay-board">
                <div
                  class="board"
                  [style.--board-size]="boardSize()"
                >
                  @for (row of rows(); track row) {
                    @for (col of cols(); track col) {
                      @let piece = getPieceAt(row, col);
                      @let isLastFrom = isLastMoveFrom(row, col);
                      @let isLastTo = isLastMoveTo(row, col);

                      <div
                        class="square"
                        [class.dark]="isDarkSquare(row, col)"
                        [class.light]="!isDarkSquare(row, col)"
                        [class.last-move-from]="isLastFrom"
                        [class.last-move-to]="isLastTo"
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
              </div>

              <app-replay-controls />
            </section>

            <aside class="sidebar moves-sidebar">
              <div class="moves-card">
                <h3>Historique des coups</h3>
                <div class="moves-list">
                  @for (move of game()!.moves; track $index; let i = $index) {
                    <button
                      type="button"
                      class="move-item"
                      [class.active]="currentMoveIndex() === i"
                      [class.white-move]="move.piece.color === 'white'"
                      [class.black-move]="move.piece.color === 'black'"
                      (click)="goToMove(i)"
                    >
                      <span class="move-number">{{ i + 1 }}.</span>
                      <span class="move-notation">
                        {{ getMoveNotation(move) }}
                      </span>
                      @if (move.capturedPieces.length > 0) {
                        <span class="capture-badge">×{{ move.capturedPieces.length }}</span>
                      }
                    </button>
                  }
                </div>
              </div>
            </aside>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    .replay-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 2rem;
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
    }

    .back-link:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .game-info-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }

    .player {
      font-weight: 600;
    }

    .player.white {
      color: #f5f5f5;
    }

    .player.black {
      color: #9ca3af;
    }

    .vs {
      color: #6b7280;
      font-size: 0.75rem;
    }

    .replay-content {
      padding: 2rem;
    }

    .error-state {
      text-align: center;
      padding: 4rem 2rem;
      max-width: 400px;
      margin: 0 auto;
      background: #1f2937;
      border-radius: 1rem;
    }

    .error-icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .error-state h2 {
      color: white;
      margin: 0 0 0.5rem;
    }

    .error-state p {
      color: #9ca3af;
      margin: 0 0 1.5rem;
    }

    .btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      text-decoration: none;
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

    .replay-layout {
      display: grid;
      grid-template-columns: 280px 1fr 280px;
      gap: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-card, .moves-card {
      background: #1f2937;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .info-card h3, .moves-card h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.75rem;
    }

    .info-list {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }

    .info-list dt {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .info-list dd {
      color: white;
      font-weight: 500;
      margin: 0;
    }

    .result.white-win {
      color: #f5f5f5;
    }

    .result.black-win {
      color: #9ca3af;
    }

    .result.draw {
      color: #fbbf24;
    }

    .board-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .replay-board {
      aspect-ratio: 1;
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(var(--board-size), 1fr);
      grid-template-rows: repeat(var(--board-size), 1fr);
      border: 4px solid var(--board-border, #5d4e37);
      border-radius: 4px;
      aspect-ratio: 1;
    }

    .square {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .square.light {
      background: var(--board-light, #f0d9b5);
    }

    .square.dark {
      background: var(--board-dark, #b58863);
    }

    .square.last-move-from,
    .square.last-move-to {
      box-shadow: inset 0 0 0 3px rgba(255, 255, 0, 0.5);
    }

    .piece {
      width: 80%;
      height: 80%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
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

    .moves-sidebar {
      max-height: calc(100vh - 200px);
    }

    .moves-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
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
      padding: 0.5rem 0.75rem;
      background: #111827;
      border: none;
      border-radius: 0.375rem;
      color: #9ca3af;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
    }

    .move-item:hover {
      background: #374151;
      color: white;
    }

    .move-item.active {
      background: #4f46e5;
      color: white;
    }

    .move-item.white-move {
      border-left: 3px solid #f5f5f5;
    }

    .move-item.black-move {
      border-left: 3px solid #3d3d3d;
    }

    .move-number {
      color: #6b7280;
      min-width: 2rem;
    }

    .move-item.active .move-number {
      color: rgba(255, 255, 255, 0.7);
    }

    .capture-badge {
      margin-left: auto;
      padding: 0.125rem 0.375rem;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .move-item.active .capture-badge {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    @media (max-width: 1200px) {
      .replay-layout {
        grid-template-columns: 1fr;
        max-width: 600px;
      }

      .sidebar {
        order: 2;
      }

      .board-section {
        order: 1;
      }

      .moves-sidebar {
        order: 3;
        max-height: 300px;
      }
    }
  `,
})
export class ReplayViewerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly replayService = inject(ReplayService);
  private readonly variantService = inject(GameVariantService);

  private autoPlayInterval: ReturnType<typeof setInterval> | null = null;

  readonly game = this.replayService.currentGame;
  readonly currentMoveIndex = this.replayService.currentMoveIndex;
  readonly boardSize = this.variantService.boardSize;

  readonly rows = computed(() =>
    Array.from({ length: this.boardSize() }, (_, i) => i)
  );

  readonly cols = computed(() =>
    Array.from({ length: this.boardSize() }, (_, i) => i)
  );

  readonly currentPieces = computed(() => {
    const g = this.game();
    if (!g) return [];

    const moveIndex = this.currentMoveIndex();

    // Start with initial pieces and apply moves up to current index
    return this.reconstructPiecesAtMove(g, moveIndex);
  });

  readonly currentMove = computed(() => {
    const g = this.game();
    const idx = this.currentMoveIndex();
    if (!g || idx < 0 || idx >= g.moves.length) return null;
    return g.moves[idx];
  });

  constructor() {
    // Auto-play effect
    effect(() => {
      const state = this.replayService.replayState();
      if (state?.isPlaying) {
        this.startAutoPlay(state.playbackSpeed);
      } else {
        this.stopAutoPlay();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const gameId = this.route.snapshot.paramMap.get('id');
    if (gameId) {
      const game = await this.replayService.loadGame(gameId);
      if (game) {
        this.replayService.startReplay(game);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.replayService.stopReplay();
  }

  getPosition(row: number, col: number) {
    return createPosition(row, col);
  }

  isDarkSquare(row: number, col: number): boolean {
    return (row + col) % 2 === 1;
  }

  getPieceAt(row: number, col: number): Piece | null {
    return this.currentPieces().find(
      p => p.position.row === row && p.position.col === col
    ) ?? null;
  }

  isLastMoveFrom(row: number, col: number): boolean {
    const move = this.currentMove();
    return move ? move.from.row === row && move.from.col === col : false;
  }

  isLastMoveTo(row: number, col: number): boolean {
    const move = this.currentMove();
    return move ? move.to.row === row && move.to.col === col : false;
  }

  goToMove(index: number): void {
    this.replayService.goToMove(index);
  }

  getMoveNotation(move: { from: { row: number; col: number }; to: { row: number; col: number }; capturedPieces: readonly unknown[] }): string {
    const fromCol = String.fromCharCode(65 + move.from.col);
    const fromRow = move.from.row + 1;
    const toCol = String.fromCharCode(65 + move.to.col);
    const toRow = move.to.row + 1;
    const separator = move.capturedPieces.length > 0 ? 'x' : '-';
    return `${fromCol}${fromRow}${separator}${toCol}${toRow}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getResultClass(): string {
    const g = this.game();
    if (!g) return '';
    if (g.metadata.winner === 'white') return 'white-win';
    if (g.metadata.winner === 'black') return 'black-win';
    if (g.metadata.winner === 'draw') return 'draw';
    return '';
  }

  getResultText(): string {
    const g = this.game();
    if (!g) return '';
    if (g.metadata.winner === 'white') return 'Victoire Blancs';
    if (g.metadata.winner === 'black') return 'Victoire Noirs';
    if (g.metadata.winner === 'draw') return 'Match nul';
    return 'Inconnue';
  }

  private reconstructPiecesAtMove(game: SavedGame, moveIndex: number): Piece[] {
    // Get initial pieces from the first move's piece or reconstruct
    const initialPieces = this.getInitialPieces();

    if (moveIndex < 0) {
      return initialPieces;
    }

    let pieces = [...initialPieces];

    for (let i = 0; i <= moveIndex && i < game.moves.length; i++) {
      const move = game.moves[i];

      // Remove the piece from its original position
      pieces = pieces.filter(p =>
        !(p.position.row === move.from.row && p.position.col === move.from.col)
      );

      // Remove captured pieces
      for (const captured of move.capturedPieces) {
        pieces = pieces.filter(p => p.id !== captured.id);
      }

      // Add the piece at new position
      const movedPiece: Piece = {
        ...move.piece,
        position: move.to,
        type: move.isPromotion ? 'king' : move.piece.type,
      };
      pieces.push(movedPiece);
    }

    return pieces;
  }

  private getInitialPieces(): Piece[] {
    const pieces: Piece[] = [];
    const boardSize = this.boardSize();
    const initialRows = 4; // For 10x10 board

    let pieceId = 0;

    // Black pieces (top)
    for (let row = 0; row < initialRows; row++) {
      for (let col = 0; col < boardSize; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({
            id: `black-${pieceId++}`,
            color: 'black',
            type: 'pawn',
            position: createPosition(row, col),
          });
        }
      }
    }

    // White pieces (bottom)
    for (let row = boardSize - initialRows; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if ((row + col) % 2 === 1) {
          pieces.push({
            id: `white-${pieceId++}`,
            color: 'white',
            type: 'pawn',
            position: createPosition(row, col),
          });
        }
      }
    }

    return pieces;
  }

  private startAutoPlay(speed: number): void {
    this.stopAutoPlay();
    const interval = 1000 / speed;

    this.autoPlayInterval = setInterval(() => {
      const hasNext = this.replayService.nextMove();
      if (!hasNext) {
        this.replayService.toggleAutoPlay();
      }
    }, interval);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }
}

