/**
 * MAPORFIC Command - Party AC Buff Spell
 *
 * Provides -2 AC bonus to entire party for the expedition.
 * Stacks with other AC buffs.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'

export class MaporficCommand implements DungeonSpellCommand {
  readonly spellId = 'maporfic'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'maporfic'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster, dungeon } = context

    // Check if already active (spell ID in active list)
    if (dungeon.activeExpeditionSpells.includes('maporfic')) {
      return {
        message: `${caster.name} casts ${spell.name}... The party's defenses are already enhanced.`
      }
    }

    // Apply AC buff (MAPORFIC provides -2 AC, negative is better)
    const acModifier = spell.acModifier ?? -2
    const newAcBuff = dungeon.expeditionAcBuff + acModifier
    const newActiveSpells = [...dungeon.activeExpeditionSpells, 'maporfic']

    return {
      message: `${caster.name} casts ${spell.name}! The party's armor strengthens.`,
      dungeonUpdate: {
        expeditionAcBuff: newAcBuff,
        activeExpeditionSpells: newActiveSpells
      }
    }
  }
}
