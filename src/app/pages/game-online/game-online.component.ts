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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameEngineService, OnlineService } from '../../core/services';
import { ChatMessage, PlayerColor } from '../../core/models';
import {
  BoardComponent,
  MoveHistoryComponent,
  GameInfoComponent,
} from '../../components';

@Component({
  selector: 'app-game-online',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, BoardComponent, MoveHistoryComponent, GameInfoComponent],
  template: `
    <div class="game-container">
      <header class="game-header">
        <a routerLink="/game/online" class="back-link" (click)="leaveRoom()" aria-label="Retour au lobby">
          ← Lobby
        </a>
        <h1 class="game-title">Partie en ligne</h1>
        <div class="connection-indicator" [class]="connectionStatus()">
          <span class="status-dot" aria-hidden="true"></span>
          {{ connectionStatus() === 'connected' ? 'Connecté' : 'Déconnecté' }}
        </div>
      </header>

      <main class="game-main">
        <aside class="sidebar left-sidebar">
          <app-game-info />

          <!-- Opponent Info -->
          <div class="opponent-section">
            <h3 class="section-label">Adversaire</h3>
            @if (opponent()) {
              <div class="opponent-info" [class.disconnected]="!opponent()?.isConnected">
                <span class="opponent-name">{{ opponent()?.name }}</span>
                @if (!opponent()?.isConnected) {
                  <span class="opponent-status">Déconnecté</span>
                }
              </div>
            } @else {
              <div class="waiting-opponent">
                <span class="spinner" aria-hidden="true"></span>
                En attente d'un adversaire...
              </div>
            }
          </div>

          <!-- Ready Section (before game starts) -->
          @if (roomStatus() === 'waiting' || roomStatus() === 'ready') {
            <div class="ready-section">
              <label class="ready-toggle">
                <input
                  type="checkbox"
                  [checked]="isReady()"
                  (change)="toggleReady()"
                  [disabled]="!opponent()"
                />
                <span class="toggle-text">Je suis prêt</span>
              </label>
              @if (isHost()) {
                <p class="room-code">
                  Code: <strong>{{ roomId() }}</strong>
                </p>
              }
            </div>
          }
        </aside>

        <section class="board-section" aria-label="Plateau de jeu">
          @if (roomStatus() === 'playing') {
            <app-board />
          } @else {
            <div class="waiting-screen">
              <div class="waiting-content">
                <h2>En attente</h2>
                @if (!opponent()) {
                  <p>Partagez le code de la salle avec votre adversaire</p>
                  <div class="room-code-display">
                    <span class="code">{{ roomId() }}</span>
                    <button type="button" class="copy-btn" (click)="copyRoomCode()">
                      📋 Copier
                    </button>
                  </div>
                } @else if (!isReady() || !opponentReady()) {
                  <p>En attente que les deux joueurs soient prêts...</p>
                  <div class="ready-status">
                    <span [class.ready]="isReady()">
                      Vous: {{ isReady() ? '✅ Prêt' : '⏳ En attente' }}
                    </span>
                    <span [class.ready]="opponentReady()">
                      {{ opponent()?.name }}: {{ opponentReady() ? '✅ Prêt' : '⏳ En attente' }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        </section>

        <aside class="sidebar right-sidebar">
          <!-- Chat -->
          <div class="chat-section">
            <h3 class="section-label">Chat</h3>
            <div class="chat-messages" role="log" aria-live="polite">
              @for (msg of chatMessages(); track msg.id) {
                <div class="chat-message" [class.own]="msg.playerId === currentPlayer()?.id">
                  <span class="msg-author">{{ msg.playerName }}</span>
                  <span class="msg-text">{{ msg.message }}</span>
                </div>
              }
              @if (chatMessages().length === 0) {
                <p class="chat-empty">Aucun message</p>
              }
            </div>
            <form class="chat-input-form" (submit)="sendMessage($event)">
              <input
                type="text"
                class="chat-input"
                [(ngModel)]="chatInput"
                name="chatInput"
                placeholder="Votre message..."
                maxlength="200"
                autocomplete="off"
              />
              <button type="submit" class="send-btn" [disabled]="!chatInput().trim()">
                Envoyer
              </button>
            </form>
          </div>

          <app-move-history />
        </aside>
      </main>

      @if (isGameOver()) {
        <div
          class="game-over-modal"
          role="dialog"
          aria-labelledby="game-over-title"
          aria-modal="true"
        >
          <div class="modal-content">
            <h2 id="game-over-title" class="modal-title">Partie terminée !</h2>
            @if (isWinner()) {
              <p class="winner-text victory">Vous avez gagné ! 🎉</p>
            } @else if (gameResult()?.winner === 'draw') {
              <p class="winner-text">Match nul !</p>
            } @else {
              <p class="winner-text defeat">Vous avez perdu...</p>
            }
            <div class="modal-actions">
              <button type="button" class="modal-btn primary" (click)="requestRematch()">
                Revanche
              </button>
              <a routerLink="/game/online" class="modal-btn" (click)="leaveRoom()">
                Retour au lobby
              </a>
            </div>
          </div>
        </div>
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
    }

    .game-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .connection-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.1);

      &.connected {
        color: #10b981;
      }
      &.disconnected, &.error {
        color: #ef4444;
      }
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .game-main {
      flex: 1;
      display: grid;
      grid-template-columns: 280px 1fr 300px;
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
    }

    .section-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .opponent-section {
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .opponent-info {
      display: flex;
      align-items: center;
      justify-content: space-between;

      &.disconnected {
        opacity: 0.6;
      }
    }

    .opponent-name {
      font-weight: 600;
    }

    .opponent-status {
      font-size: 0.75rem;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .waiting-opponent {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #9ca3af;
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

    .ready-section {
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .ready-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;

      input {
        width: 20px;
        height: 20px;
        accent-color: #10b981;
      }

      input:disabled {
        cursor: not-allowed;
      }
    }

    .toggle-text {
      font-weight: 500;
    }

    .room-code {
      margin: 1rem 0 0 0;
      font-size: 0.875rem;
      color: #9ca3af;

      strong {
        color: white;
        font-family: monospace;
        background: #374151;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
      }
    }

    .board-section {
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .waiting-screen {
      width: 100%;
      max-width: 600px;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #374151;
      border-radius: 0.5rem;
    }

    .waiting-content {
      text-align: center;
      padding: 2rem;

      h2 {
        font-size: 1.5rem;
        margin: 0 0 1rem 0;
        color: white;
      }

      p {
        color: #9ca3af;
        margin: 0 0 1.5rem 0;
      }
    }

    .room-code-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .code {
      font-family: monospace;
      font-size: 1.5rem;
      background: #1f2937;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      letter-spacing: 0.1em;
    }

    .copy-btn {
      padding: 0.75rem 1rem;
      background: #4f46e5;
      border: none;
      border-radius: 0.5rem;
      color: white;
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: #4338ca;
      }
    }

    .ready-status {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #1f2937;
      padding: 1rem;
      border-radius: 0.5rem;

      span {
        color: #9ca3af;

        &.ready {
          color: #10b981;
        }
      }
    }

    .chat-section {
      background: #1f2937;
      border-radius: 0.5rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      max-height: 300px;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      min-height: 100px;
    }

    .chat-empty {
      color: #6b7280;
      text-align: center;
      font-style: italic;
      margin: auto;
    }

    .chat-message {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.75rem;
      background: #374151;
      border-radius: 0.5rem;
      max-width: 85%;

      &.own {
        align-self: flex-end;
        background: #4f46e5;
      }
    }

    .msg-author {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-bottom: 0.25rem;
    }

    .chat-message.own .msg-author {
      color: #c7d2fe;
    }

    .msg-text {
      font-size: 0.875rem;
      word-break: break-word;
    }

    .chat-input-form {
      display: flex;
      gap: 0.5rem;
    }

    .chat-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: #374151;
      border: 1px solid #4b5563;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;

      &:focus {
        outline: none;
        border-color: #4f46e5;
      }

      &::placeholder {
        color: #6b7280;
      }
    }

    .send-btn {
      padding: 0.5rem 1rem;
      background: #4f46e5;
      border: none;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #4338ca;
      }
    }

    .game-over-modal {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100;
    }

    .modal-content {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
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

      &.victory { color: #10b981; }
      &.defeat { color: #ef4444; }
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
      background: #374151;
      border: 1px solid #4b5563;
      color: white;

      &:hover { background: #4b5563; }

      &.primary {
        background: #4f46e5;
        border-color: #4f46e5;
        &:hover { background: #4338ca; }
      }
    }
  `,
})
export class GameOnlineComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameEngine = inject(GameEngineService);
  private readonly onlineService = inject(OnlineService);

  readonly connectionStatus = this.onlineService.connectionStatus;
  readonly currentPlayer = this.onlineService.currentPlayer;
  readonly currentRoom = this.onlineService.currentRoom;
  readonly chatMessages = this.onlineService.chatMessages;
  readonly gameResult = this.gameEngine.gameResult;
  readonly status = this.gameEngine.status;

  readonly chatInput = signal('');
  readonly isReady = signal(false);

  readonly roomId = computed(() => this.currentRoom()?.id ?? '');
  readonly roomStatus = computed(() => this.currentRoom()?.status ?? 'waiting');
  readonly isHost = computed(() => {
    const room = this.currentRoom();
    const player = this.currentPlayer();
    return room?.hostPlayer.id === player?.id;
  });

  readonly opponent = computed(() => {
    const room = this.currentRoom();
    const player = this.currentPlayer();
    if (!room || !player) return null;

    if (room.hostPlayer.id === player.id) {
      return room.guestPlayer ?? null;
    }
    return room.hostPlayer;
  });

  readonly opponentReady = computed(() => this.opponent()?.isReady ?? false);

  readonly myColor = computed((): PlayerColor => {
    const room = this.currentRoom();
    const player = this.currentPlayer();
    if (!room || !player) return 'white';
    return room.hostPlayer.id === player.id ? 'white' : 'black';
  });

  constructor() {
    // Watch for game state updates from server
    effect(() => {
      const room = this.currentRoom();
      if (room?.status === 'playing') {
        // Initialize game when it starts
        if (this.status() !== 'playing') {
          this.gameEngine.startNewGame();
        }
      }
    });
  }

  ngOnInit(): void {
    // Check if we have a room, if not redirect to lobby
    if (!this.currentRoom()) {
      const roomId = this.route.snapshot.paramMap.get('roomId');
      if (roomId && this.onlineService.isConnected()) {
        this.onlineService.joinRoom(roomId);
      } else {
        this.router.navigate(['/game/online']);
      }
    }
  }

  ngOnDestroy(): void {
    // Don't automatically leave room on destroy
    // User might just be navigating temporarily
  }

  isGameOver(): boolean {
    return this.status() === 'finished';
  }

  isWinner(): boolean {
    const result = this.gameResult();
    return result?.winner === this.myColor();
  }

  toggleReady(): void {
    this.isReady.update((v) => !v);
    this.onlineService.setReady(this.isReady());
  }

  copyRoomCode(): void {
    const code = this.roomId();
    if (code) {
      navigator.clipboard.writeText(code).catch(console.error);
    }
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    const message = this.chatInput().trim();
    if (message) {
      this.onlineService.sendChatMessage(message);
      this.chatInput.set('');
    }
  }

  leaveRoom(): void {
    this.onlineService.leaveRoom();
  }

  requestRematch(): void {
    // Reset ready state and request rematch
    this.isReady.set(false);
    // In a real implementation, this would send a rematch request to server
  }
}

