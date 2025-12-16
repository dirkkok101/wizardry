/**
 * KANDI Command - Locate Person Spell
 *
 * Locates bodies of dead characters in the dungeon.
 * Shows direction and distance to nearest body.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'

export class KandiCommand implements DungeonSpellCommand {
  readonly spellId = 'kandi'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'kandi'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster } = context

    // Note: Actual body location is handled by BodyRecoveryService
    // This command just provides the message and signals success
    // The maze scene will query for body locations and display them
    return {
      message: `${caster.name} casts ${spell.name}! Searching for bodies...`
    }
  }
}
