import { TestBed } from '@angular/core/testing';
import { DiceComponent } from './dice.component';

describe('DiceComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(DiceComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the dice-face with no dots when there is no value', () => {
    const fixture = setup();
    const dots = fixture.nativeElement.querySelectorAll('.dot');
    expect(dots.length).toBe(0);
    expect(fixture.nativeElement.querySelector('.dice-face').textContent).toContain('🎲');
  });

  it.each([1, 2, 3, 4, 5, 6])('renders %i dot(s) for value %i', (value) => {
    const fixture = setup();
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.dot').length).toBe(value);
  });

  it('emits roll on click', () => {
    const fixture = setup();
    let rolled = false;
    fixture.componentInstance.roll.subscribe(() => (rolled = true));
    fixture.nativeElement.querySelector('button').click();
    expect(rolled).toBe(true);
  });

  it('disables the button and skips the click handler when disabled', () => {
    const fixture = setup();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('is disabled and shows the rolling class while isRolling is true', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isRolling', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('rolling')).toBe(true);
  });
});
