import { TestBed } from '@angular/core/testing';
import { GameInfoLudoComponent } from './game-info-ludo.component';
import { LudoEngineService } from '../../core/services';

describe('GameInfoLudoComponent', () => {
  let ludoEngine: LudoEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    ludoEngine = TestBed.inject(LudoEngineService);
  });

  function setup() {
    const fixture = TestBed.createComponent(GameInfoLudoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the current player translated to French with the matching color', () => {
    ludoEngine.startNewGame(['red', 'blue']);
    const fixture = setup();

    const statusSpan = fixture.nativeElement.querySelector('.status-text span');
    expect(statusSpan.textContent.trim()).toBe('Rouge');
    expect(statusSpan.style.color).toBe('rgb(239, 68, 68)');
  });

  it.each([
    ['red', 'Rouge', 'rgb(239, 68, 68)'],
    ['blue', 'Bleu', 'rgb(59, 130, 246)'],
    ['green', 'Vert', 'rgb(34, 197, 94)'],
    ['yellow', 'Jaune', 'rgb(234, 179, 8)'],
  ])('translates %s to %s / %s', (color, name, hex) => {
    const fixture = setup();
    expect(fixture.componentInstance.getPlayerName(color)).toBe(name);
    expect(fixture.componentInstance.getColorHex(color)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('defaults to white/empty for an undefined color', () => {
    const fixture = setup();
    expect(fixture.componentInstance.getColorHex(undefined)).toBe('white');
    expect(fixture.componentInstance.getPlayerName(undefined)).toBe('');
  });
});
