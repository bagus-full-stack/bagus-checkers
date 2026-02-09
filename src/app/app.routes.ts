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
    path: '**',
    redirectTo: '',
  },
];
