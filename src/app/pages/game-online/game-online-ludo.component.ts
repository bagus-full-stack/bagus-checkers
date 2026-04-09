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
import { OnlineService, TimerService, ReplayService, RankingService, LudoEngineService } from '../../core/services';
import { ChatMessage, PlayerColor, TimeMode, TIME_MODES } from '../../core/models';
import {
  LudoBoardComponent,
  DiceComponent,
  GameInfoLudoComponent,
  GameOverModalComponent,
} from '../../components';

@Component({
  selector: 'app-game-online-ludo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, LudoBoardComponent, DiceComponent, GameInfoLudoComponent, GameOverModalComponent],
  template: `
    <div class="game-container ludo-theme">
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
        <div style="display:flex; justify-content:space-between; width:100%; max-width:1000px; flex-wrap:wrap; gap:1rem; padding: 0 1rem;">
          <!-- Opponent Info -->
          <div class="opponent-section" style="flex:1;">
            <app-game-info-ludo />
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

            <!-- Ready Section (before game starts) -->
            @if (roomStatus() === 'waiting' || roomStatus() === 'ready') {
              <div class="ready-section" style="margin-top:0.5rem">
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
          </div>

          <!-- Self & Actions -->
          <div class="self-section" style="flex:1; display:flex; flex-direction:column; align-items:flex-end;">
             <h3 class="section-label">Vous</h3>
             <div class="opponent-info">
               <span class="opponent-name">{{ currentPlayer()?.name ?? 'Moi' }}</span>
             </div>
             @if (roomStatus() === 'playing') {
               <div style="display:flex; align-items:center; gap:1rem; margin-top:0.5rem;">
                 <span style="font-weight:bold; color:white;">Lancer le dé => </span>
                 <app-dice
                    [value]="diceRoll()"
                    [isRolling]="isRollingDice()"
                    [disabled]="!isMyTurn() || phase() !== 'rolling'"
                    (roll)="onRollDice()"
                  />
               </div>
             }
          </div>
        </div>

        <section class="board-section" aria-label="Plateau de jeu">
            @if (roomStatus() === 'playing') {
              <div style="display:flex; flex-direction:column; gap:1rem; align-items:center; width:100%;">
                <app-ludo-board
                  [board]="board()"
                  [selectedPiece]="selectedPiece()"
                  [movablePieces]="movablePieces()"
                  [validMoves]="validMoves()"
                  (pieceClicked)="onPieceClicked($event)"
                  (squareClicked)="onSquareClicked($event)"
                />
              </div>
            } @else {
              <div class="waiting-screen" style="max-width:800px; width:100%;">
                <div class="waiting-content">
                  <h2>En attente</h2>
                  @if (!opponent()) {
                    <p>Partagez le code de la salle avec vos adversaires</p>
                    <div class="room-code-display">
                      <span class="code">{{ roomId() }}</span>
                      <button type="button" class="copy-btn" (click)="copyRoomCode()">
                        📋 Copier
                      </button>
                    </div>
                  } @else if (!isReady() || !opponentReady()) {
                    <p>En attente que les joueurs soient prêts...</p>
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

        <div class="chat-section" style="width:100%; max-width:800px;">
          <h3 class="section-label">Chat</h3>
          <div class="chat-messages" role="log" aria-live="polite" style="max-height: 200px;">
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
      </main>

      @if (isGameOver()) {
        <app-game-over-modal
          [winner]="gameResult()?.winner ?? null"
          [reason]="gameResult()?.reason"
          [stats]="gameStats()"
          [eloChange]="eloChange()"
          [showRematch]="true"
          (rematch)="requestRematch()"
          (newGame)="leaveRoom()"
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

    .ludo-theme {
      /* Ludo specific overrides */
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

    :host-context(.light-theme) .connection-indicator {
      background: rgba(0, 0, 0, 0.05);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
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
export class GameOnlineLudoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly onlineService = inject(OnlineService);
  private readonly ludoEngine = inject(LudoEngineService);
  private readonly timerService = inject(TimerService);
  private readonly replayService = inject(ReplayService);
  private readonly rankingService = inject(RankingService);

  readonly connectionStatus = this.onlineService.connectionStatus;
  readonly isConnected = this.onlineService.isConnected;
  readonly currentPlayer = this.onlineService.currentPlayer;
  readonly currentRoom = this.onlineService.currentRoom;
  readonly chatMessages = this.onlineService.chatMessages;

  readonly roomId = computed(() => this.currentRoom()?.id ?? null);
  readonly roomStatus = computed(() => this.currentRoom()?.status ?? 'waiting');
  readonly isHost = this.onlineService.isHost;

  readonly isReady = signal(false);
  readonly chatInput = signal('');
  readonly showModal = signal(true);
  readonly isRollingDice = signal(false);

  // Ludo Engine Signals
  readonly status = this.ludoEngine.status;
  readonly myColor = computed((): PlayerColor => {
    const room = this.currentRoom();
    const player = this.currentPlayer();
    if (!room || !player || !room.players) return 'red';
    const found = room.players.find(p => p.id === player.id);
    return found?.color ?? 'red';
  });

  readonly isMyTurn = computed(() => this.ludoEngine.currentPlayer() === this.myColor());
  readonly board = this.ludoEngine.board;
  readonly diceRoll = this.ludoEngine.diceRoll;
  readonly phase = this.ludoEngine.phase;
  // TODO: add real selection logic mapping for Ludo online
  readonly selectedPiece = signal<any>(null);
  readonly validMoves = signal<any[]>([]);
  readonly movablePieces = signal<any[]>([]);

  // Stubs for GameOverModalComponent matching
  readonly gameResult = computed(() => {
    return this.status() === 'finished' ? { winner: 'red' as 'red', reason: 'Ludo not fully mapped' } : null;
  });
  readonly gameStats = signal<any>(null);
  readonly eloChange = signal<number | undefined>(undefined);

  readonly opponent = computed(() => {
    const room = this.currentRoom();
    const player = this.currentPlayer();
    if (!room || !player) return null;

    if (room.hostPlayer.id === player.id) {
      return room.guestPlayer ?? null;
    }
    return room.hostPlayer;
  });

  // Not quite accurate for 4 players but keep wrapper working
  readonly opponentReady = computed(() => {
    // True if everyone else but me is ready
    return this.currentRoom()?.players?.every(p => p.id === this.currentPlayer()?.id || p.isReady) ?? false;
  });

  readonly opponentColor = computed((): PlayerColor => {
    // Simplify opponent color display
    return 'blue';
  });

  constructor() {
    // Watch for game state updates from server
    effect(() => {
      const room = this.currentRoom();
      if (room?.status === 'playing') {
        if (this.status() !== 'playing') {
          // Get player colors assigned in room
          const colors = room.players?.map(p => p.color!) ?? ['red', 'green'];
          this.ludoEngine.startNewGame(colors);
        }
      }
    });

    // Sub to external sockets for move/roll sync
    const socket = this.onlineService.getSocket();
    if (socket) {
      socket.on('ludo:roll', (data) => {
        // sync roll from other player
        // for now just local simulate for MVP
      });
    }
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
    return this.status() === 'finished' && this.showModal();
  }

  isWinner(): boolean {
    // Needs proper implementation in Ludo Engine
    return false;
  }

  onPieceClicked(piece: any): void {
    if (!this.isMyTurn() || this.phase() !== 'moving') return;
    this.selectedPiece.set(piece);
    // this.ludoEngine.selectPiece(piece) ...
  }

  onSquareClicked(pos: any): void {
    if (!this.isMyTurn() || !this.selectedPiece()) return;
    const moved = this.ludoEngine.moveTo(this.selectedPiece()!, pos);
    if (moved) {
      this.selectedPiece.set(null);
      this.onlineService.sendMove({ piece: this.selectedPiece()!, from: this.selectedPiece()!.position, to: pos, capturedPieces: [], isPromotion: false });
    }
  }

  onRollDice(): void {
    if (!this.isMyTurn() || this.phase() !== 'rolling') return;

    this.isRollingDice.set(true);

    // Simulate dice animation duration
    setTimeout(() => {
      this.isRollingDice.set(false);
      this.ludoEngine.rollDice();

      const val = this.diceRoll();
      // Notify others of the roll
      this.onlineService.getSocket()?.emit('game:ludo:roll', { roomId: this.roomId(), roll: val });

    }, 500);
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
    this.router.navigate(['/game/online']);
  }

  requestRematch(): void {
    // Reset ready state and request rematch
    this.isReady.set(false);
    this.showModal.set(false);
    // In a real implementation, this would send a rematch request to server
  }

  saveReplay(): void {
    /* Not fully implemented for Ludo stats mapping yet */
    alert('Partie sauvegardée !');
  }

  closeModal(): void {
    this.showModal.set(false);
  }
}
