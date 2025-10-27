import { Alignment } from './Alignment'

/**
 * Character Classes - Original Wizardry classes with requirements
 */
export enum CharacterClass {
  // Basic classes
  FIGHTER = 'FIGHTER',
  MAGE = 'MAGE',
  PRIEST = 'PRIEST',
  THIEF = 'THIEF',

  // Advanced classes (strict requirements)
  BISHOP = 'BISHOP',   // Requires: INT 12, PIE 12
  SAMURAI = 'SAMURAI', // Requires: STR 15, INT 11, PIE 10, VIT 14, AGI 10, alignment GOOD
  LORD = 'LORD',       // Requires: STR 15, INT 12, PIE 12, VIT 15, AGI 14, alignment GOOD
  NINJA = 'NINJA'      // Requires: STR 17, INT 17, PIE 17, VIT 17, AGI 17, alignment EVIL
}

/**
 * Stat requirements for each class
 */
export interface ClassRequirements {
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
  alignment?: Alignment[]
}

/**
 * Class requirements mapping
 */
export const CLASS_REQUIREMENTS: Record<CharacterClass, ClassRequirements> = {
  [CharacterClass.FIGHTER]: {},
  [CharacterClass.MAGE]: {},
  [CharacterClass.PRIEST]: {},
  [CharacterClass.THIEF]: {},
  [CharacterClass.BISHOP]: {
    intelligence: 12,
    piety: 12
  },
  [CharacterClass.SAMURAI]: {
    strength: 15,
    intelligence: 11,
    piety: 10,
    vitality: 14,
    agility: 10,
    alignment: [Alignment.GOOD]
  },
  [CharacterClass.LORD]: {
    strength: 15,
    intelligence: 12,
    piety: 12,
    vitality: 15,
    agility: 14,
    alignment: [Alignment.GOOD]
  },
  [CharacterClass.NINJA]: {
    strength: 17,
    intelligence: 17,
    piety: 17,
    vitality: 17,
    agility: 17,
    alignment: [Alignment.EVIL]
  }
}
