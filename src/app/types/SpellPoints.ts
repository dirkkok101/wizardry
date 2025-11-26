import { MaxCurrent } from './MaxCurrent'

/**
 * Spell point pool for a single spell type (7 levels)
 * Each level has 0-9 maximum points
 */
export type SpellPointPool = {
  level1: MaxCurrent  // 0-9 points
  level2: MaxCurrent
  level3: MaxCurrent
  level4: MaxCurrent
  level5: MaxCurrent
  level6: MaxCurrent
  level7: MaxCurrent
}

/**
 * Character spell points (mage and/or priest)
 * Fighters have undefined, Bishops have both
 */
export interface CharacterSpellPoints {
  mage?: SpellPointPool
  priest?: SpellPointPool
}
