import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

// Note: this test environment's global `localStorage` throws on every call
// (a Node/Vitest quirk, not app behavior), which ThemeService already
// swallows via try/catch - so it always falls back to its in-memory default.
describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('defaults to auto mode with no stored preference', () => {
    expect(service.themeMode()).toBe('auto');
  });

  it('resolves auto mode to light when the system does not prefer dark (mocked matchMedia)', () => {
    expect(service.activeTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);
  });

  it('setThemeMode changes the active and resolved theme', () => {
    service.setThemeMode('dark');
    expect(service.themeMode()).toBe('dark');
    expect(service.activeTheme()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
  });

  it('toggleTheme flips between light and dark', () => {
    service.setThemeMode('light');
    service.toggleTheme();
    expect(service.themeMode()).toBe('dark');
    service.toggleTheme();
    expect(service.themeMode()).toBe('light');
  });

  it('setAutoMode switches back to auto', () => {
    service.setThemeMode('dark');
    service.setAutoMode();
    expect(service.themeMode()).toBe('auto');
  });

  it('cycleThemeMode goes auto -> light -> dark -> auto', () => {
    expect(service.themeMode()).toBe('auto');
    service.cycleThemeMode();
    expect(service.themeMode()).toBe('light');
    service.cycleThemeMode();
    expect(service.themeMode()).toBe('dark');
    service.cycleThemeMode();
    expect(service.themeMode()).toBe('auto');
  });

  it('applies the dark-theme class to the document root when dark is active', () => {
    service.setThemeMode('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.classList.contains('light-theme')).toBe(false);
  });
});
