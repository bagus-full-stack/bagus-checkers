import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RankingService, SupabaseService } from '../../core/services';
import { getRankTitle, getRankColor, calculateWinRate } from '../../core/models/ranking.model';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="profile-page">
      <header class="page-header">
        <a routerLink="/" class="back-link" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
        <h1 class="page-title">Mon Profil</h1>
      </header>

      <main class="profile-content">
        @if (!isLoggedIn()) {
          <section class="auth-section">
            <!-- Tab buttons -->
            <div class="auth-tabs">
              <button
                type="button"
                class="tab-btn"
                [class.active]="authMode() === 'login'"
                (click)="authMode.set('login')"
              >
                Connexion
              </button>
              <button
                type="button"
                class="tab-btn"
                [class.active]="authMode() === 'register'"
                (click)="authMode.set('register')"
              >
                Inscription
              </button>
              <button
                type="button"
                class="tab-btn"
                [class.active]="authMode() === 'local'"
                (click)="authMode.set('local')"
              >
                Mode Local
              </button>
            </div>

            @if (authMode() === 'login') {
              <form class="auth-form" (submit)="onSignIn($event)">
                <h2>Connexion</h2>

                @if (authError()) {
                  <div class="error-message">{{ authError() }}</div>
                }

                <div class="form-group">
                  <label for="email" class="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    class="form-input"
                    [value]="emailInput()"
                    (input)="onEmailInput($event)"
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="password" class="form-label">Mot de passe</label>
                  <input
                    type="password"
                    id="password"
                    class="form-input"
                    [value]="passwordInput()"
                    (input)="onPasswordInput($event)"
                    placeholder="••••••••"
                    required
                    minlength="6"
                  />
                </div>

                <button type="submit" class="btn btn-primary" [disabled]="isLoading()">
                  {{ isLoading() ? 'Connexion...' : 'Se connecter' }}
                </button>

                <div class="oauth-section">
                  <p class="divider"><span>ou</span></p>
                  <div class="oauth-buttons">
                    <button type="button" class="oauth-btn google" (click)="signInWithGoogle()">
                      🔵 Google
                    </button>
                    <button type="button" class="oauth-btn github" (click)="signInWithGitHub()">
                      ⚫ GitHub
                    </button>
                    <button type="button" class="oauth-btn discord" (click)="signInWithDiscord()">
                      🟣 Discord
                    </button>
                  </div>
                </div>
              </form>
            }

            @if (authMode() === 'register') {
              <form class="auth-form" (submit)="onSignUp($event)">
                <h2>Inscription</h2>

                @if (authError()) {
                  <div class="error-message">{{ authError() }}</div>
                }

                <div class="form-group">
                  <label for="reg-username" class="form-label">Nom d'utilisateur</label>
                  <input
                    type="text"
                    id="reg-username"
                    class="form-input"
                    [value]="usernameInput()"
                    (input)="onUsernameInput($event)"
                    placeholder="MonPseudo"
                    required
                    minlength="3"
                    maxlength="20"
                  />
                </div>

                <div class="form-group">
                  <label for="reg-email" class="form-label">Email</label>
                  <input
                    type="email"
                    id="reg-email"
                    class="form-input"
                    [value]="emailInput()"
                    (input)="onEmailInput($event)"
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="reg-password" class="form-label">Mot de passe</label>
                  <input
                    type="password"
                    id="reg-password"
                    class="form-input"
                    [value]="passwordInput()"
                    (input)="onPasswordInput($event)"
                    placeholder="••••••••"
                    required
                    minlength="6"
                  />
                </div>

                <button type="submit" class="btn btn-primary" [disabled]="isLoading() || !isUsernameValid()">
                  {{ isLoading() ? 'Inscription...' : 'S\'inscrire' }}
                </button>
              </form>
            }

            @if (authMode() === 'local') {
              <form class="auth-form" (submit)="onCreateProfile($event)">
                <h2>Profil Local</h2>
                <p class="section-description">
                  Créez un profil local (les données sont stockées sur votre appareil).
                </p>

                <div class="form-group">
                  <label for="local-username" class="form-label">Nom d'utilisateur</label>
                  <input
                    type="text"
                    id="local-username"
                    class="form-input"
                    [value]="usernameInput()"
                    (input)="onUsernameInput($event)"
                    placeholder="MonPseudo"
                    required
                    minlength="3"
                    maxlength="20"
                  />
                </div>

                <button type="submit" class="btn btn-primary" [disabled]="!isUsernameValid()">
                  Créer mon profil local
                </button>
              </form>
            }
          </section>
        } @else {
          <section class="profile-card">
            @if (isOnline()) {
              <div class="online-badge">
                <span class="badge-icon">☁️</span>
                <span>Compte en ligne</span>
              </div>
            }

            <div class="avatar-section">
              @if (profile()?.avatar) {
                <img [src]="profile()!.avatar" alt="Avatar" class="avatar" />
              } @else {
                <div class="avatar-placeholder">
                  {{ profile()!.displayName.charAt(0).toUpperCase() }}
                </div>
              }

              <button type="button" class="change-avatar-btn" (click)="changeAvatar()">
                📷
              </button>
            </div>

            <div class="profile-info">
              <div class="name-section">
                @if (isEditingName()) {
                  <input
                    type="text"
                    class="name-input"
                    [value]="editNameValue()"
                    (input)="onNameInput($event)"
                    (blur)="saveName()"
                    (keydown.enter)="saveName()"
                    autofocus
                  />
                } @else {
                  <h2 class="display-name">
                    {{ profile()!.displayName }}
                    <button
                      type="button"
                      class="edit-btn"
                      (click)="startEditName()"
                      aria-label="Modifier le nom"
                    >
                      ✏️
                    </button>
                  </h2>
                }
                <p class="username">@{{ profile()!.username }}</p>
              </div>

              <div class="rank-display" [style.border-color]="rankColor()">
                <span class="rank-rating">{{ profile()!.rating }}</span>
                <span class="rank-title" [style.color]="rankColor()">{{ rankTitle() }}</span>
              </div>
            </div>
          </section>

          <section class="stats-section">
            <h3 class="section-title">Statistiques</h3>

            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-value">{{ profile()!.gamesPlayed }}</span>
                <span class="stat-label">Parties jouées</span>
              </div>
              <div class="stat-card">
                <span class="stat-value wins">{{ profile()!.wins }}</span>
                <span class="stat-label">Victoires</span>
              </div>
              <div class="stat-card">
                <span class="stat-value losses">{{ profile()!.losses }}</span>
                <span class="stat-label">Défaites</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">{{ profile()!.draws }}</span>
                <span class="stat-label">Nuls</span>
              </div>
              <div class="stat-card">
                <span class="stat-value">{{ winRate() }}%</span>
                <span class="stat-label">Taux de victoire</span>
              </div>
              <div class="stat-card">
                <span class="stat-value streak">{{ profile()!.bestWinStreak }}</span>
                <span class="stat-label">Meilleure série</span>
              </div>
            </div>
          </section>

          <section class="actions-section">
            <a routerLink="/leaderboard" class="action-link">
              🏆 Voir le classement
            </a>
            <a routerLink="/replays" class="action-link">
              📼 Mes parties sauvegardées
            </a>
            <button type="button" class="btn btn-danger" (click)="logout()">
              Déconnexion
            </button>
          </section>
        }
      </main>
    </div>
  `,
  styles: `
    .profile-page {
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

    .profile-content {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
    }

    .auth-section {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
    }

    .auth-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .tab-btn {
      flex: 1;
      padding: 0.75rem 1rem;
      background: #374151;
      border: none;
      border-radius: 0.5rem;
      color: #9ca3af;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      background: #4b5563;
      color: white;
    }

    .tab-btn.active {
      background: #4f46e5;
      color: white;
    }

    .auth-form {
      max-width: 400px;
      margin: 0 auto;
    }

    .auth-form h2 {
      color: white;
      text-align: center;
      margin: 0 0 1.5rem;
    }

    .error-message {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .oauth-section {
      margin-top: 1.5rem;
    }

    .divider {
      display: flex;
      align-items: center;
      color: #6b7280;
      margin: 1rem 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #374151;
    }

    .divider span {
      padding: 0 1rem;
      font-size: 0.875rem;
    }

    .oauth-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .oauth-btn {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      background: #111827;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .oauth-btn:hover {
      background: #374151;
    }

    .online-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }

    .create-profile-section {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
    }

    .create-profile-section h2 {
      color: white;
      margin: 0 0 0.5rem;
    }

    .section-description {
      color: #9ca3af;
      margin: 0 0 1.5rem;
    }

    .profile-form {
      max-width: 300px;
      margin: 0 auto;
    }

    .form-group {
      margin-bottom: 1rem;
      text-align: left;
    }

    .form-label {
      display: block;
      color: #9ca3af;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      color: white;
      font-size: 1rem;
    }

    .form-input:focus {
      outline: none;
      border-color: #4f46e5;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }

    .btn-primary {
      background: #4f46e5;
      color: white;
      width: 100%;
    }

    .btn-primary:hover:not(:disabled) {
      background: #4338ca;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .profile-card {
      background: #1f2937;
      border-radius: 1rem;
      padding: 2rem;
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .avatar-section {
      position: relative;
      flex-shrink: 0;
    }

    .avatar, .avatar-placeholder {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-placeholder {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
    }

    .change-avatar-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #1f2937;
      background: #374151;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .profile-info {
      flex: 1;
    }

    .name-section {
      margin-bottom: 1rem;
    }

    .display-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .edit-btn {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.15s;
    }

    .edit-btn:hover {
      opacity: 1;
    }

    .name-input {
      font-size: 1.5rem;
      font-weight: 700;
      background: #111827;
      border: 1px solid #4f46e5;
      border-radius: 0.25rem;
      color: white;
      padding: 0.25rem 0.5rem;
    }

    .username {
      color: #6b7280;
      margin: 0.25rem 0 0;
    }

    .rank-display {
      display: inline-flex;
      flex-direction: column;
      padding: 0.75rem 1rem;
      background: #111827;
      border-radius: 0.5rem;
      border-left: 4px solid;
    }

    .rank-rating {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
    }

    .rank-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stats-section {
      background: #1f2937;
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: #111827;
      border-radius: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
    }

    .stat-value.wins {
      color: #22c55e;
    }

    .stat-value.losses {
      color: #ef4444;
    }

    .stat-value.streak {
      color: #fbbf24;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .actions-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .action-link {
      display: block;
      padding: 1rem 1.5rem;
      background: #1f2937;
      border-radius: 0.5rem;
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .action-link:hover {
      background: #374151;
    }

    .btn:focus-visible, .action-link:focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

    @media (max-width: 600px) {
      .profile-card {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class ProfileComponent {
  private readonly router = inject(Router);
  private readonly rankingService = inject(RankingService);
  private readonly supabaseService = inject(SupabaseService);

  readonly profile = this.rankingService.userProfile;
  readonly isLoggedIn = this.rankingService.isLoggedIn;
  readonly isOnline = this.rankingService.isOnline;

  readonly usernameInput = signal('');
  readonly emailInput = signal('');
  readonly passwordInput = signal('');
  readonly isEditingName = signal(false);
  readonly editNameValue = signal('');
  readonly authMode = signal<'login' | 'register' | 'local'>('login');
  readonly authError = signal('');
  readonly isLoading = signal(false);

  readonly isUsernameValid = computed(() => {
    const username = this.usernameInput();
    return username.length >= 3 && username.length <= 20;
  });

  readonly rankTitle = computed(() => {
    const p = this.profile();
    return p ? getRankTitle(p.rating) : '';
  });

  readonly rankColor = computed(() => {
    const p = this.profile();
    return p ? getRankColor(p.rating) : '#6b7280';
  });

  readonly winRate = computed(() => {
    const p = this.profile();
    return p ? calculateWinRate(p.wins, p.gamesPlayed) : 0;
  });

  onUsernameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.usernameInput.set(target.value);
  }

  onEmailInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.emailInput.set(target.value);
  }

  onPasswordInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.passwordInput.set(target.value);
  }

  async onSignIn(event: Event): Promise<void> {
    event.preventDefault();
    this.authError.set('');
    this.isLoading.set(true);

    const result = await this.rankingService.signIn(
      this.emailInput(),
      this.passwordInput()
    );

    this.isLoading.set(false);

    if (!result.success) {
      this.authError.set(result.error ?? 'Erreur de connexion');
    }
  }

  async onSignUp(event: Event): Promise<void> {
    event.preventDefault();
    this.authError.set('');
    this.isLoading.set(true);

    const result = await this.rankingService.signUp(
      this.emailInput(),
      this.passwordInput(),
      this.usernameInput()
    );

    this.isLoading.set(false);

    if (!result.success) {
      this.authError.set(result.error ?? 'Erreur d\'inscription');
    }
  }

  signInWithGoogle(): void {
    this.rankingService.signInWithProvider('google');
  }

  signInWithGitHub(): void {
    this.rankingService.signInWithProvider('github');
  }

  signInWithDiscord(): void {
    this.rankingService.signInWithProvider('discord');
  }

  onCreateProfile(event: Event): void {
    event.preventDefault();
    if (this.isUsernameValid()) {
      this.rankingService.createProfile(this.usernameInput());
    }
  }

  startEditName(): void {
    const p = this.profile();
    if (p) {
      this.editNameValue.set(p.displayName);
      this.isEditingName.set(true);
    }
  }

  onNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.editNameValue.set(target.value);
  }

  saveName(): void {
    const name = this.editNameValue().trim();
    if (name.length >= 1) {
      this.rankingService.updateDisplayName(name);
    }
    this.isEditingName.set(false);
  }

  changeAvatar(): void {
    const url = prompt('Entrez l\'URL de votre avatar:');
    if (url) {
      this.rankingService.updateAvatar(url);
    }
  }

  async logout(): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
      await this.rankingService.logout();
    }
  }
}

