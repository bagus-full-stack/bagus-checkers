import { TestBed } from '@angular/core/testing';
import { GameAnalysisComponent } from './game-analysis.component';
import { GameAnalysis, MoveAnalysis } from '../../core/ai';
import { Move } from '../../core/models';

function moveAnalysis(overrides: Partial<MoveAnalysis> = {}): MoveAnalysis {
  return {
    moveNumber: 1,
    move: {} as Move,
    player: 'white',
    evaluation: 150,
    previousEvaluation: 100,
    evaluationChange: 50,
    classification: 'good',
    ...overrides,
  };
}

function analysis(overrides: Partial<GameAnalysis> = {}): GameAnalysis {
  return {
    moves: [moveAnalysis()],
    summary: {
      totalMoves: 1,
      whiteAccuracy: 92,
      blackAccuracy: 78,
      whiteMistakes: 1,
      blackMistakes: 2,
      whiteBlunders: 0,
      blackBlunders: 1,
      averageEvaluationWhite: 10,
      averageEvaluationBlack: -10,
    },
    criticalMoments: [],
    suggestions: [],
    ...overrides,
  };
}

describe('GameAnalysisComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup() {
    return TestBed.createComponent(GameAnalysisComponent);
  }

  it('shows the "no analysis" message when there is no data', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.no-analysis')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.analysis-content')).toBeNull();
  });

  it('shows the accuracy bars and mistake/blunder totals from the summary', () => {
    const fixture = setup();
    fixture.componentRef.setInput('analysis', analysis());
    fixture.detectChanges();

    const accuracyValues = fixture.nativeElement.querySelectorAll('.accuracy-value');
    expect(accuracyValues[0].textContent.trim()).toBe('92%');
    expect(accuracyValues[1].textContent.trim()).toBe('78%');

    const statValues = fixture.nativeElement.querySelectorAll('.stat-value');
    expect(statValues[0].textContent.trim()).toBe('1'); // totalMoves
    expect(statValues[1].textContent.trim()).toBe('3'); // whiteMistakes + blackMistakes
    expect(statValues[2].textContent.trim()).toBe('1'); // whiteBlunders + blackBlunders
  });

  it('hides the critical moments and suggestions sections when they are empty', () => {
    const fixture = setup();
    fixture.componentRef.setInput('analysis', analysis());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.critical-section')).toBeNull();
    expect(fixture.nativeElement.querySelector('.suggestions-section')).toBeNull();
    expect(fixture.nativeElement.querySelector('.opening-info')).toBeNull();
  });

  it('renders critical moments, suggestions and opening name when present', () => {
    const fixture = setup();
    fixture.componentRef.setInput('analysis', analysis({
      criticalMoments: [
        { moveNumber: 5, description: 'Perte de matériel', evaluationSwing: -300, type: 'blunder' },
      ],
      suggestions: ['Évitez les échanges défavorables'],
      openingName: 'Défense classique',
    }));
    fixture.detectChanges();

    const moment = fixture.nativeElement.querySelector('.critical-item');
    expect(moment.classList.contains('blunder')).toBe(true);
    expect(moment.querySelector('.moment-move').textContent).toContain('5');
    expect(moment.querySelector('.moment-swing').textContent.trim()).toBe('-3.0');

    expect(fixture.nativeElement.querySelector('.suggestion-item').textContent.trim())
      .toBe('Évitez les échanges défavorables');
    expect(fixture.nativeElement.querySelector('.opening-name').textContent.trim()).toBe('Défense classique');
  });

  it('keeps the move-by-move list collapsed by default and toggles it on click', () => {
    const fixture = setup();
    fixture.componentRef.setInput('analysis', analysis());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moves-list')).toBeNull();
    expect(fixture.nativeElement.querySelector('.toggle-icon').textContent.trim()).toBe('▶');

    fixture.nativeElement.querySelector('.section-toggle').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.moves-list')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.toggle-icon').textContent.trim()).toBe('▼');
    expect(fixture.nativeElement.querySelector('.move-item').classList.contains('good')).toBe(true);
    expect(fixture.nativeElement.querySelector('.move-eval').textContent.trim()).toBe('+1.5');
  });

  it('shows an optional move comment only when present', () => {
    const fixture = setup();
    fixture.componentRef.setInput('analysis', analysis({
      moves: [moveAnalysis({ comment: 'Meilleur coup possible' })],
    }));
    fixture.detectChanges();
    fixture.componentInstance.showMoves.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.move-comment').textContent.trim()).toBe('Meilleur coup possible');
  });

  it.each([
    ['brilliant', '#1abc9c'],
    ['blunder', '#c0392b'],
  ] as const)('exposes the icon and color for classification %s', (classification, expectedColor) => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.componentInstance.getIcon(classification)).toBeTruthy();
    expect(fixture.componentInstance.getColor(classification)).toBe(expectedColor);
  });

  it('formats evaluations from centipawns with a leading sign for non-negative values', () => {
    const fixture = setup();
    fixture.detectChanges();
    expect(fixture.componentInstance.formatEval(250)).toBe('+2.5');
    expect(fixture.componentInstance.formatEval(0)).toBe('+0.0');
    expect(fixture.componentInstance.formatEval(-150)).toBe('-1.5');
  });

  it('emits close when the close button is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();
    const close = vi.fn();
    fixture.componentInstance.close.subscribe(close);
    fixture.nativeElement.querySelector('.close-btn').click();
    expect(close).toHaveBeenCalled();
  });
});
