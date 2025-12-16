/**
 * Spell Command Interface and Types
 *
 * Implements Command pattern for dungeon utility spells (MILWA, DUMAPIC, etc.)
 * Each spell has its own command file implementing this interface.
 *
 * SOLID Principles:
 * - S: Each command file = one spell = single responsibility
 * - O: Add new spells by adding new command files
 * - L: All commands substitutable via this interface
 * - I: Focused interface for spell execution
 * - D: Registry depends on interface, not concrete classes
 */

import { Character } from '@models/Character'
import { DungeonState } from '@models/Dungeon'
import { LoadedSpell } from '@models/SpellDefinition'

/**
 * Result of executing a dungeon spell command
 */
export interface DungeonSpellResult {
  /** Message to display to the user */
  message: string
  /** Partial update to apply to dungeon state */
  dungeonUpdate?: Partial<DungeonState>
  /** Route to navigate to (e.g., '/castle' for LOKTOFEIT recall) */
  navigateTo?: string
}

/**
 * Context passed to all spell commands
 */
export interface SpellContext {
  spell: LoadedSpell
  caster: Character
  dungeon: DungeonState
}

/**
 * Command interface for dungeon utility spells
 * Each spell has its own command file implementing this interface
 */
export interface DungeonSpellCommand {
  /** Spell ID this command handles (e.g., 'milwa', 'dumapic') */
  readonly spellId: string

  /** Check if this command handles the given spell */
  canExecute(spell: LoadedSpell): boolean

  /** Execute the spell (pure function - no side effects) */
  execute(context: SpellContext): DungeonSpellResult
}
