import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { KeyboardService } from './keyboard.service';
import { GameEngineService } from './game-engine.service';
import { AudioService } from './audio.service';

function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...opts });
  document.dispatchEvent(event);
  return event;
}

describe('KeyboardService', () => {
  let service: KeyboardService;
  let router: Router;
  let gameEngine: GameEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(KeyboardService);
    router = TestBed.inject(Router);
    gameEngine = TestBed.inject(GameEngineService);
  });

  it('is enabled by default', () => {
    expect(service.enabled()).toBe(true);
  });

  it('toggle flips the enabled flag', () => {
    service.toggle();
    expect(service.enabled()).toBe(false);
    service.toggle();
    expect(service.enabled()).toBe(true);
  });

  it('enable/disable set the flag explicitly', () => {
    service.disable();
    expect(service.enabled()).toBe(false);
    service.enable();
    expect(service.enabled()).toBe(true);
  });

  it('navigates when a navigation shortcut key is pressed', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    dispatchKey('h');
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('ignores shortcuts when disabled', () => {
    service.disable();
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    dispatchKey('h');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when the event target is a text input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const event = new KeyboardEvent('keydown', { key: 'h', cancelable: true });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);
    expect(navigateSpy).not.toHaveBeenCalled();
    input.remove();
  });

  it('requires modifier keys to match exactly (plain "z" does not trigger ctrl+z)', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    dispatchKey('z'); // no ctrlKey - the registered shortcut requires ctrlKey: true
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('the "m" shortcut toggles sound via the audio service', () => {
    const audioService = TestBed.inject(AudioService);
    const toggleSpy = vi.spyOn(audioService, 'toggleSound');
    dispatchKey('m');
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('toggleHelp shows and closeHelp hides the help modal', () => {
    expect(service.showHelp()).toBe(false);
    service.toggleHelp();
    expect(service.showHelp()).toBe(true);
    service.closeHelp();
    expect(service.showHelp()).toBe(false);
  });

  it('the "?" shortcut toggles help', () => {
    dispatchKey('?', { shiftKey: true });
    expect(service.showHelp()).toBe(true);
  });

  it('the "n" shortcut starts a new game via the game engine', () => {
    const startSpy = vi.spyOn(gameEngine, 'startNewGame');
    dispatchKey('n');
    expect(startSpy).toHaveBeenCalled();
  });

  it('the Escape shortcut deselects the current piece', () => {
    const deselectSpy = vi.spyOn(gameEngine, 'deselectPiece');
    dispatchKey('Escape');
    expect(deselectSpy).toHaveBeenCalled();
  });

  it('resign shortcut resigns only after confirmation', () => {
    const resignSpy = vi.spyOn(gameEngine, 'resign');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    dispatchKey('r');
    expect(resignSpy).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    dispatchKey('r');
    expect(resignSpy).toHaveBeenCalled();
  });

  describe('getShortcutsByCategory', () => {
    it('filters shortcuts by category', () => {
      const navShortcuts = service.getShortcutsByCategory('navigation');
      expect(navShortcuts.length).toBeGreaterThan(0);
      expect(navShortcuts.every((s) => s.category === 'navigation')).toBe(true);
    });
  });

  describe('formatShortcut', () => {
    it('joins modifier keys and uppercases the key', () => {
      const shortcut = service.shortcuts.find((s) => s.key === 'z' && s.ctrlKey)!;
      expect(service.formatShortcut(shortcut)).toBe('Ctrl + Z');
    });

    it('translates special key names to display labels', () => {
      const shortcut = service.shortcuts.find((s) => s.key === 'Escape')!;
      expect(service.formatShortcut(shortcut)).toBe('ÉCHAP');
    });
  });
});
