/**
 * LOMILWA Command - Permanent Light Spell
 *
 * Creates permanent light for entire expedition (32000 steps).
 * Cannot be cast in darkness zones.
 * Both mage and priest versions are handled.
 */

import { DungeonSpellCommand, SpellContext, DungeonSpellResult } from './spell-command.interface'
import { LoadedSpell } from '@models/SpellDefinition'
import { LightService } from '../LightService'

export class LomilwaCommand implements DungeonSpellCommand {
  readonly spellId = 'lomilwa'

  canExecute(spell: LoadedSpell): boolean {
    // Handle both mage and priest versions
    return spell.id === 'lomilwa' || spell.id === 'lomilwa_priest'
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
    const newDungeonState = LightService.activateLightSpell(dungeon, 'LOMILWA')

    return {
      message: `${caster.name} casts ${spell.name}! The area is permanently illuminated.`,
      dungeonUpdate: {
        lightActive: newDungeonState.lightActive,
        lightRadius: newDungeonState.lightRadius,
        lightSpellType: newDungeonState.lightSpellType,
        lightDurationRemaining: newDungeonState.lightDurationRemaining
      }
    }
  }
}
