import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OnlineService } from '../../core/services';
import { GameRoom } from '../../core/models';

@Component({
  selector: 'app-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="lobby-container">
      <header class="lobby-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="lobby-title">Lobby Multijoueur</h1>
        <div class="connection-status" [class]="connectionStatus()">
          <span class="status-dot" aria-hidden="true"></span>
          {{ getStatusText() }}
        </div>
      </header>

      <main class="lobby-main">
        @if (!isConnected()) {
          <!-- Connection Form -->
          <section class="connect-section" aria-labelledby="connect-heading">
            <h2 id="connect-heading" class="section-title">Connexion</h2>
            <form (submit)="connect($event)" class="connect-form">
              <div class="form-group">
                <label for="playerName" class="form-label">Votre pseudo</label>
                <input
                  id="playerName"
                  type="text"
                  class="form-input"
                  [(ngModel)]="playerName"
                  name="playerName"
                  placeholder="Entrez votre pseudo..."
                  required
                  minlength="2"
                  maxlength="20"
                  autocomplete="off"
                />
              </div>
              <button type="submit" class="btn primary" [disabled]="!playerName().trim()">
                Se connecter
              </button>
              @if (error()) {
                <p class="error-message" role="alert">{{ error() }}</p>
              }
            </form>
          </section>
        } @else {
          <div class="lobby-content">
            <!-- Player Info -->
            <section class="player-info" aria-label="Informations joueur">
              <span class="player-name">{{ currentPlayer()?.name }}</span>
              <button type="button" class="btn-link" (click)="disconnect()">
                Déconnexion
              </button>
            </section>

            <!-- Create Room -->
            <section class="create-room-section" aria-labelledby="create-heading">
              <h2 id="create-heading" class="section-title">Créer une partie</h2>
              <form (submit)="createRoom($event)" class="create-form">
                <div class="form-group">
                  <label for="roomName" class="form-label">Nom de la salle</label>
                  <input
                    id="roomName"
                    type="text"
                    class="form-input"
                    [(ngModel)]="roomName"
                    name="roomName"
                    placeholder="Ma partie..."
                    maxlength="30"
                  />
                </div>
                <div class="form-row">
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [(ngModel)]="isPrivate"
                      name="isPrivate"
                    />
                    <span>Partie privée</span>
                  </label>
                  <button type="submit" class="btn primary">
                    Créer
                  </button>
                </div>
              </form>
            </section>

            <!-- Room List -->
            <section class="rooms-section" aria-labelledby="rooms-heading">
              <div class="section-header">
                <h2 id="rooms-heading" class="section-title">Parties disponibles</h2>
                <button type="button" class="btn-icon" (click)="refreshRooms()" aria-label="Actualiser">
                  🔄
                </button>
              </div>

              <div class="rooms-list" role="list">
                @if (availableRooms().length === 0) {
                  <p class="empty-message">Aucune partie disponible</p>
                } @else {
                  @for (room of availableRooms(); track room.id) {
                    <div class="room-card" role="listitem">
                      <div class="room-info">
                        <span class="room-name">{{ room.name || 'Partie #' + room.id.slice(0, 6) }}</span>
                        <span class="room-host">Créée par {{ room.hostPlayer.name }}</span>
                        <span class="room-status" [class]="room.status">
                          {{ getRoomStatusText(room) }}
                        </span>
                      </div>
                      <button
                        type="button"
                        class="btn"
                        (click)="joinRoom(room.id)"
                        [disabled]="room.status !== 'waiting'"
                      >
                        Rejoindre
                      </button>
                    </div>
                  }
                }
              </div>
            </section>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    .lobby-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: white;
    }

    .lobby-header {
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

    .lobby-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .connection-status {
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
      &.connecting, &.reconnecting {
        color: #f59e0b;
      }
      &.disconnected {
        color: #6b7280;
      }
      &.error {
        color: #ef4444;
      }
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .lobby-main {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .connect-section {
      background: #374151;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 400px;
      margin: 4rem auto;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 1.5rem 0;
    }

    .connect-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.875rem;
      color: #d1d5db;
    }

    .form-input {
      padding: 0.75rem 1rem;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 0.5rem;
      color: white;
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
      }

      &::placeholder {
        color: #6b7280;
      }
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: 1px solid #4b5563;
      border-radius: 0.5rem;
      background: #374151;
      color: white;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #4b5563;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.primary {
        background: #4f46e5;
        border-color: #4f46e5;

        &:hover:not(:disabled) {
          background: #4338ca;
        }
      }
    }

    .btn-link {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: white;
      }
    }

    .btn-icon {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.375rem;
      transition: background 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
      margin: 0;
      padding: 0.5rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 0.375rem;
    }

    .lobby-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .player-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      background: #374151;
      border-radius: 0.5rem;
    }

    .player-name {
      font-weight: 600;
      font-size: 1.125rem;
    }

    .create-room-section {
      background: #374151;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;

      input {
        width: 18px;
        height: 18px;
        accent-color: #4f46e5;
      }
    }

    .rooms-section {
      background: #374151;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;

      .section-title {
        margin: 0;
      }
    }

    .rooms-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty-message {
      color: #9ca3af;
      text-align: center;
      padding: 2rem;
      font-style: italic;
    }

    .room-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: #1f2937;
      border-radius: 0.5rem;
      border: 1px solid #4b5563;
      transition: border-color 0.15s;

      &:hover {
        border-color: #6b7280;
      }
    }

    .room-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .room-name {
      font-weight: 600;
    }

    .room-host {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .room-status {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      width: fit-content;
      margin-top: 0.25rem;

      &.waiting {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      &.playing {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }
    }
  `,
})
export class LobbyComponent implements OnInit, OnDestroy {
  private readonly onlineService = inject(OnlineService);
  private readonly router = inject(Router);

  readonly connectionStatus = this.onlineService.connectionStatus;
  readonly isConnected = this.onlineService.isConnected;
  readonly currentPlayer = this.onlineService.currentPlayer;
  readonly availableRooms = this.onlineService.availableRooms;
  readonly currentRoom = this.onlineService.currentRoom;
  readonly error = this.onlineService.error;

  readonly playerName = signal('');
  readonly roomName = signal('');
  readonly isPrivate = signal(false);

  private roomCheckInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Auto-refresh rooms when connected
    if (this.isConnected()) {
      this.startRoomRefresh();
    }
  }

  ngOnDestroy(): void {
    this.stopRoomRefresh();
  }

  getStatusText(): string {
    switch (this.connectionStatus()) {
      case 'connected':
        return 'Connecté';
      case 'connecting':
        return 'Connexion...';
      case 'reconnecting':
        return 'Reconnexion...';
      case 'error':
        return 'Erreur';
      default:
        return 'Déconnecté';
    }
  }

  getRoomStatusText(room: GameRoom): string {
    switch (room.status) {
      case 'waiting':
        return 'En attente';
      case 'playing':
        return 'En cours';
      case 'finished':
        return 'Terminée';
      default:
        return room.status;
    }
  }

  connect(event: Event): void {
    event.preventDefault();
    const name = this.playerName().trim();
    if (name) {
      this.onlineService.connect(name);
      this.startRoomRefresh();
    }
  }

  disconnect(): void {
    this.stopRoomRefresh();
    this.onlineService.disconnect();
  }

  createRoom(event: Event): void {
    event.preventDefault();
    const name = this.roomName().trim() || `Partie de ${this.currentPlayer()?.name}`;
    this.onlineService.createRoom(name, this.isPrivate());
    this.roomName.set('');

    // Navigate to game when room is created
    // The OnlineService will update currentRoom, and we watch for that
    this.watchForRoomJoin();
  }

  joinRoom(roomId: string): void {
    this.onlineService.joinRoom(roomId);
    this.watchForRoomJoin();
  }

  refreshRooms(): void {
    this.onlineService.refreshRooms();
  }

  private watchForRoomJoin(): void {
    const checkRoom = setInterval(() => {
      if (this.currentRoom()) {
        clearInterval(checkRoom);
        this.router.navigate(['/game/online', this.currentRoom()!.id]);
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkRoom), 5000);
  }

  private startRoomRefresh(): void {
    this.refreshRooms();
    this.roomCheckInterval = setInterval(() => this.refreshRooms(), 5000);
  }

  private stopRoomRefresh(): void {
    if (this.roomCheckInterval) {
      clearInterval(this.roomCheckInterval);
      this.roomCheckInterval = null;
    }
  }
}

