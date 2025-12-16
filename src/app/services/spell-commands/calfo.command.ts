/**
 * CALFO Command - Identify Trap Spell
 *
 * Reveals the type of trap on a chest.
 * Used during chest encounter, provides trap information.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'

export class CalfoCommand implements DungeonSpellCommand {
  readonly spellId = 'calfo'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'calfo'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster } = context

    // Note: Actual trap revelation is handled by the chest scene
    // This command just provides the message and signals success
    return {
      message: `${caster.name} casts ${spell.name}! The trap type is revealed.`
    }
  }
}
