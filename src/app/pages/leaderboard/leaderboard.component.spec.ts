import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LeaderboardComponent } from './leaderboard.component';
import { RankingService } from '../../core/services/ranking.service';
import { getRankColor } from '../../core/models/ranking.model';

describe('LeaderboardComponent', () => {
  let rankingService: RankingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    rankingService = TestBed.inject(RankingService);
  });

  function setup() {
    const fixture = TestBed.createComponent(LeaderboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty state with a link to create a profile when nobody is ranked', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state a').getAttribute('href')).toBe('/profile');
    expect(fixture.nativeElement.querySelector('.table-section')).toBeNull();
  });

  it('renders a podium and table row per ranked player', () => {
    rankingService.createProfile('alice');
    rankingService.createProfile('bob');
    rankingService.createProfile('carol');
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.podium-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.podium-place').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('marks the current user row and shows their rank in the banner', () => {
    rankingService.createProfile('alice');
    rankingService.createProfile('bob');
    const fixture = setup();

    const currentUserId = rankingService.userProfile()!.id;
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    const currentRow = Array.from(rows).find((r: any) => r.textContent.includes('bob'));
    expect((currentRow as HTMLElement).classList.contains('current-user')).toBe(true);

    const rank = rankingService.leaderboard().find((e) => e.userId === currentUserId)!.rank;
    expect(fixture.nativeElement.querySelector('.your-rank-banner strong').textContent).toBe(`#${rank}`);
  });

  it('does not show the rank banner when nobody is logged in', () => {
    rankingService.createProfile('alice');
    rankingService.logout();
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('.your-rank-banner')).toBeNull();
  });

  it('exposes getRankColor and isCurrentUser helpers', () => {
    rankingService.createProfile('alice');
    const fixture = setup();

    expect(fixture.componentInstance.getRankColor(1200)).toBe(getRankColor(1200));

    const entry = rankingService.leaderboard()[0];
    expect(fixture.componentInstance.isCurrentUser(entry)).toBe(true);
    expect(fixture.componentInstance.isCurrentUser({ ...entry, userId: 'someone-else' })).toBe(false);
  });
});
