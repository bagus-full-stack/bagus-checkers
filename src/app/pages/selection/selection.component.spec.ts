import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SelectionComponent } from './selection.component';
import { I18nService } from '../../core/i18n/i18n.service';

describe('SelectionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function setup() {
    const fixture = TestBed.createComponent(SelectionComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('links to the checkers and ludo routes', () => {
    const fixture = setup();
    const links = fixture.nativeElement.querySelectorAll('a.game-card');
    expect(links[0].getAttribute('href')).toBe('/checkers');
    expect(links[1].getAttribute('href')).toBe('/ludo');
  });

  it('shows French descriptions by default', () => {
    const fixture = setup();
    const descriptions = fixture.nativeElement.querySelectorAll('.game-desc');
    expect(descriptions[0].textContent).toContain('Dames Internationales');
    expect(descriptions[1].textContent).toContain('Jeu de société classique');
  });

  it('shows English descriptions when the language is switched to English', () => {
    const fixture = setup();
    TestBed.inject(I18nService).setLanguage('en');
    fixture.detectChanges();

    const descriptions = fixture.nativeElement.querySelectorAll('.game-desc');
    expect(descriptions[0].textContent).toContain('International Checkers');
    expect(descriptions[1].textContent).toContain('Classic board game');
  });
});
