import { TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { UserProfile } from '../../core/models/ranking.model';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    username: 'alice',
    displayName: 'Alice',
    rating: 1200,
    gamesPlayed: 10,
    wins: 6,
    losses: 3,
    draws: 1,
    winStreak: 2,
    bestWinStreak: 4,
    createdAt: '',
    lastPlayedAt: '',
    ...overrides,
  };
}

describe('PlayerCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function setup(p = profile()) {
    const fixture = TestBed.createComponent(PlayerCardComponent);
    fixture.componentRef.setInput('profile', p);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an avatar image when one is set', () => {
    const fixture = setup(profile({ avatar: 'pic.png' }));
    const img = fixture.nativeElement.querySelector('img.avatar');
    expect(img.getAttribute('src')).toBe('pic.png');
    expect(fixture.nativeElement.querySelector('.avatar-placeholder')).toBeNull();
  });

  it('falls back to the first letter of the display name when there is no avatar', () => {
    const fixture = setup(profile({ displayName: 'bob' }));
    expect(fixture.nativeElement.querySelector('.avatar-placeholder').textContent.trim()).toBe('B');
  });

  it('shows the rating badge, rank title and win rate', () => {
    const fixture = setup(profile({ rating: 1200, wins: 5, gamesPlayed: 10 }));
    expect(fixture.nativeElement.querySelector('.rank-badge').textContent.trim()).toBe('1200');
    expect(fixture.nativeElement.querySelector('.rank-title').textContent.trim()).toBe('Amateur');
    expect(fixture.nativeElement.querySelector('.stat-value').textContent.trim()).toBe('10');
  });

  it('hides the stats row in compact mode', () => {
    const fixture = setup();
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stats-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('.player-card').classList.contains('compact')).toBe(true);
  });

  it('shows the challenge button only when showActions is true, and emits the profile on click', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.action-btn')).toBeNull();

    fixture.componentRef.setInput('showActions', true);
    fixture.detectChanges();

    const challenge = vi.fn();
    fixture.componentInstance.challenge.subscribe(challenge);
    fixture.nativeElement.querySelector('.action-btn').click();
    expect(challenge).toHaveBeenCalledWith(fixture.componentInstance.profile());
  });
});
