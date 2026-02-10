import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
} from '@angular/core';
import { KeyboardService } from '../../core/services/keyboard.service';

@Component({
  selector: 'app-keyboard-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop"
      (click)="close.emit()"
      (keydown.escape)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2 id="keyboard-help-title">⌨️ Raccourcis Clavier</h2>
          <button
            type="button"
            class="close-btn"
            (click)="close.emit()"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        <div class="shortcuts-container">
          <!-- Navigation -->
          <section class="shortcut-section">
            <h3 class="section-title">🧭 Navigation</h3>
            <ul class="shortcut-list">
              @for (shortcut of navigationShortcuts; track shortcut.key) {
                <li class="shortcut-item">
                  <kbd class="shortcut-key">{{ formatShortcut(shortcut) }}</kbd>
                  <span class="shortcut-desc">{{ shortcut.description }}</span>
                </li>
              }
            </ul>
          </section>

          <!-- Game Controls -->
          <section class="shortcut-section">
            <h3 class="section-title">🎮 Contrôles de jeu</h3>
            <ul class="shortcut-list">
              @for (shortcut of gameShortcuts; track shortcut.key) {
                <li class="shortcut-item">
                  <kbd class="shortcut-key">{{ formatShortcut(shortcut) }}</kbd>
                  <span class="shortcut-desc">{{ shortcut.description }}</span>
                </li>
              }
            </ul>
          </section>

          <!-- UI -->
          <section class="shortcut-section">
            <h3 class="section-title">🎨 Interface</h3>
            <ul class="shortcut-list">
              @for (shortcut of uiShortcuts; track shortcut.key) {
                <li class="shortcut-item">
                  <kbd class="shortcut-key">{{ formatShortcut(shortcut) }}</kbd>
                  <span class="shortcut-desc">{{ shortcut.description }}</span>
                </li>
              }
            </ul>
          </section>

          <!-- Audio -->
          <section class="shortcut-section">
            <h3 class="section-title">🔊 Audio</h3>
            <ul class="shortcut-list">
              @for (shortcut of audioShortcuts; track shortcut.key) {
                <li class="shortcut-item">
                  <kbd class="shortcut-key">{{ formatShortcut(shortcut) }}</kbd>
                  <span class="shortcut-desc">{{ shortcut.description }}</span>
                </li>
              }
            </ul>
          </section>
        </div>

        <footer class="modal-footer">
          <p class="tip">💡 Appuyez sur <kbd>?</kbd> ou <kbd>F1</kbd> pour afficher cette aide</p>
        </footer>
      </div>
    </div>
  `,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      padding: 1rem;
      animation: fadeIn 0.15s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: #1f2937;
      border-radius: 1rem;
      max-width: 700px;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.2s ease;
    }

    :host-context(.light-theme) .modal-content {
      background: #ffffff;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #374151;
    }

    :host-context(.light-theme) .modal-header {
      border-bottom-color: #e5e7eb;
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    :host-context(.light-theme) .modal-header h2 {
      color: #111827;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #374151;
      border: none;
      border-radius: 0.375rem;
      color: #9ca3af;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.15s ease;
    }

    :host-context(.light-theme) .close-btn {
      background: #f3f4f6;
      color: #6b7280;
    }

    .close-btn:hover {
      background: #4b5563;
      color: white;
    }

    :host-context(.light-theme) .close-btn:hover {
      background: #e5e7eb;
      color: #111827;
    }

    .shortcuts-container {
      padding: 1.5rem;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .shortcut-section {
      background: #111827;
      border-radius: 0.75rem;
      padding: 1rem;
    }

    :host-context(.light-theme) .shortcut-section {
      background: #f3f4f6;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #9ca3af;
      margin: 0 0 0.75rem;
    }

    :host-context(.light-theme) .section-title {
      color: #6b7280;
    }

    .shortcut-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .shortcut-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .shortcut-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      padding: 0.25rem 0.5rem;
      background: #374151;
      border: 1px solid #4b5563;
      border-radius: 0.25rem;
      color: #e5e7eb;
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .shortcut-desc {
      color: #d1d5db;
      font-size: 0.875rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #374151;
      background: #111827;
    }

    .tip {
      color: #6b7280;
      font-size: 0.75rem;
      margin: 0;
      text-align: center;
    }

    .tip kbd {
      padding: 0.125rem 0.375rem;
      background: #374151;
      border: 1px solid #4b5563;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    @media (max-width: 600px) {
      .shortcuts-container {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class KeyboardHelpComponent {
  private readonly keyboardService = inject(KeyboardService);

  readonly close = output<void>();

  readonly navigationShortcuts = this.keyboardService.getShortcutsByCategory('navigation');
  readonly gameShortcuts = this.keyboardService.getShortcutsByCategory('game');
  readonly uiShortcuts = this.keyboardService.getShortcutsByCategory('ui');
  readonly audioShortcuts = this.keyboardService.getShortcutsByCategory('audio');

  formatShortcut(shortcut: { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }): string {
    return this.keyboardService.formatShortcut(shortcut as any);
  }
}

