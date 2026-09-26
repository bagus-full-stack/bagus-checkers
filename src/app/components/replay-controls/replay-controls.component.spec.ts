import { TestBed } from '@angular/core/testing';
import { ReplayControlsComponent } from './replay-controls.component';
import { ReplayService } from '../../core/services/replay.service';
import { SavedGame } from '../../core/models/replay.model';
import { Move } from '../../core/models/move.model';

function savedGame(numMoves: number): SavedGame {
  return {
    metadata: {
      id: 'g1',
      date: '',
      whitePlayer: 'A',
      blackPlayer: 'B',
      winner: null,
      variant: 'international',
      totalMoves: numMoves,
      duration: 0,
    },
    moves: Array.from({ length: numMoves }, () => ({}) as Move),
    materialHistory: [],
  };
}

describe('ReplayControlsComponent', () => {
  let replayService: ReplayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    replayService = TestBed.inject(ReplayService);
  });

  function setup() {
    const fixture = TestBed.createComponent(ReplayControlsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('disables all navigation buttons with no active replay', () => {
    const fixture = setup();
    const [start, prev, , next, end] = fixture.nativeElement.querySelectorAll('.control-btn');
    expect(start.disabled).toBe(true);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    expect(end.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.move-counter').textContent.trim()).toBe('0 / 0');
  });

  it('enables forward navigation and shows the move counter once a replay starts', () => {
    replayService.startReplay(savedGame(3));
    const fixture = setup();

    const [start, prev, , next, end] = fixture.nativeElement.querySelectorAll('.control-btn');
    expect(start.disabled).toBe(true); // canGoBack requires index >= 0, starts at -1
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    expect(end.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.move-counter').textContent.trim()).toBe('0 / 3');
  });

  it('advances and rewinds through moves via the control buttons', () => {
    replayService.startReplay(savedGame(3));
    const fixture = setup();
    const [start, prev, , next, end] = fixture.nativeElement.querySelectorAll('.control-btn');

    next.click();
    fixture.detectChanges();
    expect(replayService.currentMoveIndex()).toBe(0);

    end.click();
    fixture.detectChanges();
    expect(replayService.currentMoveIndex()).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.control-btn')[3].disabled).toBe(true); // can't go further forward

    prev.click();
    fixture.detectChanges();
    expect(replayService.currentMoveIndex()).toBe(1);

    start.click();
    fixture.detectChanges();
    expect(replayService.currentMoveIndex()).toBe(-1);
  });

  it('toggles play/pause label and state', () => {
    replayService.startReplay(savedGame(2));
    const fixture = setup();
    const playBtn = fixture.nativeElement.querySelector('.play-btn');

    expect(playBtn.textContent).toContain('▶️');
    playBtn.click();
    fixture.detectChanges();
    expect(replayService.isAutoPlaying()).toBe(true);
    expect(playBtn.textContent).toContain('⏸️');
  });

  it('changes playback speed and highlights the active speed button', () => {
    replayService.startReplay(savedGame(2));
    const fixture = setup();

    const speedButtons = fixture.nativeElement.querySelectorAll('.speed-btn');
    expect(speedButtons[1].classList.contains('active')).toBe(true); // default 1x

    speedButtons[3].click(); // 2x
    fixture.detectChanges();
    expect(replayService.replayState()?.playbackSpeed).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.speed-btn')[3].classList.contains('active')).toBe(true);
  });

  it('jumps to the slider position on input', () => {
    replayService.startReplay(savedGame(5));
    const fixture = setup();
    const slider = fixture.nativeElement.querySelector('.progress-slider');

    slider.value = '2';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(replayService.currentMoveIndex()).toBe(2);
  });
});
