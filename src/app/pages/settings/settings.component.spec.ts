import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { GameVariantService, PreferencesService } from '../../core/services';
import { I18nService } from '../../core/i18n/i18n.service';

describe('SettingsComponent', () => {
  let variantService: GameVariantService;
  let preferencesService: PreferencesService;
  let i18n: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    variantService = TestBed.inject(GameVariantService);
    preferencesService = TestBed.inject(PreferencesService);
    i18n = TestBed.inject(I18nService);
  });

  function setup() {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one radio button per available language, variant, theme and piece style', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelectorAll('.language-option').length).toBe(i18n.availableLanguages.length);
    expect(fixture.nativeElement.querySelectorAll('.variant-option').length).toBe(
      fixture.componentInstance.variants.length,
    );
    expect(fixture.nativeElement.querySelectorAll('.theme-option').length).toBe(
      fixture.componentInstance.boardThemes.length,
    );
    expect(fixture.nativeElement.querySelectorAll('.piece-style-option').length).toBe(
      fixture.componentInstance.pieceStyles.length,
    );
  });

  it('selects a language and marks it as selected', () => {
    const fixture = setup();
    fixture.componentInstance.selectLanguage('en');
    fixture.detectChanges();

    expect(i18n.currentLanguage()).toBe('en');
    const selected = fixture.nativeElement.querySelector('.language-option.selected');
    expect(selected.textContent).toContain('English');
  });

  it('selects a game variant and marks it as selected', () => {
    const fixture = setup();
    const target = fixture.componentInstance.variants.find((v) => v.id !== variantService.currentVariant().id)!;

    fixture.componentInstance.selectVariant(target.id);
    fixture.detectChanges();

    expect(variantService.currentVariant().id).toBe(target.id);
    expect(fixture.componentInstance.isSelectedVariant(target.id)).toBe(true);
    expect(fixture.componentInstance.getCurrentVariantName()).toBe(target.name);
  });

  it('selects a board theme and a piece style', () => {
    const fixture = setup();
    const theme = fixture.componentInstance.boardThemes.find((t) => t.id !== preferencesService.boardTheme()) ?? fixture.componentInstance.boardThemes[1];
    const style = fixture.componentInstance.pieceStyles.find((s) => s.id !== preferencesService.pieceStyle()) ?? fixture.componentInstance.pieceStyles[1];

    fixture.componentInstance.selectTheme(theme.id);
    fixture.componentInstance.selectPieceStyle(style.id);
    fixture.detectChanges();

    expect(preferencesService.boardTheme()).toBe(theme.id);
    expect(preferencesService.pieceStyle()).toBe(style.id);
  });

  it('toggles sound, animations, valid-move hints and last-move highlighting', () => {
    const fixture = setup();
    const initialSound = preferencesService.soundEnabled();
    const initialAnimations = preferencesService.animationsEnabled();
    const initialValidMoves = preferencesService.showValidMoves();
    const initialLastMove = preferencesService.showLastMove();

    fixture.componentInstance.toggleSound();
    fixture.componentInstance.toggleAnimations();
    fixture.componentInstance.toggleShowValidMoves();
    fixture.componentInstance.toggleShowLastMove();

    expect(preferencesService.soundEnabled()).toBe(!initialSound);
    expect(preferencesService.animationsEnabled()).toBe(!initialAnimations);
    expect(preferencesService.showValidMoves()).toBe(!initialValidMoves);
    expect(preferencesService.showLastMove()).toBe(!initialLastMove);
  });

  it('toggling a checkbox in the DOM calls through to the preferences service', () => {
    const fixture = setup();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelectorAll('.toggle-input')[0];
    const initialSound = preferencesService.soundEnabled();

    checkbox.dispatchEvent(new Event('change'));
    expect(preferencesService.soundEnabled()).toBe(!initialSound);
  });
});
