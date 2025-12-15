/**
 * MILWA Command - Temporary Light Spell
 *
 * Creates temporary light in the dungeon (45-87 steps duration).
 * Cannot be cast in darkness zones.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'
import { LightService } from '../LightService'

export class MilwaCommand implements DungeonSpellCommand {
  readonly spellId = 'milwa'

  canExecute(spell: LoadedSpell): boolean {
    return spell.id === 'milwa'
  }

  execute(context: SpellContext): DungeonSpellResult {
    const { spell, caster, dungeon } = context

    // Check if spell can be cast (not in darkness zone)
    const canCast = LightService.canCastLightSpell(dungeon)
    if (!canCast.canCast) {
      return {
        message: `${caster.name} tries to cast ${spell.name}... ${canCast.reason}`
      }
    }

    // Activate light spell via LightService
    const newDungeonState = LightService.activateLightSpell(dungeon, 'MILWA')
    const durationDisplay = LightService.getSpellDurationDisplay(newDungeonState)

    return {
      message: `${caster.name} casts ${spell.name}! The area is illuminated (${durationDisplay}).`,
      dungeonUpdate: {
        lightActive: newDungeonState.lightActive,
        lightRadius: newDungeonState.lightRadius,
        lightSpellType: newDungeonState.lightSpellType,
        lightDurationRemaining: newDungeonState.lightDurationRemaining
      }
    }
  }
}
