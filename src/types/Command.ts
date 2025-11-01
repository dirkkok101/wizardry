/**
 * Command interface for all game actions.
 *
 * Commands encapsulate game actions using the Command Pattern.
 * This enables:
 * - Undo/redo functionality (future)
 * - Action queuing (for combat rounds)
 * - Replay system from event log
 * - Centralized command logging
 *
 * @example
 * class MovePartyCommand implements Command {
 *   constructor(private direction: Direction) {}
 *
 *   execute(): boolean {
 *     // Move party logic
 *     return true;
 *   }
 *
 *   description = 'Move party north';
 * }
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
