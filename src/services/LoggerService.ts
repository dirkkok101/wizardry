import { Injectable } from '@angular/core';
import { isDevMode } from '@angular/core';

/**
 * LoggerService provides environment-aware logging.
 *
 * In development mode, logs to console.
 * In production mode, logs are suppressed (can be enhanced to send to monitoring service).
 *
 * This prevents console noise in production while maintaining
 * useful debugging information during development.
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isDev: boolean;

  constructor() {
    this.isDev = isDevMode();
  }

  /**
   * Log informational message (development only).
   */
  log(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(message, ...args);
    }
  }

  /**
   * Log warning message (development only).
   */
  warn(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.warn(message, ...args);
    }
  }

  /**
   * Log error message (always logged, even in production).
   */
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }

  /**
   * Log debug message (development only, more verbose).
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.debug(message, ...args);
    }
  }
}
