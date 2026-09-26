import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { GameLocalComponent } from './game-local.component';

function routeWithVariant(variant: string | null) {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(variant ? { variant } : {}),
    },
  };
}

describe('GameLocalComponent', () => {
  function setup(variant: string | null) {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: routeWithVariant(variant) }],
    });
    const fixture = TestBed.createComponent(GameLocalComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the checkers game by default with no variant query param', () => {
    const fixture = setup(null);
    expect(fixture.nativeElement.querySelector('app-game-local-checkers')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-game-local-ludo')).toBeNull();
  });

  it('shows the ludo game when the variant query param is "ludo"', () => {
    const fixture = setup('ludo');
    expect(fixture.nativeElement.querySelector('app-game-local-ludo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-game-local-checkers')).toBeNull();
  });
});
