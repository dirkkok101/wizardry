import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VersionDisplayService } from '@services/VersionDisplayService';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: []
})
export class App {
  title = 'Wizardry 1 - Angular Migration';

  private readonly versionDisplay = inject(VersionDisplayService);

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ctrl+V toggles version display
    if (event.ctrlKey && !event.shiftKey && event.key === 'v') {
      event.preventDefault();
      this.versionDisplay.toggle();
    }
  }
}
