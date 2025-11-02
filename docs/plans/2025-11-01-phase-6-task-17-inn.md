# Task 17: Inn (Rest & Level-Up) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Adventurer's Inn with character rest system, multiple room types, level-up mechanics including HP increases, stat rolling, and spell learning for casters.

**Architecture:** Replace current simplified party-rest system with per-character resting. Create LevelUpService for stat/HP increases and SpellLearningService for caster progression. Use signal-based rest loop with animation. Level up triggers only when HP reaches max.

**Tech Stack:** Angular 19, TypeScript 5.5+, Jest, Signal-based state management, Pure function services

---

## Part 1: Level-Up Service

### Task 17.1: Write Level-Up Service Tests

**Files:**
- Create: `src/services/__tests__/LevelUpService.spec.ts`

**Step 1: Write failing tests for XP requirements**

```typescript
import { LevelUpService } from '../LevelUpService'
import { createTestCharacter } from '../../test-helpers/test-factories'
import { CharacterClass } from '../../types/CharacterClass'

describe('LevelUpService', () => {
  describe('getXPRequirement', () => {
    it('calculates XP requirement for Fighter level 2', () => {
      const xp = LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER)

      // Fighters level fast: base 1000 * 2^1.5 * 0.8 ≈ 2262
      expect(xp).toBe(2262)
    })

    it('calculates XP requirement for Mage level 2', () => {
      const xp = LevelUpService.getXPRequirement(2, CharacterClass.MAGE)

      // Mages level slow: base 1000 * 2^1.5 * 1.2 ≈ 3394
      expect(xp).toBe(3394)
    })

    it('calculates increasing XP for higher levels', () => {
      const level2 = LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER)
      const level3 = LevelUpService.getXPRequirement(3, CharacterClass.FIGHTER)
      const level4 = LevelUpService.getXPRequirement(4, CharacterClass.FIGHTER)

      expect(level3).toBeGreaterThan(level2)
      expect(level4).toBeGreaterThan(level3)
    })
  })

  describe('canLevelUp', () => {
    it('returns true when character has enough XP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER
      })

      const result = LevelUpService.canLevelUp(character)

      expect(result).toBe(true)
    })

    it('returns false when character lacks XP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 1000,
        class: CharacterClass.FIGHTER
      })

      const result = LevelUpService.canLevelUp(character)

      expect(result).toBe(false)
    })

    it('returns false when already at max level (13)', () => {
      const character = createTestCharacter({
        level: 13,
        experience: 999999,
        class: CharacterClass.FIGHTER
      })

      const result = LevelUpService.canLevelUp(character)

      expect(result).toBe(false)
    })
  })

  describe('rollHPIncrease', () => {
    it('rolls HP increase for Fighter (d10 hit die)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        vitality: 16 // +2 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      // d10 + 2 VIT bonus = 3-12 HP
      expect(hpIncrease).toBeGreaterThanOrEqual(3)
      expect(hpIncrease).toBeLessThanOrEqual(12)
    })

    it('rolls HP increase for Mage (d4 hit die)', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        vitality: 10 // +0 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      // d4 + 0 VIT bonus = 1-4 HP
      expect(hpIncrease).toBeGreaterThanOrEqual(1)
      expect(hpIncrease).toBeLessThanOrEqual(4)
    })

    it('guarantees minimum 1 HP even with negative VIT bonus', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        vitality: 3 // -3 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      expect(hpIncrease).toBeGreaterThanOrEqual(1)
    })
  })

  describe('rollStatIncreases', () => {
    it('returns stat increases object', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER
      })

      const statIncreases = LevelUpService.rollStatIncreases(character)

      expect(statIncreases).toBeDefined()
      expect(typeof statIncreases).toBe('object')
      // Stats may or may not increase (random)
    })

    it('increases stats by at most 1 point each', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER
      })

      const statIncreases = LevelUpService.rollStatIncreases(character)

      Object.values(statIncreases).forEach(increase => {
        expect(increase).toBeLessThanOrEqual(1)
        expect(increase).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('performLevelUp', () => {
    it('increases character level by 1', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 10,
        maxHp: 10
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.updatedCharacter.level).toBe(2)
    })

    it('increases max HP by rolled amount', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        vitality: 16
      })

      const result = LevelUpService.performLevelUp(character)

      // d10 + 2 VIT = 3-12 increase
      const hpIncrease = result.updatedCharacter.maxHp - 15
      expect(hpIncrease).toBeGreaterThanOrEqual(3)
      expect(hpIncrease).toBeLessThanOrEqual(12)
      expect(result.levelUpData.hpIncrease).toBe(hpIncrease)
    })

    it('sets HP to new max HP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.updatedCharacter.hp).toBe(result.updatedCharacter.maxHp)
    })

    it('applies stat increases to character', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        strength: 14
      })

      // Mock Math.random to guarantee stat increase
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.01) // Always trigger 5% chance

      const result = LevelUpService.performLevelUp(character)

      Math.random = originalRandom

      // At least one stat should increase
      const statsIncreased = Object.keys(result.levelUpData.statIncreases).length
      expect(statsIncreased).toBeGreaterThan(0)
    })

    it('returns level up data for UI display', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.levelUpData.newLevel).toBe(2)
      expect(result.levelUpData.hpIncrease).toBeGreaterThan(0)
      expect(result.levelUpData.statIncreases).toBeDefined()
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- LevelUpService`
Expected: All tests fail - "LevelUpService is not defined"

