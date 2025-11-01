import { Injectable } from '@angular/core';
import { GameStateService } from './GameStateService';
import { LoggerService } from './LoggerService';
import { Command } from '../types/Command';

/**
 * CommandExecutorService handles execution of all game commands.
 *
 * This service:
 * - Executes commands in order
 * - Logs command history (for debugging/replay)
 * - Will support undo/redo in future
 * - Will support command queuing for combat
 */
@Injectable({
  providedIn: 'root'
})
export class CommandExecutorService {
  private commandHistory: Command[] = [];

  constructor(
    private gameState: GameStateService,
    private logger: LoggerService
  ) {}

  /**
   * Execute a command immediately.
   *
   * @param command - Command to execute
   * @returns Promise<boolean> - true if command succeeded
   */
  async execute(command: Command): Promise<boolean> {
    this.logger.log(`[Command] Executing: ${command.description}`);

    try {
      const result = await command.execute();

      if (result) {
        this.commandHistory.push(command);
        this.logger.log(`[Command] Success: ${command.description}`);
      } else {
        this.logger.warn(`[Command] Failed: ${command.description}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`[Command] Error executing ${command.description}:`, error);
      return false;
    }
  }

  /**
   * Get command history (for debugging).
   */
  getHistory(): ReadonlyArray<Command> {
    return this.commandHistory;
  }

  /**
   * Clear command history.
   */
  clearHistory(): void {
    this.commandHistory = [];
  }
}
