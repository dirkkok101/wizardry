/**
 * LOKTOFEIT Command - Recall to Town Spell
 *
 * Returns party to town from dungeon.
 * Success rate: level-scaled formula from spell data.
 * On success: Party escapes BUT loses all equipment and 90% gold.
 * On failure: Party remains in dungeon (no penalty).
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'
import { RandomService } from '../RandomService'

export class LoktofeitCommand implements DungeonSpellCommand {
  readonly spellId = 'loktofeit'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'loktofeit'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster } = context
    const casterLevel = caster.level || 1

    // Calculate success rate using typed formula from spell data
    let successRate: number
    if (spell.escape?.typed?.type === 'level_scaled') {
      const { base = 0, multiplier, cap = 100 } = spell.escape.typed
      successRate = Math.min(base + (multiplier * casterLevel), cap)
    } else {
      // Fallback formula: (level × 2) + 1, capped at 95%
      successRate = Math.min((casterLevel * 2) + 1, 95)
    }

    const success = RandomService.chance(successRate)

    if (success) {
      // Success - party recalls to town (equipment/gold loss handled by caller)
      return {
        message: `${caster.name} casts ${spell.name}! The party is whisked away to town! All equipment is lost and most gold vanishes!`,
        navigateTo: '/castle'
      }
    } else {
      // Failure - party remains in dungeon
      return {
        message: `${caster.name} casts ${spell.name}... The spell fizzles! The party remains in the dungeon.`
      }
    }
  }
}
