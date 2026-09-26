import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TutorialCheckersComponent } from './tutorial-checkers.component';

describe('TutorialCheckersComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    Element.prototype.scrollIntoView = vi.fn();
  });

  function setup() {
    const fixture = TestBed.createComponent(TutorialCheckersComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one section per nav link', () => {
    const fixture = setup();
    const sectionIds = ['basics', 'movement', 'capture', 'promotion', 'winning'];
    for (const id of sectionIds) {
      expect(fixture.nativeElement.querySelector(`#${id}`)).not.toBeNull();
    }
    expect(fixture.nativeElement.querySelectorAll('.nav-link').length).toBe(sectionIds.length);
  });

  it('scrolls to the matching section when a nav link is clicked', () => {
    const fixture = setup();
    const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');

    fixture.nativeElement.querySelectorAll('.nav-link')[2].click();

    expect(fixture.nativeElement.querySelector('#capture')).toBe(
      scrollIntoViewSpy.mock.contexts[0]
    );
  });

  it('links the CTA buttons to the local and AI game routes', () => {
    const fixture = setup();
    const links = fixture.nativeElement.querySelectorAll('.cta-btn');
    expect(links[0].getAttribute('href')).toBe('/game/local');
    expect(links[1].getAttribute('href')).toBe('/game/ai');
  });
});
