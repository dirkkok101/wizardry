/**
 * Spell Command Registry
 *
 * Selects and executes the appropriate spell command.
 * Commands are registered in priority order (default must be last).
 *
 * Benefits:
 * - Add new spells by creating new command file + registering here
 * - Each command independently testable
 * - Enables future logging/replay for event sourcing
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'
import { Character } from '@models/Character'
import { DungeonState } from '@models/Dungeon'

// Import all commands
import { MilwaCommand } from './milwa.command'
import { LomilwaCommand } from './lomilwa.command'
import { DumapicCommand } from './dumapic.command'
import { LoktofeitCommand } from './loktofeit.command'
import { LatumapicCommand } from './latumapic.command'
import { MaporficCommand } from './maporfic.command'
import { CalfoCommand } from './calfo.command'
import { KandiCommand } from './kandi.command'
import { DefaultCommand } from './default.command'

export class SpellCommandRegistry {
  private readonly commands: DungeonSpellCommand[]

  constructor() {
    // Register commands in priority order (default must be last)
    this.commands = [
      new MilwaCommand(),
      new LomilwaCommand(),
      new DumapicCommand(),
      new LoktofeitCommand(),
      new LatumapicCommand(),
      new MaporficCommand(),
      new CalfoCommand(),
      new KandiCommand(),
      new DefaultCommand()  // Must be last - matches any spell
    ]
  }

  /**
   * Execute a dungeon utility spell
   * Finds the appropriate command and executes it
   */
  execute(spell: LoadedSpell, caster: Character, dungeon: DungeonState): DungeonSpellResult {
    const context: SpellContext = { spell, caster, dungeon }
    const command = this.commands.find(c => c.canExecute(spell))!
    return command.execute(context)
  }

  /**
   * Check if a spell is a dungeon utility spell (handled by this registry)
   * Returns true for spells that modify dungeon state or provide utility effects
   */
  isDungeonUtilitySpell(spell: LoadedSpell): boolean {
    // Utility spells (MILWA, DUMAPIC, etc.)
    if (spell.utility) return true

    // AC buff spells with expedition duration (MAPORFIC)
    if (spell.acModifier && spell.buffDuration === 'expedition') return true

    return false
  }
}

// Singleton instance for use throughout the application
export const spellCommandRegistry = new SpellCommandRegistry()
