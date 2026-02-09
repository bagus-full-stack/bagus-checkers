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
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