**Step 3: Implement LevelUpService**

**Files:**
- Create: `src/services/LevelUpService.ts`

```typescript
import { Character } from '../types/Character'
import { CharacterClass } from '../types/CharacterClass'

interface StatIncreases {
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
}

interface LevelUpData {
  newLevel: number
  hpIncrease: number
  statIncreases: StatIncreases
}

interface LevelUpResult {
  updatedCharacter: Character
  levelUpData: LevelUpData
}

const MAX_LEVEL = 13

// Class XP multipliers (lower = faster leveling)
const CLASS_XP_MULTIPLIERS: Record<CharacterClass, number> = {
  [CharacterClass.FIGHTER]: 0.8,
  [CharacterClass.THIEF]: 0.9,
  [CharacterClass.MAGE]: 1.2,
  [CharacterClass.PRIEST]: 1.0,
  [CharacterClass.BISHOP]: 1.3,
  [CharacterClass.SAMURAI]: 1.1,
  [CharacterClass.LORD]: 1.1,
  [CharacterClass.NINJA]: 1.2
}

// Hit dice by class (for HP rolls)
const CLASS_HIT_DICE: Record<CharacterClass, number> = {
  [CharacterClass.FIGHTER]: 10,
  [CharacterClass.LORD]: 10,
  [CharacterClass.SAMURAI]: 8,
  [CharacterClass.NINJA]: 6,
  [CharacterClass.PRIEST]: 8,
  [CharacterClass.BISHOP]: 6,
  [CharacterClass.THIEF]: 6,
  [CharacterClass.MAGE]: 4
}

// Stat increase chances by class (% per stat per level)
const CLASS_STAT_CHANCES: Record<CharacterClass, Record<string, number>> = {
  [CharacterClass.FIGHTER]: {
    strength: 5,
    intelligence: 1,
    piety: 1,
    vitality: 4,
    agility: 3,
    luck: 2
  },
  [CharacterClass.MAGE]: {
    strength: 1,
    intelligence: 5,
    piety: 2,
    vitality: 2,
    agility: 2,
    luck: 2
  },
  [CharacterClass.PRIEST]: {
    strength: 2,
    intelligence: 2,
    piety: 5,
    vitality: 3,
    agility: 2,
    luck: 2
  },
  [CharacterClass.THIEF]: {
    strength: 2,
    intelligence: 2,
    piety: 1,
    vitality: 2,
    agility: 5,
    luck: 4
  },
  [CharacterClass.BISHOP]: {
    strength: 1,
    intelligence: 4,
    piety: 4,
    vitality: 2,
    agility: 2,
    luck: 2
  },
  [CharacterClass.SAMURAI]: {
    strength: 4,
    intelligence: 3,
    piety: 2,
    vitality: 3,
    agility: 3,
    luck: 2
  },
  [CharacterClass.LORD]: {
    strength: 4,
    intelligence: 2,
    piety: 3,
    vitality: 4,
    agility: 2,
    luck: 2
  },
  [CharacterClass.NINJA]: {
    strength: 3,
    intelligence: 3,
    piety: 2,
    vitality: 2,
    agility: 5,
    luck: 3
  }
}

export class LevelUpService {
  /**
   * Calculate XP required for a given level
   * Uses exponential growth: 1000 * level^1.5 * class multiplier
   */
  static getXPRequirement(level: number, characterClass: CharacterClass): number {
    const baseXP = 1000
    const multiplier = CLASS_XP_MULTIPLIERS[characterClass]
    return Math.floor(baseXP * Math.pow(level, 1.5) * multiplier)
  }

  /**
   * Check if character has enough XP to level up
   */
  static canLevelUp(character: Character): boolean {
    if (character.level >= MAX_LEVEL) {
      return false
    }

    const requiredXP = this.getXPRequirement(character.level + 1, character.class)
    return character.experience >= requiredXP
  }

  /**
   * Roll HP increase based on class hit die and VIT bonus
   * Returns 1-X where X is hit die + VIT bonus (minimum 1)
   */
  static rollHPIncrease(character: Character): number {
    const hitDie = CLASS_HIT_DICE[character.class]
    const roll = Math.floor(Math.random() * hitDie) + 1 // 1 to hitDie
    const vitBonus = this.getVitalityBonus(character.vitality)
    return Math.max(1, roll + vitBonus)
  }

  /**
   * Get VIT bonus for HP rolls
   * VIT 3-5 = -3, 6-7 = -2, 8-9 = -1, 10-11 = 0, 12-13 = +1, 14-15 = +2, 16-17 = +3, 18 = +4
   */
  private static getVitalityBonus(vitality: number): number {
    if (vitality <= 5) return -3
    if (vitality <= 7) return -2
    if (vitality <= 9) return -1
    if (vitality <= 11) return 0
    if (vitality <= 13) return 1
    if (vitality <= 15) return 2
    if (vitality <= 17) return 3
    return 4
  }

  /**
   * Roll for stat increases (chance-based)
   * Each stat has % chance to increase by 1
   */
  static rollStatIncreases(character: Character): StatIncreases {
    const chances = CLASS_STAT_CHANCES[character.class]
    const increases: StatIncreases = {}

    const stats: Array<keyof StatIncreases> = [
      'strength',
      'intelligence',
      'piety',
      'vitality',
      'agility',
      'luck'
    ]

    stats.forEach(stat => {
      const chance = chances[stat] || 0
      const roll = Math.random() * 100
      if (roll < chance) {
        increases[stat] = 1
      }
    })

    return increases
  }

  /**
   * Perform level up: increment level, roll HP, roll stats
   * Returns updated character and level up data for display
   */
  static performLevelUp(character: Character): LevelUpResult {
    const hpIncrease = this.rollHPIncrease(character)
    const statIncreases = this.rollStatIncreases(character)

    const updatedCharacter: Character = {
      ...character,
      level: character.level + 1,
      maxHp: character.maxHp + hpIncrease,
      hp: character.maxHp + hpIncrease, // Fully heal on level up
      strength: character.strength + (statIncreases.strength || 0),
      intelligence: character.intelligence + (statIncreases.intelligence || 0),
      piety: character.piety + (statIncreases.piety || 0),
      vitality: character.vitality + (statIncreases.vitality || 0),
      agility: character.agility + (statIncreases.agility || 0),
      luck: character.luck + (statIncreases.luck || 0)
    }

    const levelUpData: LevelUpData = {
      newLevel: character.level + 1,
      hpIncrease,
      statIncreases
    }

    return {
      updatedCharacter,
      levelUpData
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- LevelUpService`
Expected: All 13 tests PASS

