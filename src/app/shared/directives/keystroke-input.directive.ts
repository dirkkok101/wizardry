import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

/**
 * KeystrokeInputDirective - Captures any keypress.
 *
 * Implements UI Pattern 3: "Press Any Key" Input.
 *
 * Used for scenes like Title Screen where any key press
 * should trigger an action.
 *
 * @example
 * <div appKeystrokeInput (keystroke)="onAnyKey()">
 *   Press any key to continue...
 * </div>
 */
@Directive({
  selector: '[appKeystrokeInput]',
  standalone: true
})
export class KeystrokeInputDirective {
  @Output() keystroke = new EventEmitter<KeyboardEvent>();

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    // Emit the keystroke event
    this.keystroke.emit(event);
  }
}
