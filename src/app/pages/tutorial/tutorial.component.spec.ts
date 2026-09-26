import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TutorialComponent } from './tutorial.component';

function routeWithVariant(variant: string | null) {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(variant ? { variant } : {}),
    },
  };
}

describe('TutorialComponent', () => {
  function setup(variant: string | null) {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: routeWithVariant(variant) }],
    });
    const fixture = TestBed.createComponent(TutorialComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the checkers tutorial by default with no variant query param', () => {
    const fixture = setup(null);
    expect(fixture.nativeElement.querySelector('app-tutorial-checkers')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-ludo')).toBeNull();
  });

  it('shows the ludo tutorial when the variant query param is "ludo"', () => {
    const fixture = setup('ludo');
    expect(fixture.nativeElement.querySelector('app-tutorial-ludo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-checkers')).toBeNull();
  });

  it('falls back to checkers for an unrecognized variant value', () => {
    const fixture = setup('chess');
    expect(fixture.nativeElement.querySelector('app-tutorial-checkers')).not.toBeNull();
  });
});
