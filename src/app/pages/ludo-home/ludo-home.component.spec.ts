import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LudoHomeComponent } from './ludo-home.component';
import { I18nService } from '../../core/i18n/i18n.service';

describe('LudoHomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function setup() {
    const fixture = TestBed.createComponent(LudoHomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('links each menu button to its route with the ludo variant query param', () => {
    const fixture = setup();
    const links = fixture.nativeElement.querySelectorAll('.menu-btn');
    expect(links[0].getAttribute('href')).toBe('/game/online?variant=ludo');
    expect(links[1].getAttribute('href')).toBe('/game/local?variant=ludo');
    expect(links[2].getAttribute('href')).toBe('/game/ai?variant=ludo');
    expect(links[3].getAttribute('href')).toBe('/tutorial?variant=ludo');
    expect(links[4].getAttribute('href')).toBe('/settings');
  });

  it('shows French labels by default including the translated settings link', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.subtitle').textContent).toContain('Jeu de soci');
    expect(fixture.nativeElement.querySelectorAll('.menu-btn strong')[4].textContent.trim()).toBe('Paramètres');
  });

  it('shows English labels when the language is switched to English', () => {
    const fixture = setup();
    TestBed.inject(I18nService).setLanguage('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.subtitle').textContent).toContain('Classic Board Game');
    expect(fixture.nativeElement.querySelectorAll('.menu-btn strong')[4].textContent.trim()).toBe('Settings');
  });
});
