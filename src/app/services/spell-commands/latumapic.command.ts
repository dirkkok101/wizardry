/**
 * LATUMAPIC Command - Identify Monsters Spell
 *
 * Identifies all monsters for the rest of the expedition.
 * Sets latumapicActive flag in dungeon state.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'

export class LatumapicCommand implements DungeonSpellCommand {
  readonly spellId = 'latumapic'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'latumapic'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster, dungeon } = context

    // Check if already active
    if (dungeon.latumapicActive) {
      return {
        message: `${caster.name} casts ${spell.name}... Monsters are already identified for this expedition.`
      }
    }

    return {
      message: `${caster.name} casts ${spell.name}! All monsters will be identified for the rest of the expedition.`,
      dungeonUpdate: {
        latumapicActive: true
      }
    }
  }
}
