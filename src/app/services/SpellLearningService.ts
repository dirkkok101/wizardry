import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { SpellDataLoader } from './SpellDataLoader'
import { RandomService } from './RandomService'

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
   * Learn initial spells for a newly created spellcaster.
   * Level 1 spellcasters learn all level 1 spells of their type.
   * Bishops learn all level 1 spells from both mage and priest lists.
   * Returns updated character with initial spells added to knownSpells.
   */
  static learnInitialSpells(character: Character): SpellLearningResult {
    if (!this.isCaster(character)) {
      return { updatedCharacter: character, newSpells: [] }
    }

    // Check if spells are loaded
    if (!SpellDataLoader.isLoaded()) {
      console.warn('SpellDataLoader not loaded, cannot learn initial spells')
      return { updatedCharacter: character, newSpells: [] }
    }

    const isMagic = [CharacterClass.MAGE, CharacterClass.BISHOP, CharacterClass.SAMURAI].includes(character.class)
    const isPriestly = [CharacterClass.PRIEST, CharacterClass.BISHOP, CharacterClass.LORD].includes(character.class)

    const allSpells = SpellDataLoader.getAllSpells()
    const knownSpellIds = new Set(character.knownSpells || [])
    const learnedSpells: Spell[] = []

    // Learn all level 1 mage spells if character has mage casting
    if (isMagic) {
      for (const spell of allSpells.values()) {
        if (spell.casterType === 'mage' && spell.level === 1 && !knownSpellIds.has(spell.id)) {
          learnedSpells.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: 'MAGE'
          })
          knownSpellIds.add(spell.id)
        }
      }
    }

    // Learn all level 1 priest spells if character has priest casting
    if (isPriestly) {
      for (const spell of allSpells.values()) {
        if (spell.casterType === 'priest' && spell.level === 1 && !knownSpellIds.has(spell.id)) {
          learnedSpells.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: 'PRIEST'
          })
          knownSpellIds.add(spell.id)
        }
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

  /**
   * Calculate spell learning chance based on INT or PIE.
   *
   * Formula (authentic Wizardry 1):
   *   LearnChance = (INT or PIE) / 30
   *
   * Examples:
   *   INT 11: 36.7% chance per spell
   *   INT 15: 50% chance per spell
   *   INT 18: 60% chance per spell
   *
   * Bishops use the lower of INT/PIE for learning (both types slower).
   */
  static getSpellLearnChance(character: Character, spellType: 'MAGE' | 'PRIEST'): number {
    let relevantStat: number

    if (character.class === CharacterClass.BISHOP) {
      // Bishops learn slower - use the relevant stat but at 2/3 rate
      relevantStat = spellType === 'MAGE' ? character.intelligence : character.piety
      return (relevantStat / 30) * 0.67 // Bishop penalty
    }

    // Use INT for mage spells, PIE for priest spells
    if (spellType === 'MAGE') {
      relevantStat = character.intelligence
    } else {
      relevantStat = character.piety
    }

    return relevantStat / 30
  }

  /**
   * Learn new spells when leveling up using INT/PIE-based chance.
   *
   * For each unlearned spell at the newly unlocked level:
   *   Roll against LearnChance = (INT or PIE) / 30
   *   If successful, add spell to known spells
   *
   * Returns updated character with new spells added to knownSpells.
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

    const learnedSpells: Spell[] = []
    const knownSpellIds = new Set(character.knownSpells || [])
    const allSpells = SpellDataLoader.getAllSpells()

    // Learn mage spells
    if (isMagic) {
      const mageSpells = this.attemptLearnSpells(
        character,
        oldLevel,
        newLevel,
        MAGE_SPELL_LEVEL_REQUIREMENTS,
        'mage',
        allSpells,
        knownSpellIds
      )
      learnedSpells.push(...mageSpells)
    }

    // Learn priest spells
    if (isPriestly) {
      const priestSpells = this.attemptLearnSpells(
        character,
        oldLevel,
        newLevel,
        PRIEST_SPELL_LEVEL_REQUIREMENTS,
        'priest',
        allSpells,
        knownSpellIds
      )
      learnedSpells.push(...priestSpells)
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

  /**
   * Attempt to learn spells from a specific caster type.
   */
  private static attemptLearnSpells(
    character: Character,
    oldLevel: number,
    newLevel: number,
    requirements: Record<number, number>,
    casterType: 'mage' | 'priest',
    allSpells: Map<string, { id: string; name: string; level: number; casterType: string }>,
    knownSpellIds: Set<string>
  ): Spell[] {
    const learnedSpells: Spell[] = []

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
      return learnedSpells
    }

    // Get available spells at this level
    const availableSpells: Spell[] = []
    for (const spell of allSpells.values()) {
      if (spell.casterType === casterType && spell.level === unlockedSpellLevel) {
        availableSpells.push({
          id: spell.id,
          name: spell.name,
          level: spell.level,
          type: casterType === 'mage' ? 'MAGE' : 'PRIEST'
        })
      }
    }

    // Attempt to learn each spell based on INT/PIE
    const spellType = casterType === 'mage' ? 'MAGE' : 'PRIEST'
    const learnChance = this.getSpellLearnChance(character, spellType)

    for (const spell of availableSpells) {
      if (knownSpellIds.has(spell.id)) {
        continue // Already known
      }

      // Roll for learning (authentic Wizardry formula)
      if (RandomService.roll(learnChance)) {
        learnedSpells.push(spell)
        knownSpellIds.add(spell.id)
      }
    }

    return learnedSpells
  }
}