**Step 5: Commit LevelUpService**

```bash
git add src/services/LevelUpService.ts src/services/__tests__/LevelUpService.spec.ts
git commit -m "feat(inn): add LevelUpService for character progression

- Calculate XP requirements by class (exponential growth)
- Check if character can level up
- Roll HP increase (class hit die + VIT bonus)
- Roll stat increases (chance-based by class)
- Perform level up with full state update
- 13 tests passing

Ref: docs/ui/scenes/06-adventurers-inn.md"
```

---

## Part 2: Spell Learning Service

### Task 17.2: Write Spell Learning Service Tests

**Files:**
- Create: `src/services/__tests__/SpellLearningService.spec.ts`

**Step 1: Write failing tests for spell learning**

```typescript
import { SpellLearningService } from '../SpellLearningService'
import { createTestCharacter } from '../../test-helpers/test-factories'
import { CharacterClass } from '../../types/CharacterClass'

describe('SpellLearningService', () => {
  describe('isCaster', () => {
    it('returns true for Mage', () => {
      const character = createTestCharacter({ class: CharacterClass.MAGE })
      expect(SpellLearningService.isCaster(character)).toBe(true)
    })

    it('returns true for Priest', () => {
      const character = createTestCharacter({ class: CharacterClass.PRIEST })
      expect(SpellLearningService.isCaster(character)).toBe(true)
    })

    it('returns true for Bishop', () => {
      const character = createTestCharacter({ class: CharacterClass.BISHOP })
      expect(SpellLearningService.isCaster(character)).toBe(true)
    })

    it('returns false for Fighter', () => {
      const character = createTestCharacter({ class: CharacterClass.FIGHTER })
      expect(SpellLearningService.isCaster(character)).toBe(false)
    })
  })

  describe('getAvailableSpellLevel', () => {
    it('returns spell level 1 at character level 1 for Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 1
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(1)
    })

    it('returns spell level 2 at character level 3 for Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 3
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(2)
    })

    it('returns spell level 7 (max) at character level 13 for Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 13
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(7)
    })

    it('returns 0 for non-caster', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 10
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(0)
    })
  })

  describe('learnNewSpells', () => {
    it('returns empty array for non-casters', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 5
      })

      const result = SpellLearningService.learnNewSpells(character, 4, 5)

      expect(result.newSpells).toEqual([])
      expect(result.updatedCharacter).toEqual(character)
    })

    it('learns new spell when reaching new spell level', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 2,
        knownSpells: []
      })

      // Level 2 → 3 unlocks spell level 2
      const result = SpellLearningService.learnNewSpells(character, 2, 3)

      expect(result.newSpells.length).toBeGreaterThan(0)
      expect(result.newSpells[0].level).toBe(2)
    })

    it('does not learn spells when not reaching new spell level', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 1,
        knownSpells: []
      })

      // Level 1 → 2 does not unlock new spell level (still level 1)
      const result = SpellLearningService.learnNewSpells(character, 1, 2)

      expect(result.newSpells).toEqual([])
    })

    it('adds learned spells to character', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 2,
        knownSpells: []
      })

      const result = SpellLearningService.learnNewSpells(character, 2, 3)

      expect(result.updatedCharacter.knownSpells.length).toBeGreaterThan(0)
      expect(result.updatedCharacter.knownSpells).toEqual(
        expect.arrayContaining(result.newSpells.map(s => s.id))
      )
    })

    it('does not duplicate already known spells', () => {
      const existingSpellId = 'MAKANITO' // Level 2 mage spell
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 2,
        knownSpells: [existingSpellId]
      })

      const result = SpellLearningService.learnNewSpells(character, 2, 3)

      // Count occurrences of existing spell
      const count = result.updatedCharacter.knownSpells.filter(id => id === existingSpellId).length
      expect(count).toBe(1)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- SpellLearningService`
