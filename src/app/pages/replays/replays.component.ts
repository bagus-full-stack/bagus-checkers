import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReplayService } from '../../core/services/replay.service';
import { SavedGameMetadata } from '../../core/models/replay.model';

@Component({
  selector: 'app-replays',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="replays-page">
      <header class="page-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="page-title">📼 Parties Sauvegardées</h1>

        <div class="header-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="openImportDialog()"
          >
            📥 Importer
          </button>
        </div>
      </header>

      <main class="replays-content">
        @if (savedGames().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">📂</span>
            <h2>Aucune partie sauvegardée</h2>
            <p>Les parties terminées peuvent être sauvegardées pour être rejouées plus tard.</p>
          </div>
        } @else {
          <div class="games-list">
            @for (game of savedGames(); track game.id) {
              <article class="game-card">
                <div class="game-info">
                  <div class="game-players">
                    <span class="player white">{{ game.whitePlayer }}</span>
                    <span class="vs">vs</span>
                    <span class="player black">{{ game.blackPlayer }}</span>
                  </div>

                  <div class="game-meta">
                    <span class="game-date">{{ formatDate(game.date) }}</span>
                    <span class="game-moves">{{ game.totalMoves }} coups</span>
                    <span class="game-duration">{{ formatDuration(game.duration) }}</span>
                  </div>

                  <div class="game-result" [class]="getResultClass(game)">
                    @if (game.winner === 'white') {
                      Victoire Blancs
                    } @else if (game.winner === 'black') {
                      Victoire Noirs
                    } @else if (game.winner === 'draw') {
                      Match nul
                    } @else {
                      En cours
                    }
                  </div>
                </div>

                <div class="game-actions">
                  <a
                    [routerLink]="['/replay', game.id]"
                    class="action-btn primary"
                    aria-label="Regarder la partie"
                  >
                    ▶️ Regarder
                  </a>

                  <button
                    type="button"
                    class="action-btn"
                    (click)="exportGame(game.id)"
                    aria-label="Exporter la partie"
                  >
                    📤
                  </button>

                  <button
                    type="button"
                    class="action-btn danger"
                    (click)="deleteGame(game.id)"
                    aria-label="Supprimer la partie"
                  >
                    🗑️
                  </button>
                </div>
              </article>
            }
          </div>
        }

        <!-- Import dialog -->
        @if (showImportDialog()) {
          <div class="modal-backdrop" (click)="closeImportDialog()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <h2 class="modal-title">Importer une partie</h2>

              <textarea
                class="import-textarea"
                placeholder="Collez le JSON de la partie ici..."
                [value]="importText()"
                (input)="onImportInput($event)"
                rows="10"
              ></textarea>

              @if (importError()) {
                <p class="import-error">{{ importError() }}</p>
              }

              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="importGame()"
                  [disabled]="!importText()"
                >
                  Importer
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="closeImportDialog()"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    .replays-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      transition: background 0.3s ease;
    }

    :host-context(.light-theme) .replays-page {
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

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
      flex: 1;
    }

    :host-context(.light-theme) .page-title {
      color: #111827;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.5rem 1rem;
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

    .btn-primary:hover:not(:disabled) {
      background: #4338ca;
    }

    .btn-secondary {
      background: #374151;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .replays-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #1f2937;
      border-radius: 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: white;
      margin: 0 0 0.5rem;
    }

    .empty-state p {
      color: #9ca3af;
      margin: 0;
    }

    .games-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .game-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1f2937;
      border-radius: 0.75rem;
      padding: 1.25rem;
      transition: all 0.15s ease;
    }

    .game-card:hover {
      background: #374151;
    }

    .game-info {
      flex: 1;
    }

    .game-players {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
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

    .game-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .game-result {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .game-result.white-win {
      background: rgba(245, 245, 245, 0.2);
      color: #f5f5f5;
    }

    .game-result.black-win {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
    }

    .game-result.draw {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .game-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 0.75rem;
      background: #374151;
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: #4b5563;
    }

    .action-btn.primary {
      background: #4f46e5;
      font-size: 0.875rem;
    }

    .action-btn.primary:hover {
      background: #4338ca;
    }

    .action-btn.danger:hover {
      background: #dc2626;
    }

    .action-btn:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }

    .modal-content {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
    }

    .modal-title {
      color: white;
      margin: 0 0 1rem;
    }

    .import-textarea {
      width: 100%;
      padding: 0.75rem;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      color: white;
      font-family: monospace;
      font-size: 0.875rem;
      resize: vertical;
    }

    .import-textarea:focus {
      outline: none;
      border-color: #4f46e5;
    }

    .import-error {
      color: #ef4444;
      font-size: 0.875rem;
      margin: 0.5rem 0 0;
    }

    .modal-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    @media (max-width: 600px) {
      .game-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .game-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `,
})
export class ReplaysComponent {
  private readonly replayService = inject(ReplayService);

  readonly savedGames = this.replayService.savedGames;
  readonly showImportDialog = signal(false);
  readonly importText = signal('');
  readonly importError = signal('');

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getResultClass(game: SavedGameMetadata): string {
    if (game.winner === 'white') return 'white-win';
    if (game.winner === 'black') return 'black-win';
    if (game.winner === 'draw') return 'draw';
    return '';
  }

  async exportGame(gameId: string): Promise<void> {
    const json = await this.replayService.exportGame(gameId);
    if (json) {
      // Copy to clipboard
      navigator.clipboard.writeText(json).then(() => {
        alert('Partie copiée dans le presse-papiers !');
      }).catch(() => {
        // Fallback: show in a prompt
        prompt('Copiez ce JSON:', json);
      });
    }
  }

  deleteGame(gameId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette partie ?')) {
      this.replayService.deleteGame(gameId);
    }
  }

  openImportDialog(): void {
    this.showImportDialog.set(true);
    this.importText.set('');
    this.importError.set('');
  }

  closeImportDialog(): void {
    this.showImportDialog.set(false);
  }

  onImportInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.importText.set(target.value);
    this.importError.set('');
  }

  importGame(): void {
    const text = this.importText();
    if (!text) return;

    const gameId = this.replayService.importGame(text);
    if (gameId) {
      this.closeImportDialog();
    } else {
      this.importError.set('Format JSON invalide. Vérifiez le contenu.');
    }
  }
}

