/**
 * CharacterStatusHelpers - Re-exports from CharacterService
 *
 * These helpers delegate to CharacterService as the single source of truth
 * for character status checks. Kept for backward compatibility.
 *
 * @deprecated Import directly from '@services/CharacterService' instead.
 */

import { CharacterService } from '@services/CharacterService'

/**
 * Check if a character can take actions (not incapacitated)
 * Used for: selecting chest handler, combat actions, etc.
 *
 * @deprecated Use CharacterService.canAct instead
 */
export const canAct = CharacterService.canAct

/**
 * Check if a character is alive (not dead/ashes/lost)
 * Used for: receiving items, resurrection eligibility, etc.
 *
 * @deprecated Use CharacterService.isAlive instead
 */
export const isAlive = CharacterService.isAlive
