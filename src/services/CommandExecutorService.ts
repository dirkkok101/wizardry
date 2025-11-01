import { Injectable } from '@angular/core';
import { GameStateService } from './GameStateService';

/**
 * Command interface for all game actions.
 *
 * Commands encapsulate game actions and can be:
 * - Executed
 * - Undone (future feature)
 * - Queued (for combat)
 * - Logged (for replay system)
 */
export interface Command {
  /**
   * Execute the command, updating game state.
   * Returns true if command succeeded, false if it failed.
   */
  execute(): boolean | Promise<boolean>;

  /**
   * Optional: Undo the command (for future undo/redo system).
   */
  undo?(): void;

  /**
   * Human-readable description for logging/debugging.
   */
  description: string;
}

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

  constructor(private gameState: GameStateService) {}

  /**
   * Execute a command immediately.
   *
   * @param command - Command to execute
   * @returns Promise<boolean> - true if command succeeded
   */
  async execute(command: Command): Promise<boolean> {
    console.log(`[Command] Executing: ${command.description}`);

    try {
      const result = await command.execute();

      if (result) {
        this.commandHistory.push(command);
        console.log(`[Command] Success: ${command.description}`);
      } else {
        console.log(`[Command] Failed: ${command.description}`);
      }

      return result;
    } catch (error) {
      console.error(`[Command] Error executing ${command.description}:`, error);
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
