import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OnlineService } from '../../core/services';
import { GameOnlineCheckersComponent } from './game-online-checkers.component';

@Component({
  selector: 'app-game-online',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GameOnlineCheckersComponent],
  template: `
    @if (isConnected() && currentRoom()) {
      @if (currentRoom()?.variant === 'ludo') {
        <h1 style="color:white; text-align:center; margin-top:50px;">Ludo interface is in development!</h1>
      } @else {
        <app-game-online-checkers></app-game-online-checkers>
      }
    } @else {
      <!-- Connecting / Loading overlay -->
      <div style="flex:1; display:flex; align-items:center; justify-content:center; color:white; height:100vh;">
        <span class="spinner" style="margin-right: 10px;"></span>
        Connexion au lobby / à la partie...
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class GameOnlineComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private onlineService = inject(OnlineService);

  isConnected = this.onlineService.isConnected;
  currentRoom = this.onlineService.currentRoom;

  constructor() {
    const id = this.route.snapshot.paramMap.get('roomId');
    if (id && !this.currentRoom()) {
      if (this.onlineService.isConnected()) {
        this.onlineService.joinRoom(id);
      } else {
        this.router.navigate(['/lobby']);
      }
    }
  }
}