Expected: All tests fail - "SpellLearningService is not defined"

**Step 3: Implement SpellLearningService**

**Files:**
- Create: `src/services/SpellLearningService.ts`

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- SpellLearningService`
Expected: All 9 tests PASS

**Step 5: Commit SpellLearningService**

```bash
git add src/services/SpellLearningService.ts src/services/__tests__/SpellLearningService.spec.ts
git commit -m "feat(inn): add SpellLearningService for caster progression

- Check if character class can cast spells
- Calculate available spell level by character level
- Learn new spells when unlocking spell level
- Support Mage, Priest, Bishop spell pools
- Random spell selection (1-2 per level unlock)
- 9 tests passing

Ref: docs/ui/scenes/06-adventurers-inn.md"
```

---

## Part 3: Inn Service

### Task 17.3: Write Inn Service Tests

**Files:**
- Create: `src/services/__tests__/InnService.spec.ts`

**Step 1: Write failing tests for inn service**

```typescript
import { InnService, RoomType } from '../InnService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('InnService', () => {
  describe('getRoomCost', () => {
    it('returns 0 for STABLES', () => {
      expect(InnService.getRoomCost(RoomType.STABLES)).toBe(0)
    })

    it('returns 10 for BARRACKS', () => {
      expect(InnService.getRoomCost(RoomType.BARRACKS)).toBe(10)
    })

    it('returns 50 for DOUBLE', () => {
      expect(InnService.getRoomCost(RoomType.DOUBLE)).toBe(50)
    })

    it('returns 200 for PRIVATE', () => {
      expect(InnService.getRoomCost(RoomType.PRIVATE)).toBe(200)
    })

    it('returns 500 for ROYAL_SUITE', () => {
      expect(InnService.getRoomCost(RoomType.ROYAL_SUITE)).toBe(500)
    })
  })

  describe('getRoomHealRate', () => {
    it('returns 0 HP/week for STABLES', () => {
      expect(InnService.getRoomHealRate(RoomType.STABLES)).toBe(0)
    })

    it('returns 1 HP/week for BARRACKS', () => {
      expect(InnService.getRoomHealRate(RoomType.BARRACKS)).toBe(1)
    })

    it('returns 3 HP/week for DOUBLE', () => {
      expect(InnService.getRoomHealRate(RoomType.DOUBLE)).toBe(3)
    })

    it('returns 7 HP/week for PRIVATE', () => {
      expect(InnService.getRoomHealRate(RoomType.PRIVATE)).toBe(7)
    })

    it('returns 10 HP/week for ROYAL_SUITE', () => {
      expect(InnService.getRoomHealRate(RoomType.ROYAL_SUITE)).toBe(10)
    })
  })

  describe('canAffordRoom', () => {
    it('returns true when character has enough gold', () => {
      const character = createTestCharacter({ gold: 100 })

      const result = InnService.canAffordRoom(character, RoomType.BARRACKS)

      expect(result.allowed).toBe(true)
    })

    it('returns false when character lacks gold', () => {
      const character = createTestCharacter({ gold: 5 })

      const result = InnService.canAffordRoom(character, RoomType.BARRACKS)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Not enough gold. Need 10, have 5.')
    })

    it('always allows STABLES (free)', () => {
      const character = createTestCharacter({ gold: 0 })

      const result = InnService.canAffordRoom(character, RoomType.STABLES)

      expect(result.allowed).toBe(true)
    })
  })

  describe('restOneWeek', () => {
    it('heals character by room heal rate', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.updatedCharacter.hp).toBe(11) // 10 + 1 (barracks)
    })

    it('does not exceed max HP', () => {
      const character = createTestCharacter({
        hp: 19,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.DOUBLE)

      expect(result.updatedCharacter.hp).toBe(20) // Capped at max HP
    })

    it('deducts room cost from gold', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.updatedCharacter.gold).toBe(90) // 100 - 10
    })

    it('returns isFullyHealed true when HP reaches max', () => {
      const character = createTestCharacter({
        hp: 19,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.isFullyHealed).toBe(true)
    })

    it('returns isFullyHealed false when HP not at max', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        gold: 100
      })

      const result = InnService.restOneWeek(character, RoomType.BARRACKS)

      expect(result.isFullyHealed).toBe(false)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- InnService`
Expected: All tests fail - "InnService is not defined"

**Step 3: Implement InnService**

**Files:**
- Create: `src/services/InnService.ts`

```typescript
import { Character } from '../types/Character'

