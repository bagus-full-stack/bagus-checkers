import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ReplayViewerComponent } from './replay-viewer.component';
import { ReplayService } from '../../core/services/replay.service';
import { createPosition, Move, Piece } from '../../core/models';

const STORAGE_KEY = 'checkers_saved_games';

function stubWorkingLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
}

function piece(overrides: Partial<Piece> = {}): Piece {
  return { id: 'white-0', color: 'white', type: 'pawn', position: createPosition(6, 1), ...overrides };
}

function move(overrides: Partial<Move> = {}): Move {
  return {
    piece: piece(),
    from: createPosition(6, 1),
    to: createPosition(5, 0),
    capturedPieces: [],
    isPromotion: false,
    ...overrides,
  };
}

function routeWithId(id: string | null) {
  return { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } };
}

describe('ReplayViewerComponent', () => {
  let replayService: ReplayService;

  beforeEach(() => {
    stubWorkingLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: routeWithId(id) }],
    });
    replayService = TestBed.inject(ReplayService);
    const fixture = TestBed.createComponent(ReplayViewerComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the error state when the game id does not match any saved game', async () => {
    const fixture = setup('missing');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-state')).not.toBeNull();
  });

  it('loads the saved game and starts the replay on init', async () => {
    const id = await createSavedGame();
    const fixture = setup(id);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-state')).toBeNull();
    expect(fixture.componentInstance.game()?.metadata.id).toBe(id);
    expect(fixture.componentInstance.currentMoveIndex()).toBe(-1);
    expect(fixture.nativeElement.querySelector('.game-info-header').textContent).toContain('Alice');
    expect(fixture.nativeElement.querySelector('.game-info-header').textContent).toContain('Bob');
  });

  it('renders one move button per move and highlights the active one when navigating', async () => {
    const id = await createSavedGame();
    const fixture = setup(id);
    await fixture.whenStable();
    fixture.detectChanges();

    const moveButtons = fixture.nativeElement.querySelectorAll('.move-item');
    expect(moveButtons.length).toBe(2);

    moveButtons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.currentMoveIndex()).toBe(1);
    expect(moveButtons[1].classList.contains('active')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.last-move-to').length).toBeGreaterThan(0);
  });

  it('formats move notation, date and duration', async () => {
    const id = await createSavedGame();
    const fixture = setup(id);
    await fixture.whenStable();
    fixture.detectChanges();

    const m = move({ from: createPosition(6, 1), to: createPosition(5, 0) });
    expect(fixture.componentInstance.getMoveNotation(m)).toBe('B7-A6');
    expect(fixture.componentInstance.getMoveNotation({ ...m, capturedPieces: [piece()] })).toBe('B7xA6');
    expect(fixture.componentInstance.formatDuration(125)).toBe('2:05');
  });

  it('shows the correct result class and text for a white win', async () => {
    const id = await createSavedGame({ winner: 'white' });
    const fixture = setup(id);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.getResultClass()).toBe('white-win');
    expect(fixture.componentInstance.getResultText()).toBe('Victoire Blancs');
  });

  it('auto-plays through the moves once the replay is toggled to play', async () => {
    const id = await createSavedGame();
    const fixture = setup(id);
    await fixture.whenStable();
    fixture.detectChanges();

    vi.useFakeTimers();
    replayService.toggleAutoPlay();
    fixture.detectChanges();

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(replayService.currentMoveIndex()).toBeGreaterThanOrEqual(0);
    vi.useRealTimers();
  });

  async function createSavedGame(overrides: { winner?: 'white' | 'black' | 'draw' } = {}): Promise<string> {
    const id = 'game-1';
    localStorage.setItem(
      `${STORAGE_KEY}_${id}`,
      JSON.stringify({
        metadata: {
          id,
          date: new Date().toISOString(),
          whitePlayer: 'Alice',
          blackPlayer: 'Bob',
          winner: overrides.winner ?? 'white',
          reason: 'resignation',
          variant: 'checkers',
          totalMoves: 2,
          duration: 125,
        },
        moves: [move(), move({ from: createPosition(5, 0), to: createPosition(4, 1) })],
        materialHistory: [],
      }),
    );
    return id;
  }
});
