import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: monospace;">
      <h1>Wizardry 1: Proving Grounds of the Mad Overlord</h1>
      <h2>Angular Migration - Phase 1 Complete</h2>
      <p>Core types, services, and data files successfully migrated.</p>
      <ul style="text-align: left;">
        <li>✅ 8 core types</li>
        <li>✅ 5 pure function services</li>
        <li>✅ 270 game data files (1.2 MB)</li>
        <li>✅ 38 service tests passing</li>
      </ul>
      <p style="margin-top: 2rem; color: #666;">Phase 2: Angular infrastructure coming next...</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #000;
      color: #0f0;
    }
  `]
})
export class App {
  title = 'Wizardry 1 - Angular Migration';
}
