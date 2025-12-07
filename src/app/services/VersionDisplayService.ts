import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'wizardry_show_version';

/**
 * Service to manage version display visibility across all scenes.
 * State is persisted to localStorage and toggled with Ctrl+V.
 */
@Injectable({ providedIn: 'root' })
export class VersionDisplayService {
  private readonly showVersionSignal = signal(this.loadFromStorage());

  /** Whether to show version in scene headers */
  readonly showVersion = this.showVersionSignal.asReadonly();

  /** Toggle version visibility and persist to storage */
  toggle(): void {
    const newValue = !this.showVersionSignal();
    this.showVersionSignal.set(newValue);
    this.saveToStorage(newValue);
  }

  /** Enable version display */
  show(): void {
    this.showVersionSignal.set(true);
    this.saveToStorage(true);
  }

  /** Disable version display */
  hide(): void {
    this.showVersionSignal.set(false);
    this.saveToStorage(false);
  }

  private loadFromStorage(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Default to true (show version) if not set
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  }

  private saveToStorage(value: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore storage errors
    }
  }
}
