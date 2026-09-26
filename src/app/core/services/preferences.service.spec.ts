import { TestBed } from '@angular/core/testing';
import { PreferencesService } from './preferences.service';
import { DEFAULT_PREFERENCES, BOARD_THEMES } from '../models';

describe('PreferencesService', () => {
  let service: PreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PreferencesService);
  });

  it('starts with default preferences', () => {
    expect(service.preferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('setBoardTheme updates the board theme and its resolved config', () => {
    const otherTheme = Object.keys(BOARD_THEMES).find((t) => t !== DEFAULT_PREFERENCES.boardTheme) as keyof typeof BOARD_THEMES;
    service.setBoardTheme(otherTheme);
    expect(service.boardTheme()).toBe(otherTheme);
    expect(service.boardThemeConfig()).toEqual(BOARD_THEMES[otherTheme]);
  });

  it('setPieceStyle updates the piece style', () => {
    service.setPieceStyle('3d');
    expect(service.pieceStyle()).toBe('3d');
  });

  it('toggleSound flips soundEnabled', () => {
    const initial = service.soundEnabled();
    service.toggleSound();
    expect(service.soundEnabled()).toBe(!initial);
  });

  it('toggleAnimations flips animationsEnabled', () => {
    const initial = service.animationsEnabled();
    service.toggleAnimations();
    expect(service.animationsEnabled()).toBe(!initial);
  });

  it('toggleShowValidMoves flips showValidMoves', () => {
    const initial = service.showValidMoves();
    service.toggleShowValidMoves();
    expect(service.showValidMoves()).toBe(!initial);
  });

  it('toggleShowLastMove flips showLastMove', () => {
    const initial = service.showLastMove();
    service.toggleShowLastMove();
    expect(service.showLastMove()).toBe(!initial);
  });

  it('updatePreferences merges a partial update into current preferences', () => {
    service.updatePreferences({ soundEnabled: false, animationsEnabled: false });
    expect(service.preferences()).toEqual({
      ...DEFAULT_PREFERENCES,
      soundEnabled: false,
      animationsEnabled: false,
    });
  });

  it('resetToDefaults restores the default preferences after changes', () => {
    service.toggleSound();
    service.setPieceStyle('3d');
    service.resetToDefaults();
    expect(service.preferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('applies board theme colors as CSS custom properties on the document root', () => {
    const theme = BOARD_THEMES[DEFAULT_PREFERENCES.boardTheme];
    service.setBoardTheme(DEFAULT_PREFERENCES.boardTheme);
    expect(document.documentElement.style.getPropertyValue('--board-light')).toBe(theme.lightSquare);
    expect(document.documentElement.style.getPropertyValue('--board-dark')).toBe(theme.darkSquare);
  });
});
