/**
 * DUMAPIC Command - Show Coordinates Spell
 *
 * Reveals party's position in the dungeon.
 * Shows level, X/Y coordinates, and facing direction.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'

export class DumapicCommand implements DungeonSpellCommand {
  readonly spellId = 'dumapic'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'dumapic'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster, dungeon } = context
    const pos = dungeon.position

    return {
      message: `${caster.name} casts ${spell.name}! Level ${dungeon.currentLevel}, Position (${pos.x}, ${pos.y}), Facing ${pos.facing}`
    }
  }
}
