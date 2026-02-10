import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'game/online/:roomId',
    renderMode: RenderMode.Client // Dynamic route - client-side only
  },
  {
    path: 'game/online',
    renderMode: RenderMode.Client // Requires WebSocket - client-side only
  },
  {
    path: 'replay/:id',
    renderMode: RenderMode.Client // Dynamic route - client-side only
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client // Requires localStorage - client-side only
  },
  {
    path: 'leaderboard',
    renderMode: RenderMode.Client // Requires localStorage - client-side only
  },
  {
    path: 'replays',
    renderMode: RenderMode.Client // Requires localStorage - client-side only
  },
  {
    path: 'spectate',
    renderMode: RenderMode.Client // Requires WebSocket - client-side only
  },
  {
    path: 'spectate/:id',
    renderMode: RenderMode.Client // Dynamic route - client-side only
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
