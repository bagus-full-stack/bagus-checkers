import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KeyboardHelpComponent } from './keyboard-help.component';

describe('KeyboardHelpComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function setup() {
    const fixture = TestBed.createComponent(KeyboardHelpComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one shortcut item per navigation shortcut', () => {
    const fixture = setup();
    const sections = fixture.nativeElement.querySelectorAll('.shortcut-section');
    const navItems = sections[0].querySelectorAll('.shortcut-item');
    expect(navItems.length).toBe(fixture.componentInstance.navigationShortcuts.length);
  });

  it('formats a plain key shortcut in uppercase', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatShortcut({ key: 'h' })).toBe('H');
  });

  it('formats a ctrl-modified shortcut with the modifier prefixed', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatShortcut({ key: 'z', ctrlKey: true })).toBe('Ctrl + Z');
  });

  it('translates the Escape key to "Échap"', () => {
    const fixture = setup();
    expect(fixture.componentInstance.formatShortcut({ key: 'Escape' })).toBe('ÉCHAP');
  });

  it('emits close on the close button, the backdrop, and the Escape key', () => {
    const fixture = setup();
    const close = vi.fn();
    fixture.componentInstance.close.subscribe(close);

    fixture.nativeElement.querySelector('.close-btn').click();
    expect(close).toHaveBeenCalledTimes(1);

    fixture.nativeElement.querySelector('.modal-content').click();
    expect(close).toHaveBeenCalledTimes(1);

    fixture.nativeElement.querySelector('.modal-backdrop').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).toHaveBeenCalledTimes(2);
  });
});