export enum RoomType {
  STABLES = 'STABLES',
  BARRACKS = 'BARRACKS',
  DOUBLE = 'DOUBLE',
  PRIVATE = 'PRIVATE',
  ROYAL_SUITE = 'ROYAL_SUITE'
}

interface ValidationResult {
  allowed: boolean
  reason?: string
}

interface RestResult {
  updatedCharacter: Character
  isFullyHealed: boolean
  goldSpent: number
  hpRecovered: number
}

const ROOM_COSTS: Record<RoomType, number> = {
  [RoomType.STABLES]: 0,
  [RoomType.BARRACKS]: 10,
  [RoomType.DOUBLE]: 50,
  [RoomType.PRIVATE]: 200,
  [RoomType.ROYAL_SUITE]: 500
}

const ROOM_HEAL_RATES: Record<RoomType, number> = {
  [RoomType.STABLES]: 0,
  [RoomType.BARRACKS]: 1,
  [RoomType.DOUBLE]: 3,
  [RoomType.PRIVATE]: 7,
  [RoomType.ROYAL_SUITE]: 10
}

export class InnService {
  /**
   * Get cost per week for room type
   */
  static getRoomCost(roomType: RoomType): number {
    return ROOM_COSTS[roomType]
  }

  /**
   * Get HP healed per week for room type
   */
  static getRoomHealRate(roomType: RoomType): number {
    return ROOM_HEAL_RATES[roomType]
  }

  /**
   * Check if character can afford room
   */
  static canAffordRoom(character: Character, roomType: RoomType): ValidationResult {
    const cost = this.getRoomCost(roomType)

    if (cost === 0) {
      return { allowed: true }
    }

    const characterGold = character.gold || 0

    if (characterGold < cost) {
      return {
        allowed: false,
        reason: `Not enough gold. Need ${cost}, have ${characterGold}.`
      }
    }

    return { allowed: true }
  }

  /**
   * Rest character for one week
   * Heals HP, deducts gold, returns updated character
   */
  static restOneWeek(character: Character, roomType: RoomType): RestResult {
    const cost = this.getRoomCost(roomType)
    const healRate = this.getRoomHealRate(roomType)

    const newHp = Math.min(character.hp + healRate, character.maxHp)
    const newGold = (character.gold || 0) - cost

    const updatedCharacter: Character = {
      ...character,
      hp: newHp,
      gold: newGold
    }

    return {
      updatedCharacter,
      isFullyHealed: newHp === character.maxHp,
      goldSpent: cost,
      hpRecovered: newHp - character.hp
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- InnService`
Expected: All 13 tests PASS

**Step 5: Commit InnService**

```bash
git add src/services/InnService.ts src/services/__tests__/InnService.spec.ts
git commit -m "feat(inn): add InnService for room-based resting

- Define 5 room types with costs and heal rates
- Validate character can afford room
- Rest one week: heal HP, deduct gold
- Cap HP at max, return fully healed status
- 13 tests passing

Ref: docs/ui/scenes/06-adventurers-inn.md"
```

---

## Part 4: Inn Component Update

### Task 17.4: Update Inn Component with Room Selection

**Files:**
- Modify: `src/app/inn/inn.component.ts`
- Modify: `src/app/inn/inn.component.spec.ts`

**Step 1: Write failing tests for room selection**

Add to Inn component tests:

```typescript
describe('room selection and rest', () => {
  it('allows selecting character to rest', () => {
    const character = createTestCharacter({
      id: 'char-1',
      hp: 10,
      maxHp: 20,
      gold: 100
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]])
    }))

    component.selectCharacterToRest(character.id)

    expect(component.selectedCharacterId()).toBe(character.id)
    expect(component.currentView()).toBe('room-select')
  })

