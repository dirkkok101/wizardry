/**
 * CalfoSpellService - Handles the CALFO spell for trap detection
 *
 * CALFO is a priest level 2 spell that identifies traps with 95% accuracy.
 * Unlike manual inspection:
 * - CALFO never triggers traps
 * - Failed CALFO (5%) returns random trap name (deception mechanic)
 *
 * Available to: Priest, Bishop, Lord
 *
 * @see docs/game-design/spells.md
 */

import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { Chest } from '@models/Chest'
import {
  TrapId,
  TrapInspectionResult,
} from '@models/Trap'
import { RandomService } from '../RandomService'
import { TrapDataLoader } from '../TrapDataLoader'

/**
 * CALFO spell success rate (95%)
 */
const CALFO_SUCCESS_RATE = 95

/**
 * Classes that can learn and cast CALFO
 */
const CALFO_CLASSES = new Set([
  CharacterClass.PRIEST,
  CharacterClass.BISHOP,
  CharacterClass.LORD
])

/**
 * Get a random trap ID from loaded trap data
 * Used for deception mechanics when CALFO fails
 */
function getRandomTrapId(): TrapId {
  if (!TrapDataLoader.isLoaded()) {
    throw new Error('Trap data not loaded. Call TrapDataLoader.loadAllTraps() first.')
  }

  const allTraps = TrapDataLoader.getAllTrapEffects()
  const trapIds = Array.from(allTraps.keys())
  return RandomService.pickRandom(trapIds)
}

/**
 * Check if a character can cast CALFO spell
 *
 * Requirements:
 * - Must be Priest, Bishop, or Lord class
 * - Must know the CALFO spell
 * - Must have at least 1 priest level 2 spell point
 */
export function canCastCalfo(character: Character): boolean {
  // Must be a class that can cast CALFO
  if (!CALFO_CLASSES.has(character.class)) {
    return false
  }

  // Check if character knows CALFO
  if (!character.knownSpells.includes('calfo')) {
    return false
  }

  // Check if character has spell points at level 2
  if (!character.spellPoints?.priest?.level2 || character.spellPoints.priest.level2.current < 1) {
    return false
  }

  return true
}

/**
 * Cast CALFO spell to identify trap
 *
 * Original Wizardry 1 behavior:
 * - 95% success rate
 * - Success: Returns real trap information (or null if untrapped)
 * - Failure (5%): Returns RANDOM trap name (deception mechanic!)
 * - CALFO never triggers traps
 *
 * @returns InspectionResult (95% success rate, never triggers trap)
 */
export function castCalfo(caster: Character, chest: Chest): TrapInspectionResult {
  console.log(`[CHEST] CALFO cast: ${caster.name} (${caster.class} L${caster.level})`)

  // CALFO has 95% success rate
  const roll = RandomService.nextRandom() * 100
  const success = roll < CALFO_SUCCESS_RATE
  console.log(`[CHEST]   Roll: ${roll.toFixed(1)}% vs ${CALFO_SUCCESS_RATE}% → ${success ? 'Success' : 'Failed'}`)

  if (success) {
    const trapName = chest.trapped ? chest.trapId : 'No trap'
    console.log(`[CHEST]   Result: ${trapName}`)
    return {
      success: true,
      trapIdentified: chest.trapped ? chest.trapId : null,
      triggered: false
    }
  }

  // Failed CALFO (5%) - return RANDOM trap name (deception mechanic)
  // Same as failed inspection - player cannot tell if result is real
  const randomTrapId = getRandomTrapId()
  console.log(`[CHEST]   Result: ${randomTrapId} (RANDOM - deception!)`)

  return {
    success: false,
    trapIdentified: randomTrapId,
    triggered: false  // CALFO never triggers traps
  }
}

export const CalfoSpellService = {
  canCastCalfo,
  castCalfo,
}
