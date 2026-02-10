import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'game/local',
    loadComponent: () =>
      import('./pages/game-local/game-local.component').then(
        (m) => m.GameLocalComponent
      ),
  },
  {
    path: 'game/ai',
    loadComponent: () =>
      import('./pages/game-ai/game-ai.component').then(
        (m) => m.GameAiComponent
      ),
  },
  {
    path: 'game/online',
    loadComponent: () =>
      import('./pages/lobby/lobby.component').then(
        (m) => m.LobbyComponent
      ),
  },
  {
    path: 'game/online/:roomId',
    loadComponent: () =>
      import('./pages/game-online/game-online.component').then(
        (m) => m.GameOnlineComponent
      ),
  },
  {
    path: 'tutorial',
    loadComponent: () =>
      import('./pages/tutorial/tutorial.component').then(
        (m) => m.TutorialComponent
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./pages/leaderboard/leaderboard.component').then(
        (m) => m.LeaderboardComponent
      ),
  },
  {
    path: 'replays',
    loadComponent: () =>
      import('./pages/replays/replays.component').then(
        (m) => m.ReplaysComponent
      ),
  },
  {
    path: 'replay/:id',
    loadComponent: () =>
      import('./pages/replay-viewer/replay-viewer.component').then(
        (m) => m.ReplayViewerComponent
      ),
  },
  {
    path: 'spectate',
    loadComponent: () =>
      import('./pages/spectate/spectate.component').then(
        (m) => m.SpectateComponent
      ),
  },
  {
    path: 'spectate/:id',
    loadComponent: () =>
      import('./pages/spectate-game/spectate-game.component').then(
        (m) => m.SpectateGameComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
