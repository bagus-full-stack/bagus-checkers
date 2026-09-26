import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { I18nService } from '../../core/i18n/i18n.service';

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function setup() {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('links each primary menu button to its route', () => {
    const fixture = setup();
    const links = fixture.nativeElement.querySelectorAll('.menu-btn');
    expect(links[0].getAttribute('href')).toBe('/game/local');
    expect(links[1].getAttribute('href')).toBe('/game/ai');
    expect(links[2].getAttribute('href')).toBe('/game/online');
    expect(links[3].getAttribute('href')).toBe('/tutorial');
    expect(links[4].getAttribute('href')).toBe('/settings');
  });

  it('links each secondary menu button to its route', () => {
    const fixture = setup();
    const links = fixture.nativeElement.querySelectorAll('.secondary-btn');
    expect(links[0].getAttribute('href')).toBe('/spectate');
    expect(links[1].getAttribute('href')).toBe('/profile');
    expect(links[2].getAttribute('href')).toBe('/leaderboard');
    expect(links[3].getAttribute('href')).toBe('/replays');
  });

  it('shows French translated labels by default', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.title').textContent.trim()).toBe('Angular Checkers Master');
    expect(fixture.nativeElement.querySelectorAll('.menu-btn strong')[0].textContent.trim()).toBe('Jouer en Local');
    expect(fixture.nativeElement.querySelector('.footer').textContent).toContain('Règles officielles');
  });

  it('shows English translated labels when the language is switched to English', () => {
    const fixture = setup();
    TestBed.inject(I18nService).setLanguage('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.menu-btn strong')[0].textContent.trim()).toBe('Local Play');
    expect(fixture.nativeElement.querySelector('.footer').textContent).toContain('Official Rules');
  });
});
