import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'

/**
 * Statuses where a character cannot take actions
 * (dead, petrified, paralyzed, sleeping)
 */
const INCAPACITATED_STATUSES = new Set([
  CharacterStatus.DEAD,
  CharacterStatus.ASHES,
  CharacterStatus.LOST,
  CharacterStatus.PARALYZED,
  CharacterStatus.STONED,
  CharacterStatus.ASLEEP
])

/**
 * Statuses representing death (character needs resurrection)
 */
const DEAD_STATUSES = new Set([
  CharacterStatus.DEAD,
  CharacterStatus.ASHES,
  CharacterStatus.LOST
])

/**
 * Check if a character can take actions (not incapacitated)
 * Used for: selecting chest handler, combat actions, etc.
 */
export function canAct(character: Character): boolean {
  return !INCAPACITATED_STATUSES.has(character.status)
}

/**
 * Check if a character is alive (not dead/ashes/lost)
 * Used for: receiving items, resurrection eligibility, etc.
 */
export function isAlive(character: Character): boolean {
  return !DEAD_STATUSES.has(character.status)
}
