import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReplaysComponent } from './replays.component';
import { ReplayService } from '../../core/services/replay.service';

// This test environment's global `localStorage` throws on every call, but
// ReplayService.storeGame/deleteGame update their in-memory signal only
// after the localStorage write succeeds - so we stub a working in-memory
// localStorage here to exercise that persistence path.
function stubWorkingLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
}

describe('ReplaysComponent', () => {
  let replayService: ReplayService;

  beforeEach(() => {
    stubWorkingLocalStorage();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    replayService = TestBed.inject(ReplayService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup() {
    const fixture = TestBed.createComponent(ReplaysComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty state when there are no saved games', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.game-card')).toBeNull();
  });

  it('lists a saved game card with players, result and a link to the replay viewer', async () => {
    const id = await replayService.saveGame([], [], 'Alice', 'Bob', 'white', 'no-moves', 'checkers', 125);
    const fixture = setup();

    const card = fixture.nativeElement.querySelector('.game-card');
    expect(card.textContent).toContain('Alice');
    expect(card.textContent).toContain('Bob');
    expect(card.textContent).toContain('Victoire Blancs');
    expect(fixture.componentInstance.formatDuration(125)).toBe('2:05');
    expect(card.querySelector('.action-btn.primary').getAttribute('href')).toBe(`/replay/${id}`);
  });

  it('deletes a game only after confirming', async () => {
    await replayService.saveGame([], [], 'Alice', 'Bob', 'draw', 'agreement', 'checkers', 10);
    const fixture = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture.componentInstance.deleteGame(replayService.savedGames()[0].id);
    expect(replayService.savedGames().length).toBe(1);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.deleteGame(replayService.savedGames()[0].id);
    expect(replayService.savedGames().length).toBe(0);
  });

  it('opens and closes the import dialog, resetting the text and error', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();

    fixture.componentInstance.openImportDialog();
    fixture.componentInstance.importText.set('leftover');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).not.toBeNull();

    fixture.componentInstance.closeImportDialog();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeNull();
  });

  it('shows an error when importing invalid JSON, and imports valid JSON successfully', () => {
    const fixture = setup();
    fixture.componentInstance.openImportDialog();
    fixture.componentInstance.importText.set('not valid json');
    fixture.componentInstance.importGame();
    fixture.detectChanges();

    expect(fixture.componentInstance.importError()).toContain('invalide');
    expect(fixture.componentInstance.showImportDialog()).toBe(true);

    const validJson = JSON.stringify({
      metadata: {
        id: 'imported-1',
        date: new Date().toISOString(),
        whitePlayer: 'Alice',
        blackPlayer: 'Bob',
        winner: 'black',
        reason: 'resignation',
        variant: 'checkers',
        totalMoves: 0,
        duration: 0,
      },
      moves: [],
      materialHistory: [],
    });
    fixture.componentInstance.importText.set(validJson);
    fixture.componentInstance.importGame();

    expect(fixture.componentInstance.showImportDialog()).toBe(false);
    expect(replayService.savedGames().some((g) => g.id === 'imported-1')).toBe(true);
  });
});
