import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { GameAiComponent } from './game-ai.component';

function routeWithVariant(variant: string | null) {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(variant ? { variant } : {}),
    },
  };
}

describe('GameAiComponent', () => {
  function setup(variant: string | null) {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: routeWithVariant(variant) }],
    });
    const fixture = TestBed.createComponent(GameAiComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the checkers AI game by default with no variant query param', () => {
    const fixture = setup(null);
    expect(fixture.nativeElement.querySelector('app-game-ai-checkers')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-game-ai-ludo')).toBeNull();
  });

  it('shows the ludo AI game when the variant query param is "ludo"', () => {
    const fixture = setup('ludo');
    expect(fixture.nativeElement.querySelector('app-game-ai-ludo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-game-ai-checkers')).toBeNull();
  });
});