  it('rests character in BARRACKS for one week', async () => {
    const character = createTestCharacter({
      id: 'char-1',
      hp: 10,
      maxHp: 20,
      gold: 100
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]])
    }))
    component.selectCharacterToRest(character.id)

    await component.restInRoom(RoomType.BARRACKS)

    const updatedChar = gameStateService.state().roster.get('char-1')!
    expect(updatedChar.hp).toBe(11) // 10 + 1
    expect(updatedChar.gold).toBe(90) // 100 - 10
  })

  it('shows error when character cannot afford room', async () => {
    const character = createTestCharacter({
      id: 'char-1',
      hp: 10,
      maxHp: 20,
      gold: 5
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]])
    }))
    component.selectCharacterToRest(character.id)

    await component.restInRoom(RoomType.BARRACKS)

    expect(component.errorMessage()).toContain('Not enough gold')
  })

  it('triggers level up when HP reaches max and has XP', async () => {
    const character = createTestCharacter({
      id: 'char-1',
      hp: 19,
      maxHp: 20,
      gold: 100,
      level: 1,
      experience: 3000,
      class: CharacterClass.FIGHTER
    })
    gameStateService.updateState(state => ({
      ...state,
      roster: new Map([[character.id, character]])
    }))
    component.selectCharacterToRest(character.id)

    await component.restInRoom(RoomType.BARRACKS)

    expect(component.currentView()).toBe('level-up')
    expect(component.levelUpData()).toBeDefined()
    expect(component.levelUpData()!.newLevel).toBe(2)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- inn.component`
Expected: New tests fail - methods not implemented

**Step 3: Update Inn component implementation**

Update `src/app/inn/inn.component.ts`:

```typescript
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { InnService, RoomType } from '../../services/InnService';
import { LevelUpService } from '../../services/LevelUpService';
import { SpellLearningService } from '../../services/SpellLearningService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

type InnView = 'character-select' | 'room-select' | 'resting' | 'level-up';

interface LevelUpDisplayData {
  newLevel: number
  hpIncrease: number
  statIncreases: Record<string, number>
  newSpells: Array<{ id: string; name: string }>
}

/**
 * Inn Component (Adventurer's Inn)
 *
 * Character rest and level-up:
 * - Select character to rest
 * - Choose room type (cost/healing rate)
 * - Rest loop: heal HP, deduct gold
 * - Level up when HP = max and XP sufficient
 */
@Component({
  selector: 'app-inn',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './inn.component.html',
  styleUrls: ['./inn.component.scss']
})
export class InnComponent implements OnInit {
  // Expose RoomType enum to template
  readonly RoomType = RoomType;

  readonly roomMenuItems: MenuItem[] = [
    {
      id: RoomType.STABLES,
      label: 'STABLES (0 gp, 0 HP/week)',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: RoomType.BARRACKS,
      label: 'BARRACKS (10 gp, 1 HP/week)',
      enabled: true,
      shortcut: 'B'
    },
    {
      id: RoomType.DOUBLE,
      label: 'DOUBLE (50 gp, 3 HP/week)',
      enabled: true,
      shortcut: 'D'
    },
    {
      id: RoomType.PRIVATE,
      label: 'PRIVATE (200 gp, 7 HP/week)',
      enabled: true,
      shortcut: 'P'
    },
    {
      id: RoomType.ROYAL_SUITE,
      label: 'ROYAL SUITE (500 gp, 10 HP/week)',
      enabled: true,
      shortcut: 'R'
    }
  ];

  // View state
  readonly currentView = signal<InnView>('character-select');
  readonly selectedCharacterId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly levelUpData = signal<LevelUpDisplayData | null>(null);

  // Roster
  readonly allCharacters = computed(() => {
    const state = this.gameState.state();
    return Array.from(state.roster.values());
  });

  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId();
    if (!charId) return null;
    return this.gameState.state().roster.get(charId) || null;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.INN
    }));
  }

  selectCharacterToRest(charId: string): void {
    this.selectedCharacterId.set(charId);
    this.currentView.set('room-select');
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  async restInRoom(roomType: RoomType): Promise<void> {
    const character = this.selectedCharacter();
    if (!character) {
      this.errorMessage.set('No character selected');
      return;
    }

    // Check affordability
    const validation = InnService.canAffordRoom(character, roomType);
    if (!validation.allowed) {
      this.errorMessage.set(validation.reason || 'Cannot afford room');
      return;
    }

    // Rest one week
    const restResult = InnService.restOneWeek(character, roomType);

    // Update character in roster
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(character.id, restResult.updatedCharacter)
    }));

    // Check for level up if fully healed
    if (restResult.isFullyHealed) {
      const updatedChar = restResult.updatedCharacter;
      if (LevelUpService.canLevelUp(updatedChar)) {
        // Perform level up
        const levelUpResult = LevelUpService.performLevelUp(updatedChar);

        // Learn new spells if caster
        const spellResult = SpellLearningService.learnNewSpells(
          levelUpResult.updatedCharacter,
          updatedChar.level,
          levelUpResult.updatedCharacter.level
        );

        // Update character with level up and spells
        this.gameState.updateState(state => ({
          ...state,
          roster: new Map(state.roster).set(character.id, spellResult.updatedCharacter)
        }));

        // Show level up screen
        this.levelUpData.set({
          newLevel: levelUpResult.levelUpData.newLevel,
          hpIncrease: levelUpResult.levelUpData.hpIncrease,
          statIncreases: levelUpResult.levelUpData.statIncreases,
          newSpells: spellResult.newSpells.map(s => ({ id: s.id, name: s.name }))
        });
        this.currentView.set('level-up');
        return;
      }
    }

    // Show rest results if no level up
    this.successMessage.set(
      `Rested for 1 week. HP: ${character.hp} → ${restResult.updatedCharacter.hp} (+${restResult.hpRecovered})`
    );

    // Continue resting if not fully healed
    if (!restResult.isFullyHealed) {
      this.currentView.set('room-select');
    } else {
      this.successMessage.set('Fully healed!');
    }
  }

  continueLevelUp(): void {
    this.levelUpData.set(null);
    this.currentView.set('room-select');
    this.successMessage.set('Level up complete! Continue resting or return to castle.');
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }

  cancelView(): void {
    this.currentView.set('character-select');
    this.selectedCharacterId.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- inn.component`
Expected: All new tests PASS

**Step 5: Commit component update**

```bash
git add src/app/inn/inn.component.ts src/app/inn/inn.component.spec.ts
git commit -m "feat(inn): implement room selection and level-up flow

- Character selection for individual resting
- Room selection with 5 room types
- Rest one week: heal HP, deduct gold
- Level up trigger when HP = max and XP sufficient
- Spell learning for casters on level up
- Level up display with stat increases and new spells
- 4 new tests passing

Ref: docs/ui/scenes/06-adventurers-inn.md"
```

---

## Part 5: Inn Template & Styling

### Task 17.5: Update Inn Template

**Files:**
- Modify: `src/app/inn/inn.component.html`

**Step 1: Create comprehensive template**

Replace entire template with:

```html
<div class="inn">
  <header>
    <h1>ADVENTURER'S INN</h1>
  </header>

  <main>
    @if (currentView() === 'character-select') {
      <!-- Character Selection View -->
      <div class="character-select-view">
        <h2>SELECT CHARACTER TO REST</h2>
        <app-character-list
          [characters]="allCharacters()"
          [selectable]="true"
          (select)="selectCharacterToRest($event)"
        />

        <button class="cancel-btn" (click)="returnToCastle()">
          RETURN TO CASTLE
        </button>
      </div>
    }

    @if (currentView() === 'room-select') {
      <!-- Room Selection View -->
      <div class="room-select-view">
        @if (selectedCharacter(); as character) {
          <div class="character-info">
            <h2>{{ character.name }} ({{ character.class }} {{ character.level }})</h2>
            <div class="stats">
              <span>HP: {{ character.hp }}/{{ character.maxHp }}</span>
              <span>Gold: {{ character.gold }}</span>
            </div>
          </div>

          <h3>SELECT ROOM TYPE</h3>

          <div class="room-options">
            @for (room of roomMenuItems; track room.id) {
              <button
                class="room-option"
                (click)="restInRoom(room.id as any)"
              >
                <span class="room-label">{{ room.label }}</span>
              </button>
            }
          </div>

          @if (errorMessage()) {
            <div class="error-message">{{ errorMessage() }}</div>
          }
          @if (successMessage()) {
            <div class="success-message">{{ successMessage() }}</div>
          }

          <button class="cancel-btn" (click)="cancelView()">
            BACK
          </button>
        }
      </div>
    }

    @if (currentView() === 'level-up') {
      <!-- Level Up View -->
      <div class="level-up-view">
        @if (selectedCharacter(); as character) {
          @if (levelUpData(); as data) {
            <h2>LEVEL UP!</h2>

            <div class="level-up-content">
              <p class="level-up-message">
                {{ character.name }} has reached level {{ data.newLevel }}!
              </p>

              <div class="stat-changes">
                <div class="hp-increase">
                  HP: {{ character.maxHp - data.hpIncrease }} → {{ character.maxHp }}
                  (+{{ data.hpIncrease }})
                </div>

                @if (Object.keys(data.statIncreases).length > 0) {
                  <div class="stat-increases">
                    @for (stat of Object.keys(data.statIncreases); track stat) {
                      <div class="stat-increase">
                        {{ stat.toUpperCase() }}: +{{ data.statIncreases[stat] }}
                      </div>
                    }
                  </div>
                }

                @if (data.newSpells.length > 0) {
                  <div class="new-spells">
                    <h4>New Spells Learned:</h4>
                    <ul>
                      @for (spell of data.newSpells; track spell.id) {
                        <li>{{ spell.name }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>

              <button class="continue-btn" (click)="continueLevelUp()">
                CONTINUE
              </button>
            </div>
          }
        }
      </div>
    }
  </main>
</div>
```

**Step 2: Update SCSS styling**

**Files:**
- Modify: `src/app/inn/inn.component.scss`

Replace with:

```scss
@use '../../styles/variables' as *;

.inn {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $spacing-md;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
  }
}

.character-select-view,
.room-select-view,
.level-up-view {
  max-width: 600px;
  margin: 0 auto;

  h2, h3 {
    font-size: 18px;
    color: $color-text-bright;
    margin-bottom: $spacing-lg;
    text-align: center;
  }

  h3 {
    font-size: 16px;
    color: $color-text-green;
  }
}

.character-info {
  background-color: rgba($color-text-dim, 0.1);
  border: 1px solid $color-text-dim;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;

  h2 {
    margin: 0 0 $spacing-sm 0;
    text-align: left;
  }

  .stats {
    display: flex;
    gap: $spacing-lg;
    color: $color-text-dim;

    span {
      font-size: 14px;
    }
  }
}

.room-options {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;

  .room-option {
    background: none;
    border: 1px solid $color-text-dim;
    color: $color-text-bright;
    font-family: $font-mono;
    padding: $spacing-md;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;

    &:hover {
      border-color: $color-text-green;
      background-color: rgba($color-text-green, 0.1);
    }

    .room-label {
      font-size: 14px;
    }
  }
}

.level-up-view {
  h2 {
    color: $color-amber;
    font-size: 24px;
    margin-bottom: $spacing-xl;
  }

  .level-up-message {
    color: $color-text-bright;
    font-size: 16px;
    text-align: center;
    margin-bottom: $spacing-lg;
  }

  .stat-changes {
    background-color: rgba($color-text-green, 0.1);
    border: 1px solid $color-text-green;
    padding: $spacing-lg;
    margin-bottom: $spacing-xl;

    .hp-increase {
      color: $color-text-green;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: $spacing-md;
    }

    .stat-increases {
      margin-bottom: $spacing-md;

      .stat-increase {
        color: $color-text-bright;
        font-size: 14px;
        margin-bottom: $spacing-xs;
      }
    }

    .new-spells {
      h4 {
        color: $color-amber;
        font-size: 14px;
        margin-bottom: $spacing-sm;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          color: $color-text-bright;
          font-size: 14px;
          margin-bottom: $spacing-xs;
        }
      }
    }
  }

  .continue-btn {
    background: none;
    border: 1px solid $color-text-green;
    color: $color-text-green;
    font-family: $font-mono;
    padding: $spacing-sm $spacing-lg;
    cursor: pointer;
    display: block;
    margin: 0 auto;
    font-size: 16px;

    &:hover {
      background-color: rgba($color-text-green, 0.2);
    }
  }
}

.error-message {
  color: $color-red;
  background-color: rgba($color-red, 0.1);
  border: 1px solid $color-red;
  padding: $spacing-sm $spacing-md;
  margin: $spacing-md 0;
  text-align: center;
}

.success-message {
  color: $color-text-green;
  background-color: rgba($color-text-green, 0.1);
  border: 1px solid $color-text-green;
  padding: $spacing-sm $spacing-md;
  margin: $spacing-md 0;
  text-align: center;
}

.cancel-btn {
  background: none;
  border: 1px solid $color-text-dim;
  color: $color-text-dim;
  font-family: $font-mono;
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  display: block;
  margin: $spacing-lg auto 0;

  &:hover {
    border-color: $color-text-green;
    color: $color-text-green;
  }
}
```

**Step 3: Commit template and styling**

```bash
git add src/app/inn/inn.component.html src/app/inn/inn.component.scss
git commit -m "feat(inn): add room selection and level-up templates

- Character selection list view
- Room selection with cost/healing display
- Level up display with HP, stats, spells
- Character info panel with HP and gold
- Success/error message displays
- Responsive styling with color coding

Ref: docs/ui/scenes/06-adventurers-inn.md"
```

---

## Summary

### Total Tests Added
- **LevelUpService**: 13 tests
- **SpellLearningService**: 9 tests
- **InnService**: 13 tests
- **InnComponent**: 4 new tests
- **Total**: ~39 new tests

### Files Created
- ✅ `src/services/LevelUpService.ts`
- ✅ `src/services/__tests__/LevelUpService.spec.ts`
- ✅ `src/services/SpellLearningService.ts`
- ✅ `src/services/__tests__/SpellLearningService.spec.ts`
- ✅ `src/services/InnService.ts`
- ✅ `src/services/__tests__/InnService.spec.ts`

### Files Modified
- ✅ `src/app/inn/inn.component.ts`
- ✅ `src/app/inn/inn.component.spec.ts`
- ✅ `src/app/inn/inn.component.html`
- ✅ `src/app/inn/inn.component.scss`

### Features Implemented
1. ✅ XP requirement calculation (class-based)
2. ✅ HP increase rolls (hit die + VIT bonus)
3. ✅ Stat increase rolls (chance-based)
4. ✅ Spell learning (for Mage/Priest/Bishop)
5. ✅ 5 room types with cost/healing
6. ✅ Character rest loop
7. ✅ Level up trigger and display
8. ✅ Complete UI flow

### Next Steps
Proceed to Task 18 (Character Inspection) implementation.
