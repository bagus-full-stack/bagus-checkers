import { TestBed } from '@angular/core/testing';
import { MaterialGraphComponent } from './material-graph.component';
import { MaterialSnapshot } from '../../core/models/replay.model';

function snapshot(moveNumber: number, advantage: number): MaterialSnapshot {
  return { moveNumber, advantage, whitePawns: 0, whiteKings: 0, blackPawns: 0, blackKings: 0 };
}

describe('MaterialGraphComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup(history: MaterialSnapshot[]) {
    const fixture = TestBed.createComponent(MaterialGraphComponent);
    fixture.componentRef.setInput('history', history);
    fixture.detectChanges();
    return fixture;
  }

  it('shows "Égalité" and a neutral class with an empty history', () => {
    const fixture = setup([]);
    expect(fixture.nativeElement.querySelector('.current-advantage').textContent.trim()).toBe('Égalité');
    expect(fixture.nativeElement.querySelector('.current-advantage').classList.contains('neutral')).toBe(true);
  });

  it('shows a signed positive advantage from the most recent snapshot', () => {
    const fixture = setup([snapshot(1, 2), snapshot(2, 5)]);
    expect(fixture.nativeElement.querySelector('.current-advantage').textContent.trim()).toBe('+5');
    expect(fixture.nativeElement.querySelector('.current-advantage').classList.contains('positive')).toBe(true);
  });

  it('shows a negative advantage without a "+" sign', () => {
    const fixture = setup([snapshot(1, -3)]);
    expect(fixture.nativeElement.querySelector('.current-advantage').textContent.trim()).toBe('-3');
    expect(fixture.nativeElement.querySelector('.current-advantage').classList.contains('negative')).toBe(true);
  });

  it('builds an aria-label naming the leading side and magnitude', () => {
    const fixture = setup([snapshot(1, 4)]);
    expect(fixture.nativeElement.querySelector('.graph-container').getAttribute('aria-label'))
      .toBe('Graphique montrant un avantage de 4 pour les blancs');
  });

  it('renders one bar per snapshot in the history', () => {
    const fixture = setup([snapshot(1, 1), snapshot(2, -1), snapshot(3, 0)]);
    expect(fixture.nativeElement.querySelectorAll('.bar-wrapper').length).toBe(3);
  });

  describe('getBarHeight / getBarTop', () => {
    it('caps height at 45% for advantages at or beyond the max of 20', () => {
      const fixture = setup([]);
      expect(fixture.componentInstance.getBarHeight(20)).toBe(45);
      expect(fixture.componentInstance.getBarHeight(100)).toBe(45);
      expect(fixture.componentInstance.getBarHeight(-20)).toBe(45);
    });

    it('scales height proportionally below the max', () => {
      const fixture = setup([]);
      expect(fixture.componentInstance.getBarHeight(10)).toBeCloseTo(22.5);
    });

    it('positive bars grow upward from the center line, negative bars grow downward from it', () => {
      const fixture = setup([]);
      expect(fixture.componentInstance.getBarTop(10)).toBeCloseTo(50 - 22.5);
      expect(fixture.componentInstance.getBarTop(-10)).toBe(50);
      expect(fixture.componentInstance.getBarTop(0)).toBe(50 - 0);
    });
  });
});
