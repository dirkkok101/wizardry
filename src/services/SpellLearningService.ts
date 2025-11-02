import { Character } from '../types/Character'
import { CharacterClass } from '../types/CharacterClass'

interface Spell {
  id: string
  name: string
  level: number
  type: 'MAGE' | 'PRIEST'
}

interface SpellLearningResult {
  updatedCharacter: Character
  newSpells: Spell[]
}

// Character levels at which spell levels unlock
const MAGE_SPELL_LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 1,   // Level 1 = Spell Level 1
  2: 3,   // Level 3 = Spell Level 2
  3: 5,   // Level 5 = Spell Level 3
  4: 7,   // Level 7 = Spell Level 4
  5: 9,   // Level 9 = Spell Level 5
  6: 11,  // Level 11 = Spell Level 6
  7: 13   // Level 13 = Spell Level 7
}

const PRIEST_SPELL_LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 1,   // Level 1 = Spell Level 1
  2: 3,   // Level 3 = Spell Level 2
  3: 5,   // Level 5 = Spell Level 3
  4: 7,   // Level 7 = Spell Level 4
  5: 9,   // Level 9 = Spell Level 5
  6: 11,  // Level 11 = Spell Level 6
  7: 13   // Level 13 = Spell Level 7
}

// Sample spell data (in real implementation, load from data/spells/)
const MAGE_SPELLS: Spell[] = [
  { id: 'HALITO', name: 'Halito', level: 1, type: 'MAGE' },
  { id: 'MOGREF', name: 'Mogref', level: 1, type: 'MAGE' },
  { id: 'KATINO', name: 'Katino', level: 1, type: 'MAGE' },
  { id: 'DUMAPIC', name: 'Dumapic', level: 1, type: 'MAGE' },
  { id: 'DILTO', name: 'Dilto', level: 2, type: 'MAGE' },
  { id: 'SOPIC', name: 'Sopic', level: 2, type: 'MAGE' },
  { id: 'MAKANITO', name: 'Makanito', level: 2, type: 'MAGE' }
]

const PRIEST_SPELLS: Spell[] = [
  { id: 'DIOS', name: 'Dios', level: 1, type: 'PRIEST' },
  { id: 'BADIOS', name: 'Badios', level: 1, type: 'PRIEST' },
  { id: 'MILWA', name: 'Milwa', level: 1, type: 'PRIEST' },
  { id: 'PORFIC', name: 'Porfic', level: 1, type: 'PRIEST' },
  { id: 'MATU', name: 'Matu', level: 2, type: 'PRIEST' },
  { id: 'CALFO', name: 'Calfo', level: 2, type: 'PRIEST' }
]

export class SpellLearningService {
  /**
   * Check if character class can cast spells
   */
  static isCaster(character: Character): boolean {
    return [
      CharacterClass.MAGE,
      CharacterClass.PRIEST,
      CharacterClass.BISHOP,
      CharacterClass.SAMURAI,
      CharacterClass.LORD
    ].includes(character.class)
  }

  /**
   * Get highest spell level available to character at current level
   */
  static getAvailableSpellLevel(character: Character): number {
    if (!this.isCaster(character)) {
      return 0
    }

    const isMagic = [CharacterClass.MAGE, CharacterClass.BISHOP, CharacterClass.SAMURAI].includes(character.class)
    const isPriestly = [CharacterClass.PRIEST, CharacterClass.BISHOP, CharacterClass.LORD].includes(character.class)

    // For simplicity, use mage spell level requirements
    // (Bishops use both mage and priest)
    const requirements = isMagic ? MAGE_SPELL_LEVEL_REQUIREMENTS : PRIEST_SPELL_LEVEL_REQUIREMENTS

    let maxLevel = 0
    for (let spellLevel = 1; spellLevel <= 7; spellLevel++) {
      if (character.level >= requirements[spellLevel]) {
        maxLevel = spellLevel
      }
    }

    return maxLevel
  }

  /**
   * Learn new spells when leveling up
   * Returns updated character with new spells added to knownSpells
   */
  static learnNewSpells(
    character: Character,
    oldLevel: number,
    newLevel: number
  ): SpellLearningResult {
    if (!this.isCaster(character)) {
      return { updatedCharacter: character, newSpells: [] }
    }

    const isMagic = [CharacterClass.MAGE, CharacterClass.BISHOP, CharacterClass.SAMURAI].includes(character.class)
    const isPriestly = [CharacterClass.PRIEST, CharacterClass.BISHOP, CharacterClass.LORD].includes(character.class)

    const requirements = isMagic ? MAGE_SPELL_LEVEL_REQUIREMENTS : PRIEST_SPELL_LEVEL_REQUIREMENTS

    // Find what spell level was unlocked
    let unlockedSpellLevel = 0
    for (let spellLevel = 1; spellLevel <= 7; spellLevel++) {
      const reqLevel = requirements[spellLevel]
      if (oldLevel < reqLevel && newLevel >= reqLevel) {
        unlockedSpellLevel = spellLevel
        break
      }
    }

    if (unlockedSpellLevel === 0) {
      return { updatedCharacter: character, newSpells: [] }
    }

    // Get spells for this level
    const spellPool = isMagic ? MAGE_SPELLS : PRIEST_SPELLS
    const availableSpells = spellPool.filter(s => s.level === unlockedSpellLevel)

    if (availableSpells.length === 0) {
      return { updatedCharacter: character, newSpells: [] }
    }

    // Randomly learn 1-2 spells from this level
    const numToLearn = Math.floor(Math.random() * 2) + 1
    const learnedSpells: Spell[] = []
    const knownSpellIds = new Set(character.knownSpells || [])

    for (let i = 0; i < numToLearn && i < availableSpells.length; i++) {
      const spell = availableSpells[Math.floor(Math.random() * availableSpells.length)]
      if (!knownSpellIds.has(spell.id)) {
        learnedSpells.push(spell)
        knownSpellIds.add(spell.id)
      }
    }

    const updatedCharacter: Character = {
      ...character,
      knownSpells: Array.from(knownSpellIds)
    }

    return {
      updatedCharacter,
      newSpells: learnedSpells
    }
  }
}
