/**
 * Default Command - Fallback for Unknown Utility Spells
 *
 * Handles any utility spell not covered by a specific command.
 * Provides a generic success message.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'

export class DefaultCommand implements DungeonSpellCommand {
  readonly spellId = 'default'

  canExecute(_spell: LoadedSpell): boolean {
    // Default command always matches (should be last in registry)
    return true
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster } = context

    return {
      message: `${caster.name} casts ${spell.name}!`
    }
  }
}
