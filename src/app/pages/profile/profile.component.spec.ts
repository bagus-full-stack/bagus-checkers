import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { RankingService } from '../../core/services/ranking.service';
import { SupabaseService } from '../../core/services/supabase.service';

function mockSupabaseService(isAuthenticated = false) {
  return {
    isAuthenticated: () => isAuthenticated,
    signUp: vi.fn(),
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmationEmail: vi.fn(),
    signInWithProvider: vi.fn(),
    updateUserProfile: vi.fn(),
    recordGameResult: vi.fn(),
    getCurrentUserProfile: vi.fn(),
    getLeaderboard: vi.fn(),
    signOut: vi.fn(),
  };
}

describe('ProfileComponent', () => {
  let rankingService: RankingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SupabaseService, useValue: mockSupabaseService() }],
    });
    rankingService = TestBed.inject(RankingService);
  });

  function setup() {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  function inputEvent(value: string) {
    return { target: { value } } as unknown as Event;
  }

  it('shows the auth section with the login form by default when logged out', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.auth-section')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.profile-card')).toBeNull();
    expect(fixture.componentInstance.authMode()).toBe('login');
  });

  it('signs in successfully and clears the loading state', async () => {
    const fixture = setup();
    vi.spyOn(rankingService, 'signIn').mockResolvedValue({ success: true });
    fixture.componentInstance.onEmailInput(inputEvent('alice@test.com'));
    fixture.componentInstance.onPasswordInput(inputEvent('secret1'));

    await fixture.componentInstance.onSignIn({ preventDefault: () => {} } as unknown as Event);

    expect(rankingService.signIn).toHaveBeenCalledWith('alice@test.com', 'secret1');
    expect(fixture.componentInstance.isLoading()).toBe(false);
    expect(fixture.componentInstance.authError()).toBe('');
  });

  it('maps a failed sign-in error to a French message', async () => {
    const fixture = setup();
    vi.spyOn(rankingService, 'signIn').mockResolvedValue({ success: false, error: 'Invalid login credentials' });

    await fixture.componentInstance.onSignIn({ preventDefault: () => {} } as unknown as Event);

    expect(fixture.componentInstance.authError()).toBe('Email ou mot de passe incorrect.');
  });

  it('signs up and shows a confirmation message, clearing the form on success', async () => {
    const fixture = setup();
    fixture.componentInstance.authMode.set('register');
    vi.spyOn(rankingService, 'signUp').mockResolvedValue({ success: true, needsConfirmation: true });
    fixture.componentInstance.onUsernameInput(inputEvent('alice'));
    fixture.componentInstance.onEmailInput(inputEvent('alice@test.com'));
    fixture.componentInstance.onPasswordInput(inputEvent('secret1'));

    await fixture.componentInstance.onSignUp({ preventDefault: () => {} } as unknown as Event);

    expect(rankingService.signUp).toHaveBeenCalledWith('alice@test.com', 'secret1', 'alice');
    expect(fixture.componentInstance.authSuccess()).not.toBe('');
    expect(fixture.componentInstance.emailInput()).toBe('');
    expect(fixture.componentInstance.passwordInput()).toBe('');
  });

  it('delegates OAuth sign-in to the ranking service', () => {
    const fixture = setup();
    const spy = vi.spyOn(rankingService, 'signInWithProvider').mockResolvedValue(undefined);

    fixture.componentInstance.signInWithGoogle();
    fixture.componentInstance.signInWithGitHub();
    fixture.componentInstance.signInWithDiscord();

    expect(spy).toHaveBeenNthCalledWith(1, 'google');
    expect(spy).toHaveBeenNthCalledWith(2, 'github');
    expect(spy).toHaveBeenNthCalledWith(3, 'discord');
  });

  it('sends a password reset email when an email is entered', async () => {
    const fixture = setup();
    vi.spyOn(rankingService, 'resetPassword').mockResolvedValue({ success: true });
    fixture.componentInstance.onEmailInput(inputEvent('alice@test.com'));

    await fixture.componentInstance.forgotPassword();

    expect(rankingService.resetPassword).toHaveBeenCalledWith('alice@test.com');
    expect(fixture.componentInstance.authSuccess()).not.toBe('');
  });

  it('does nothing when requesting a password reset without an email', async () => {
    const fixture = setup();
    const spy = vi.spyOn(rankingService, 'resetPassword');

    await fixture.componentInstance.forgotPassword();

    expect(spy).not.toHaveBeenCalled();
  });

  it('resends the confirmation email', async () => {
    const fixture = setup();
    vi.spyOn(rankingService, 'resendConfirmation').mockResolvedValue({ success: true });
    fixture.componentInstance.onEmailInput(inputEvent('alice@test.com'));

    await fixture.componentInstance.resendConfirmation();

    expect(rankingService.resendConfirmation).toHaveBeenCalledWith('alice@test.com');
  });

  it('creates a local profile only when the username is valid', () => {
    const fixture = setup();
    fixture.componentInstance.authMode.set('local');
    fixture.componentInstance.onUsernameInput(inputEvent('ab'));
    fixture.componentInstance.onCreateProfile({ preventDefault: () => {} } as unknown as Event);
    expect(rankingService.userProfile()).toBeNull();

    fixture.componentInstance.onUsernameInput(inputEvent('alice'));
    fixture.componentInstance.onCreateProfile({ preventDefault: () => {} } as unknown as Event);
    expect(rankingService.userProfile()?.username).toBe('alice');
  });

  describe('when logged in', () => {
    function setupLoggedIn() {
      const fixture = setup();
      fixture.componentInstance.onUsernameInput(inputEvent('alice'));
      fixture.componentInstance.onCreateProfile({ preventDefault: () => {} } as unknown as Event);
      fixture.detectChanges();
      return fixture;
    }

    it('renders the profile card with stats instead of the auth section', () => {
      const fixture = setupLoggedIn();
      expect(fixture.nativeElement.querySelector('.auth-section')).toBeNull();
      expect(fixture.nativeElement.querySelector('.profile-card')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.username').textContent).toContain('alice');
      expect(fixture.nativeElement.querySelector('.stats-section')).not.toBeNull();
    });

    it('edits and saves the display name', () => {
      const fixture = setupLoggedIn();
      fixture.componentInstance.startEditName();
      expect(fixture.componentInstance.isEditingName()).toBe(true);

      fixture.componentInstance.onNameInput(inputEvent('Alice Renamed'));
      fixture.componentInstance.saveName();

      expect(fixture.componentInstance.isEditingName()).toBe(false);
      expect(rankingService.userProfile()?.displayName).toBe('Alice Renamed');
    });

    it('changes the avatar via a prompt', () => {
      const fixture = setupLoggedIn();
      vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/avatar.png');

      fixture.componentInstance.changeAvatar();

      expect(rankingService.userProfile()?.avatar).toBe('https://example.com/avatar.png');
    });

    it('logs out after confirmation', async () => {
      const fixture = setupLoggedIn();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await fixture.componentInstance.logout();

      expect(rankingService.userProfile()).toBeNull();
    });

    it('does not log out when the confirmation is dismissed', async () => {
      const fixture = setupLoggedIn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await fixture.componentInstance.logout();

      expect(rankingService.userProfile()).not.toBeNull();
    });
  });
});
