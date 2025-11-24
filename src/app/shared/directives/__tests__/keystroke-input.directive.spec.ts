import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeystrokeInputDirective } from '../keystroke-input.directive';

@Component({
  standalone: true,
  imports: [KeystrokeInputDirective],
  template: '<div appKeystrokeInput (keystroke)="onKeystroke($event)"></div>'
})
class TestComponent {
  onKeystroke = jest.fn();
}

describe('KeystrokeInputDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits keystroke event on any key press', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(component.onKeystroke).toHaveBeenCalledWith(event);
  });

  it('captures different keys', () => {
    const keys = ['a', 'Enter', ' ', 'Escape'];

    keys.forEach(key => {
      const event = new KeyboardEvent('keydown', { key });
      window.dispatchEvent(event);
    });

    expect(component.onKeystroke).toHaveBeenCalledTimes(keys.length);
  });
});
