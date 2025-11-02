# Wizardry Data Type Refactor - Comprehensive Type System Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Character, Race, and Class types to match original Wizardry 1 mechanics, adding spell points, VIM tracking, complete equipment slots, and rich class metadata.

**Architecture:** Hybrid TypeScript Definitions approach - store runtime state in Character interface, rich metadata in TypeScript constant objects (RACE_DEFINITIONS, CLASS_DEFINITIONS), use helper types (MaxCurrent) for consistency.

**Tech Stack:** TypeScript 5.x, Angular 20.3.8, Jest, Immutable state patterns

---

## Prerequisites

**Before starting:**
- Review research in `docs/research/` for original Wizardry mechanics
- All existing tests should pass (528 tests)
- Working in main branch (breaking changes accepted, fresh start)

**Key Decisions Made:**
- ❌ Remove: password, gold (per-character), createdAt, lastModified
- ✅ Add: spell points (7 levels), VIM tracking, 3 equipment slots (shield, helmet, gauntlets)
- ✅ Race: Use base stats instead of modifiers
- ✅ Class: Add complete metadata (XP tables, equipment restrictions, hit dice)
- ✅ Breaking changes OK - will clear old saves

---

## Task 0: Create Helper Types

**Files:**
- Create: `src/types/MaxCurrent.ts`
- Create: `src/types/SpellPoints.ts`

**Step 1: Create MaxCurrent helper type**

Create `src/types/MaxCurrent.ts`:

```typescript
/**
 * Generic max/current pattern used for HP, VIM, and spell points
 */
export interface MaxCurrent {
  current: number
  max: number
}
```

**Step 2: Create spell point types**

Create `src/types/SpellPoints.ts`:

```typescript
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
```

**Step 3: Commit helper types**

```bash
git add src/types/MaxCurrent.ts src/types/SpellPoints.ts
git commit -m "feat(types): add MaxCurrent and SpellPoints helper types

- MaxCurrent: Generic max/current pattern for HP, VIM, spell points
- SpellPointPool: 7-level spell point structure
- CharacterSpellPoints: Optional mage/priest spell pools

Part of comprehensive data type refactor to match Wizardry 1."
```

---

## Task 1: Update Race Type with Base Stats

**Files:**
- Modify: `src/types/Race.ts`
- Test: `src/types/__tests__/Race.spec.ts` (create)

**Step 1: Write tests for Race definitions**

Create `src/types/__tests__/Race.spec.ts`:

```typescript
import { Race, RACE_DEFINITIONS, RaceDefinition } from '../Race'

describe('Race Type System', () => {
  describe('RACE_DEFINITIONS', () => {
    it('has definitions for all 5 races', () => {
      expect(RACE_DEFINITIONS[Race.HUMAN]).toBeDefined()
      expect(RACE_DEFINITIONS[Race.ELF]).toBeDefined()
      expect(RACE_DEFINITIONS[Race.DWARF]).toBeDefined()
      expect(RACE_DEFINITIONS[Race.GNOME]).toBeDefined()
      expect(RACE_DEFINITIONS[Race.HOBBIT]).toBeDefined()
    })

    it('Human has correct base stats', () => {
      const human = RACE_DEFINITIONS[Race.HUMAN]
      expect(human.baseStats.strength).toBe(8)
      expect(human.baseStats.intelligence).toBe(8)
      expect(human.baseStats.piety).toBe(5)
      expect(human.baseStats.vitality).toBe(8)
      expect(human.baseStats.agility).toBe(8)
      expect(human.baseStats.luck).toBe(9)
    })

    it('Elf has correct base stats and resistances', () => {
      const elf = RACE_DEFINITIONS[Race.ELF]
      expect(elf.baseStats.strength).toBe(7)
      expect(elf.baseStats.intelligence).toBe(10)
      expect(elf.baseStats.piety).toBe(10)
      expect(elf.baseStats.vitality).toBe(6)
      expect(elf.baseStats.agility).toBe(9)
      expect(elf.baseStats.luck).toBe(6)
      expect(elf.resistances?.magic).toBe(2)
    })

    it('Dwarf has poison resistance', () => {
      const dwarf = RACE_DEFINITIONS[Race.DWARF]
      expect(dwarf.resistances?.poison).toBe(2)
    })

    it('all base stats are in valid range (3-18)', () => {
      Object.values(RACE_DEFINITIONS).forEach(raceDef => {
        Object.values(raceDef.baseStats).forEach(stat => {
          expect(stat).toBeGreaterThanOrEqual(3)
          expect(stat).toBeLessThanOrEqual(18)
        })
      })
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- Race.spec.ts
```

Expected: FAIL (RACE_DEFINITIONS not defined yet)

**Step 3: Update Race.ts with base stats definitions**

Modify `src/types/Race.ts`:

```typescript
/**
 * All available races in Wizardry 1
 */
export enum Race {
  HUMAN = 'HUMAN',
  ELF = 'ELF',
  DWARF = 'DWARF',
  GNOME = 'GNOME',
  HOBBIT = 'HOBBIT'
}

/**
 * Base attribute stats for a race (before dice rolls)
 */
export interface RaceBaseStats {
  strength: number      // 3-18 range
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}

/**
 * Racial resistances (bonuses to saving throws)
 */
export interface RaceResistances {
  poison?: number       // Bonus to poison saves
  magic?: number        // Bonus to magic saves
  petrification?: number
  breath?: number
  spells?: number
}

/**
 * Complete race definition with base stats and resistances
 */
export interface RaceDefinition {
  name: Race
  baseStats: RaceBaseStats
  resistances?: RaceResistances
}

/**
 * Race definitions matching original Wizardry 1 mechanics
 * Base stats are the starting point - dice rolls add to these
 */
export const RACE_DEFINITIONS: Record<Race, RaceDefinition> = {
  [Race.HUMAN]: {
    name: Race.HUMAN,
    baseStats: {
      strength: 8,
      intelligence: 8,
      piety: 5,
      vitality: 8,
      agility: 8,
      luck: 9
    }
    // No special resistances
  },

  [Race.ELF]: {
    name: Race.ELF,
    baseStats: {
      strength: 7,
      intelligence: 10,
      piety: 10,
      vitality: 6,
      agility: 9,
      luck: 6
    },
    resistances: {
      magic: 2  // +2 vs magic
    }
  },

  [Race.DWARF]: {
    name: Race.DWARF,
    baseStats: {
      strength: 10,
      intelligence: 7,
      piety: 10,
      vitality: 10,
      agility: 5,
      luck: 6
    },
    resistances: {
      poison: 2  // +2 vs poison
    }
  },

  [Race.GNOME]: {
    name: Race.GNOME,
    baseStats: {
      strength: 7,
      intelligence: 7,
      piety: 10,
      vitality: 8,
      agility: 10,
      luck: 7
    },
    resistances: {
      magic: 1  // +1 vs magic
    }
  },

  [Race.HOBBIT]: {
    name: Race.HOBBIT,
    baseStats: {
      strength: 5,
      intelligence: 7,
      piety: 7,
      vitality: 6,
      agility: 10,
      luck: 15
    },
    resistances: {
      magic: 1,   // +1 vs magic
      poison: 1   // +1 vs poison
    }
  }
}

// DEPRECATED: Remove old RACE_MODIFIERS (will be deleted in next task)
// Migration: Use RACE_DEFINITIONS.baseStats instead
```

**Step 4: Run test to verify it passes**

```bash
npm test -- Race.spec.ts
```

Expected: PASS (all 5 tests passing)

**Step 5: Commit race definitions**

```bash
git add src/types/Race.ts src/types/__tests__/Race.spec.ts
git commit -m "feat(types): add RACE_DEFINITIONS with base stats and resistances

- RaceDefinition interface with baseStats and resistances
- RACE_DEFINITIONS constant with all 5 races
- Base stats match original Wizardry 1 research
- Resistances: Elf/Gnome +magic, Dwarf +poison, Hobbit +both
- Tests verify all stats in valid range (3-18)

Replaces incorrect RACE_MODIFIERS approach. Base stats are starting
point for character creation (dice rolls add to these values).

Part of comprehensive data type refactor."
```

---

## Task 2: Update Character Type

**Files:**
- Modify: `src/types/Character.ts`
- Test: `src/types/__tests__/Character.spec.ts` (create)

**Step 1: Write test for Character interface**

Create `src/types/__tests__/Character.spec.ts`:

```typescript
import { Character } from '../Character'
import { Race } from '../Race'
import { CharacterClass } from '../CharacterClass'
import { Alignment } from '../Alignment'
import { CharacterStatus } from '../CharacterStatus'

describe('Character Type', () => {
  it('can create a minimal fighter character', () => {
    const fighter: Character = {
      id: 'test-1',
      name: 'Corak',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      strength: 15,
      intelligence: 10,
      piety: 8,
      vitality: 14,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 10,
      maxHp: 10,
      ac: 10,
      status: CharacterStatus.OK,
      vim: { current: 14, max: 14 },
      knownSpells: [],
      inventory: []
    }

    expect(fighter.name).toBe('Corak')
    expect(fighter.spellPoints).toBeUndefined()
  })

  it('can create a mage with spell points', () => {
    const mage: Character = {
      id: 'test-2',
      name: 'Gandalf',
      race: Race.HUMAN,
      class: CharacterClass.MAGE,
      alignment: Alignment.GOOD,
      strength: 8,
      intelligence: 17,
      piety: 10,
      vitality: 6,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 4,
      maxHp: 4,
      ac: 10,
      status: CharacterStatus.OK,
      vim: { current: 6, max: 6 },
      spellPoints: {
        mage: {
          level1: { current: 2, max: 2 },
          level2: { current: 0, max: 0 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      },
      knownSpells: [],
      inventory: []
    }

    expect(mage.spellPoints?.mage?.level1.max).toBe(2)
  })

  it('can create a bishop with both spell types', () => {
    const bishop: Character = {
      id: 'test-3',
      name: 'Archbishop',
      race: Race.HUMAN,
      class: CharacterClass.BISHOP,
      alignment: Alignment.GOOD,
      strength: 10,
      intelligence: 16,
      piety: 16,
      vitality: 10,
      agility: 10,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 6,
      maxHp: 6,
      ac: 10,
      status: CharacterStatus.OK,
      vim: { current: 10, max: 10 },
      spellPoints: {
        mage: {
          level1: { current: 1, max: 1 },
          level2: { current: 0, max: 0 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        },
        priest: {
          level1: { current: 1, max: 1 },
          level2: { current: 0, max: 0 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      },
      knownSpells: [],
      inventory: []
    }

    expect(bishop.spellPoints?.mage).toBeDefined()
    expect(bishop.spellPoints?.priest).toBeDefined()
  })

  it('can equip all 5 equipment slots', () => {
    const character: Character = {
      id: 'test-4',
      name: 'Knight',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 15,
      hp: 10,
      maxHp: 10,
      ac: 5,
      status: CharacterStatus.OK,
      vim: { current: 14, max: 14 },
      knownSpells: [],
      inventory: [],
      equippedWeapon: 'long-sword',
      equippedArmor: 'plate-mail',
      equippedShield: 'large-shield',
      equippedHelmet: 'helm',
      equippedGauntlets: 'copper-gloves'
    }

    expect(character.equippedWeapon).toBe('long-sword')
    expect(character.equippedShield).toBe('large-shield')
    expect(character.equippedHelmet).toBe('helm')
    expect(character.equippedGauntlets).toBe('copper-gloves')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- Character.spec.ts
```

Expected: FAIL (Character interface doesn't have new fields yet)

**Step 3: Update Character interface**

Modify `src/types/Character.ts`:

```typescript
import { Race } from './Race'
import { CharacterClass } from './CharacterClass'
import { Alignment } from './Alignment'
import { CharacterStatus } from './CharacterStatus'
import { MaxCurrent } from './MaxCurrent'
import { CharacterSpellPoints } from './SpellPoints'

/**
 * Complete character data structure matching original Wizardry 1
 */
export interface Character {
  // Identity
  id: string
  name: string

  // Core Classification
  race: Race
  class: CharacterClass
  alignment: Alignment

  // Attributes (final values after racial base stats applied)
  strength: number      // 3-18+ range
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number

  // Progression
  level: number         // 1-13+
  experience: number    // XP total
  age: number           // Starting 14-16, increases with inn rests

  // Combat Stats
  hp: number            // Current hit points
  maxHp: number         // Maximum hit points
  ac: number            // Armor class (lower is better, D&D style)

  // Status & Vitality
  status: CharacterStatus  // OK, DEAD, ASHES, etc. (single status at a time)
  vim: MaxCurrent          // Vitality for resurrection (degrades with rests/deaths)

  // Spell System (for caster classes only)
  spellPoints?: CharacterSpellPoints  // Optional: 7 levels per spell type
  knownSpells: string[]                // Spell IDs learned by this character

  // Equipment (5 slots total)
  equippedWeapon?: string      // Weapon slot (item ID)
  equippedArmor?: string       // Armor slot (item ID)
  equippedShield?: string      // Shield slot (item ID)
  equippedHelmet?: string      // Helmet slot (item ID)
  equippedGauntlets?: string   // Gauntlet slot (item ID)

  // Inventory
  inventory: string[]  // Item IDs (max 8 items)
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- Character.spec.ts
```

Expected: PASS (all 4 tests passing)

**Step 5: Commit Character interface**

```bash
git add src/types/Character.ts src/types/__tests__/Character.spec.ts
git commit -m "refactor(types): update Character interface for Wizardry 1 accuracy

BREAKING CHANGE: Character interface significantly changed

Removed:
- password (relying on confirmation dialogs)
- gold (moved to party-level only)
- createdAt, lastModified (removing metadata)

Added:
- age: number (for level-up stat calculations)
- vim: MaxCurrent (resurrection vitality tracking)
- spellPoints: CharacterSpellPoints (7 levels per spell type)
- equippedShield, equippedHelmet, equippedGauntlets (3 new slots)

Changed:
- Attributes are final values (no separate base stats)
- 5 equipment slots total (was 2)

Tests verify fighter (no spells), mage (mage spells), bishop (both),
and full equipment setup.

Part of comprehensive data type refactor."
```

---

## Task 3: Update CharacterClass Type with Complete Metadata

**Files:**
- Modify: `src/types/CharacterClass.ts`
- Test: `src/types/__tests__/CharacterClass.spec.ts` (create)

**Step 1: Write tests for Class definitions**

Create `src/types/__tests__/CharacterClass.spec.ts`:

```typescript
import { CharacterClass, CLASS_DEFINITIONS, ClassDefinition } from '../CharacterClass'
import { Alignment } from '../Alignment'

describe('CharacterClass Type System', () => {
  describe('CLASS_DEFINITIONS', () => {
    it('has definitions for all 8 classes', () => {
      expect(CLASS_DEFINITIONS[CharacterClass.FIGHTER]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.MAGE]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.PRIEST]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.THIEF]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.BISHOP]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.SAMURAI]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.LORD]).toBeDefined()
      expect(CLASS_DEFINITIONS[CharacterClass.NINJA]).toBeDefined()
    })

    it('Fighter has correct metadata', () => {
      const fighter = CLASS_DEFINITIONS[CharacterClass.FIGHTER]
      expect(fighter.requirements.strength).toBe(11)
      expect(fighter.hitDie).toBe('1d10')
      expect(fighter.allowedWeapons).toEqual(['ALL'])
      expect(fighter.canUseShields).toBe(true)
      expect(fighter.canUseHelmets).toBe(true)
      expect(fighter.spellTypes).toBeUndefined()
    })

    it('Mage has spell access and equipment restrictions', () => {
      const mage = CLASS_DEFINITIONS[CharacterClass.MAGE]
      expect(mage.requirements.intelligence).toBe(11)
      expect(mage.hitDie).toBe('1d4')
      expect(mage.spellTypes).toEqual(['MAGE'])
      expect(mage.maxSpellLevel).toBe(7)
      expect(mage.allowedWeapons).toEqual(['DAGGER', 'STAFF'])
      expect(mage.allowedArmor).toEqual(['NONE'])
      expect(mage.canUseShields).toBe(false)
      expect(mage.canUseHelmets).toBe(false)
    })

    it('Priest cannot be Neutral', () => {
      const priest = CLASS_DEFINITIONS[CharacterClass.PRIEST]
      expect(priest.allowedAlignments).toEqual([Alignment.GOOD, Alignment.EVIL])
      expect(priest.spellTypes).toEqual(['PRIEST'])
      expect(priest.canUseHelmets).toBe(false)  // Priests can't wear helmets
    })

    it('Bishop has both spell types', () => {
      const bishop = CLASS_DEFINITIONS[CharacterClass.BISHOP]
      expect(bishop.spellTypes).toEqual(['MAGE', 'PRIEST'])
      expect(bishop.maxSpellLevel).toBe(7)
      expect(bishop.requirements.intelligence).toBe(12)
      expect(bishop.requirements.piety).toBe(12)
    })

    it('Samurai is capped at level 6 spells', () => {
      const samurai = CLASS_DEFINITIONS[CharacterClass.SAMURAI]
      expect(samurai.spellTypes).toEqual(['MAGE'])
      expect(samurai.maxSpellLevel).toBe(6)  // Not 7!
      expect(samurai.allowedAlignments).toEqual([Alignment.GOOD, Alignment.NEUTRAL])
    })

    it('Lord is capped at level 6 spells and Good only', () => {
      const lord = CLASS_DEFINITIONS[CharacterClass.LORD]
      expect(lord.spellTypes).toEqual(['PRIEST'])
      expect(lord.maxSpellLevel).toBe(6)  // Not 7!
      expect(lord.allowedAlignments).toEqual([Alignment.GOOD])
    })

    it('Ninja is Evil only with high stat requirements', () => {
      const ninja = CLASS_DEFINITIONS[CharacterClass.NINJA]
      expect(ninja.allowedAlignments).toEqual([Alignment.EVIL])
      expect(ninja.requirements.strength).toBe(17)
      expect(ninja.requirements.intelligence).toBe(17)
      expect(ninja.requirements.piety).toBe(17)
      expect(ninja.requirements.vitality).toBe(17)
      expect(ninja.requirements.agility).toBe(17)
      expect(ninja.requirements.luck).toBe(17)
      expect(ninja.allowedArmor).toEqual(['NONE'])  // Best unarmored
    })

    it('all classes have XP tables with 11 entries (levels 2-13)', () => {
      Object.values(CLASS_DEFINITIONS).forEach(classDef => {
        expect(classDef.xpTable).toHaveLength(11)
        // Verify increasing XP requirements
        for (let i = 1; i < classDef.xpTable.length; i++) {
          expect(classDef.xpTable[i]).toBeGreaterThan(classDef.xpTable[i - 1])
        }
      })
    })

    it('attacks per round formula works correctly', () => {
      const fighter = CLASS_DEFINITIONS[CharacterClass.FIGHTER]
      expect(fighter.attacksPerRoundFormula(1)).toBe(1)
      expect(fighter.attacksPerRoundFormula(5)).toBe(2)
      expect(fighter.attacksPerRoundFormula(10)).toBe(3)

      const mage = CLASS_DEFINITIONS[CharacterClass.MAGE]
      expect(mage.attacksPerRoundFormula(1)).toBe(1)
      expect(mage.attacksPerRoundFormula(10)).toBe(1)  // Always 1

      const ninja = CLASS_DEFINITIONS[CharacterClass.NINJA]
      expect(ninja.attacksPerRoundFormula(1)).toBe(1)
      expect(ninja.attacksPerRoundFormula(3)).toBe(2)
      expect(ninja.attacksPerRoundFormula(6)).toBe(3)  // Faster progression
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- CharacterClass.spec.ts
```

Expected: FAIL (CLASS_DEFINITIONS not defined yet)

**Step 3: Update CharacterClass.ts with complete definitions**

Modify `src/types/CharacterClass.ts`:

```typescript
import { Alignment } from './Alignment'

/**
 * All available character classes in Wizardry 1
 */
export enum CharacterClass {
  FIGHTER = 'FIGHTER',
  MAGE = 'MAGE',
  PRIEST = 'PRIEST',
  THIEF = 'THIEF',
  BISHOP = 'BISHOP',
  SAMURAI = 'SAMURAI',
  LORD = 'LORD',
  NINJA = 'NINJA'
}

/**
 * Stat requirements for a character class
 */
export interface ClassRequirements {
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
}

/**
 * Complete class definition with all progression metadata
 */
export interface ClassDefinition {
  name: CharacterClass

  // Requirements
  requirements: ClassRequirements
  allowedAlignments?: Alignment[]  // If omitted, all alignments allowed

  // Progression
  hitDie: string       // "1d10", "1d4", etc. for HP gain per level
  xpTable: number[]    // XP required for levels 2-13 (index 0 = level 2)

  // Spell Access (for casters)
  spellTypes?: ('MAGE' | 'PRIEST')[]
  maxSpellLevel?: number  // Max spell level 1-7 (Samurai/Lord capped at 6)

  // Equipment Restrictions
  allowedWeapons: string[]   // "ALL" or specific types
  allowedArmor: string[]     // "ALL", "NONE", or specific types
  canUseShields: boolean
  canUseHelmets: boolean

  // Combat
  attacksPerRoundFormula: (level: number) => number
}

/**
 * Class definitions matching original Wizardry 1 mechanics
 */
export const CLASS_DEFINITIONS: Record<CharacterClass, ClassDefinition> = {
  [CharacterClass.FIGHTER]: {
    name: CharacterClass.FIGHTER,
    requirements: { strength: 11 },
    hitDie: '1d10',
    xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000],
    allowedWeapons: ['ALL'],
    allowedArmor: ['ALL'],
    canUseShields: true,
    canUseHelmets: true,
    attacksPerRoundFormula: (level) => Math.floor(level / 5) + 1
  },

  [CharacterClass.MAGE]: {
    name: CharacterClass.MAGE,
    requirements: { intelligence: 11 },
    hitDie: '1d4',
    xpTable: [2500, 5000, 10000, 20000, 40000, 60000, 90000, 125000, 175000, 250000, 400000],
    spellTypes: ['MAGE'],
    maxSpellLevel: 7,
    allowedWeapons: ['DAGGER', 'STAFF'],
    allowedArmor: ['NONE'],
    canUseShields: false,
    canUseHelmets: false,
    attacksPerRoundFormula: () => 1
  },

  [CharacterClass.PRIEST]: {
    name: CharacterClass.PRIEST,
    requirements: { piety: 11 },
    allowedAlignments: [Alignment.GOOD, Alignment.EVIL],  // Not Neutral
    hitDie: '1d8',
    xpTable: [1750, 3500, 7000, 14000, 28000, 55000, 110000, 225000, 450000, 675000, 900000],
    spellTypes: ['PRIEST'],
    maxSpellLevel: 7,
    allowedWeapons: ['MACE', 'FLAIL', 'STAFF', 'HAMMER'],  // Blunt only
    allowedArmor: ['ALL'],
    canUseShields: true,
    canUseHelmets: false,  // Original restriction
    attacksPerRoundFormula: (level) => Math.floor(level / 5) + 1
  },

  [CharacterClass.THIEF]: {
    name: CharacterClass.THIEF,
    requirements: { agility: 11 },
    allowedAlignments: [Alignment.NEUTRAL, Alignment.EVIL],  // Not Good
    hitDie: '1d6',
    xpTable: [1250, 2500, 5000, 10000, 20000, 40000, 75000, 150000, 300000, 600000, 900000],
    allowedWeapons: ['DAGGER', 'SHORT_SWORD'],
    allowedArmor: ['LEATHER'],
    canUseShields: false,
    canUseHelmets: true,
    attacksPerRoundFormula: (level) => Math.floor(level / 5) + 1
  },

  [CharacterClass.BISHOP]: {
    name: CharacterClass.BISHOP,
    requirements: { intelligence: 12, piety: 12 },
    hitDie: '1d6',
    xpTable: [3000, 6000, 12000, 24000, 48000, 96000, 190000, 380000, 760000, 1140000, 1520000],
    spellTypes: ['MAGE', 'PRIEST'],
    maxSpellLevel: 7,
    allowedWeapons: ['MACE', 'FLAIL', 'STAFF'],
    allowedArmor: ['ALL'],
    canUseShields: true,
    canUseHelmets: false,
    attacksPerRoundFormula: () => 1
  },

  [CharacterClass.SAMURAI]: {
    name: CharacterClass.SAMURAI,
    requirements: { strength: 15, intelligence: 11, piety: 10, vitality: 14, agility: 10 },
    allowedAlignments: [Alignment.GOOD, Alignment.NEUTRAL],  // Not Evil
    hitDie: '1d10',
    xpTable: [3500, 7000, 14000, 28000, 56000, 112000, 224000, 450000, 900000, 1350000, 1800000],
    spellTypes: ['MAGE'],
    maxSpellLevel: 6,  // Capped at level 6 spells (not 7!)
    allowedWeapons: ['ALL'],
    allowedArmor: ['ALL'],
    canUseShields: true,
    canUseHelmets: true,
    attacksPerRoundFormula: (level) => Math.floor(level / 5) + 1
  },

  [CharacterClass.LORD]: {
    name: CharacterClass.LORD,
    requirements: { strength: 15, intelligence: 12, piety: 12, vitality: 15, agility: 14, luck: 15 },
    allowedAlignments: [Alignment.GOOD],  // Good only
    hitDie: '1d10',
    xpTable: [3750, 7500, 15000, 30000, 60000, 120000, 240000, 480000, 960000, 1440000, 1920000],
    spellTypes: ['PRIEST'],
    maxSpellLevel: 6,  // Capped at level 6 spells (not 7!)
    allowedWeapons: ['ALL'],
    allowedArmor: ['ALL'],
    canUseShields: true,
    canUseHelmets: true,
    attacksPerRoundFormula: (level) => Math.floor(level / 5) + 1
  },

  [CharacterClass.NINJA]: {
    name: CharacterClass.NINJA,
    requirements: { strength: 17, intelligence: 17, piety: 17, vitality: 17, agility: 17, luck: 17 },
    allowedAlignments: [Alignment.EVIL],  // Evil only
    hitDie: '1d8',
    xpTable: [4000, 8000, 16000, 32000, 64000, 128000, 256000, 500000, 1000000, 1500000, 2000000],
    allowedWeapons: ['ALL'],
    allowedArmor: ['NONE'],  // Best unarmored (gets AC bonus from class)
    canUseShields: false,
    canUseHelmets: false,
    attacksPerRoundFormula: (level) => Math.floor(level / 3) + 1  // Faster progression
  }
}

// Keep old CLASS_REQUIREMENTS for backward compatibility (will migrate services)
export const CLASS_REQUIREMENTS: Record<CharacterClass, ClassRequirements> = {
  [CharacterClass.FIGHTER]: CLASS_DEFINITIONS[CharacterClass.FIGHTER].requirements,
  [CharacterClass.MAGE]: CLASS_DEFINITIONS[CharacterClass.MAGE].requirements,
  [CharacterClass.PRIEST]: CLASS_DEFINITIONS[CharacterClass.PRIEST].requirements,
  [CharacterClass.THIEF]: CLASS_DEFINITIONS[CharacterClass.THIEF].requirements,
  [CharacterClass.BISHOP]: CLASS_DEFINITIONS[CharacterClass.BISHOP].requirements,
  [CharacterClass.SAMURAI]: CLASS_DEFINITIONS[CharacterClass.SAMURAI].requirements,
  [CharacterClass.LORD]: CLASS_DEFINITIONS[CharacterClass.LORD].requirements,
  [CharacterClass.NINJA]: CLASS_DEFINITIONS[CharacterClass.NINJA].requirements
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- CharacterClass.spec.ts
```

Expected: PASS (all 10 tests passing)

**Step 5: Commit class definitions**

```bash
git add src/types/CharacterClass.ts src/types/__tests__/CharacterClass.spec.ts
git commit -m "feat(types): add CLASS_DEFINITIONS with complete metadata

- ClassDefinition interface with all progression rules
- CLASS_DEFINITIONS constant with all 8 classes
- Hit dice, XP tables (levels 2-13), equipment restrictions
- Spell access (types and max level, Samurai/Lord capped at 6)
- Alignment restrictions (Priest, Thief, Samurai, Lord, Ninja)
- Attacks per round formulas (Ninja has faster progression)
- Equipment rules (Mage/Ninja no armor, Priest no helmets, etc.)

Tests verify all 8 classes, XP table integrity, attacks formulas,
alignment restrictions, and spell access.

Keeps CLASS_REQUIREMENTS for backward compatibility during migration.

Part of comprehensive data type refactor."
```

---

## Task 4: Update CharacterCreationService for Base Stats

**Files:**
- Modify: `src/services/CharacterCreationService.ts`
- Test: `src/services/__tests__/CharacterCreationService.spec.ts`

**Step 1: Update existing tests to expect base stats behavior**

Modify `src/services/__tests__/CharacterCreationService.spec.ts`:

Find the test about stat calculation and update it:

```typescript
import { RACE_DEFINITIONS } from '../../types/Race'

describe('CharacterCreationService', () => {
  // ... existing tests ...

  describe('stat calculation', () => {
    it('applies racial base stats correctly', () => {
      // Human with all 10s rolled should have Human base + 10
      const human = CharacterCreationService.createCharacter({
        name: 'Human Test',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        rolledStats: {
          strength: 10,
          intelligence: 10,
          piety: 10,
          vitality: 10,
          agility: 10,
          luck: 10,
          bonusPoints: 0
        }
      })

      // Human base: STR 8, INT 8, PIE 5, VIT 8, AGI 8, LUC 9
      expect(human.strength).toBe(18)     // 8 + 10
      expect(human.intelligence).toBe(18) // 8 + 10
      expect(human.piety).toBe(15)        // 5 + 10
      expect(human.vitality).toBe(18)     // 8 + 10
      expect(human.agility).toBe(18)      // 8 + 10
      expect(human.luck).toBe(19)         // 9 + 10
    })

    it('applies elf base stats correctly', () => {
      const elf = CharacterCreationService.createCharacter({
        name: 'Elf Test',
        race: Race.ELF,
        class: CharacterClass.MAGE,
        alignment: Alignment.GOOD,
        rolledStats: {
          strength: 5,
          intelligence: 5,
          piety: 5,
          vitality: 5,
          agility: 5,
          luck: 5,
          bonusPoints: 0
        }
      })

      // Elf base: STR 7, INT 10, PIE 10, VIT 6, AGI 9, LUC 6
      expect(elf.strength).toBe(12)       // 7 + 5
      expect(elf.intelligence).toBe(15)   // 10 + 5
      expect(elf.piety).toBe(15)          // 10 + 5
      expect(elf.vitality).toBe(11)       // 6 + 5
      expect(elf.agility).toBe(14)        // 9 + 5
      expect(elf.luck).toBe(11)           // 6 + 5
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- CharacterCreationService.spec.ts
```

Expected: FAIL (still using old RACE_MODIFIERS approach)

**Step 3: Update CharacterCreationService implementation**

Modify `src/services/CharacterCreationService.ts`:

Find the stat calculation logic and replace with:

```typescript
import { RACE_DEFINITIONS } from '../types/Race'

export const CharacterCreationService = {
  createCharacter(params: CreateCharacterParams): Character {
    const raceDef = RACE_DEFINITIONS[params.race]

    // Calculate final stats: racial base + rolled amount + bonus points
    const strength = raceDef.baseStats.strength + params.rolledStats.strength + (params.bonusPoints?.strength ?? 0)
    const intelligence = raceDef.baseStats.intelligence + params.rolledStats.intelligence + (params.bonusPoints?.intelligence ?? 0)
    const piety = raceDef.baseStats.piety + params.rolledStats.piety + (params.bonusPoints?.piety ?? 0)
    const vitality = raceDef.baseStats.vitality + params.rolledStats.vitality + (params.bonusPoints?.vitality ?? 0)
    const agility = raceDef.baseStats.agility + params.rolledStats.agility + (params.bonusPoints?.agility ?? 0)
    const luck = raceDef.baseStats.luck + params.rolledStats.luck + (params.bonusPoints?.luck ?? 0)

    // Initialize VIM to vitality stat
    const vim = { current: vitality, max: vitality }

    // Initialize spell points for casters
    const spellPoints = initializeSpellPoints(params.class, intelligence, piety)

    return {
      id: generateId(),
      name: params.name,
      race: params.race,
      class: params.class,
      alignment: params.alignment,
      strength,
      intelligence,
      piety,
      vitality,
      agility,
      luck,
      level: 1,
      experience: 0,
      age: rollAge(),  // 14-16
      hp: rollHP(params.class),
      maxHp: rollHP(params.class),
      ac: 10,  // Base AC, equipment will modify
      status: CharacterStatus.OK,
      vim,
      spellPoints,
      knownSpells: [],
      inventory: []
    }
  }
}

function initializeSpellPoints(
  charClass: CharacterClass,
  intelligence: number,
  piety: number
): CharacterSpellPoints | undefined {
  const classDef = CLASS_DEFINITIONS[charClass]

  if (!classDef.spellTypes) {
    return undefined
  }

  const result: CharacterSpellPoints = {}

  if (classDef.spellTypes.includes('MAGE')) {
    const magePoints = calculateSpellPointsForStat(intelligence, 1)
    result.mage = {
      level1: { current: magePoints, max: magePoints },
      level2: { current: 0, max: 0 },
      level3: { current: 0, max: 0 },
      level4: { current: 0, max: 0 },
      level5: { current: 0, max: 0 },
      level6: { current: 0, max: 0 },
      level7: { current: 0, max: 0 }
    }
  }

  if (classDef.spellTypes.includes('PRIEST')) {
    const priestPoints = calculateSpellPointsForStat(piety, 1)
    result.priest = {
      level1: { current: priestPoints, max: priestPoints },
      level2: { current: 0, max: 0 },
      level3: { current: 0, max: 0 },
      level4: { current: 0, max: 0 },
      level5: { current: 0, max: 0 },
      level6: { current: 0, max: 0 },
      level7: { current: 0, max: 0 }
    }
  }

  return result
}

// Formula: (stat - 10) / 6, clamped to 0-9
function calculateSpellPointsForStat(stat: number, spellLevel: number): number {
  const base = Math.floor((stat - 10) / 6)
  return Math.max(0, Math.min(9, base))
}

function rollAge(): number {
  return 14 + Math.floor(Math.random() * 3)  // 14-16
}

function rollHP(charClass: CharacterClass): number {
  const classDef = CLASS_DEFINITIONS[charClass]
  const dieMatch = classDef.hitDie.match(/1d(\d+)/)
  if (!dieMatch) return 4  // Fallback

  const dieSize = parseInt(dieMatch[1])
  return 1 + Math.floor(Math.random() * dieSize)
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- CharacterCreationService.spec.ts
```

Expected: PASS

**Step 5: Commit CharacterCreationService update**

```bash
git add src/services/CharacterCreationService.ts src/services/__tests__/CharacterCreationService.spec.ts
git commit -m "refactor(services): use RACE_DEFINITIONS base stats in character creation

- Replace RACE_MODIFIERS with RACE_DEFINITIONS.baseStats
- Formula: final stat = racial base + rolled amount + bonus points
- Initialize VIM to vitality stat
- Initialize spell points for casters (level 1 only at creation)
- Initialize age to 14-16 random
- Use CLASS_DEFINITIONS.hitDie for HP roll

Tests verify Human and Elf base stat calculations.

Part of comprehensive data type refactor."
```

---

## Task 5: Update SaveService Schema Version

**Files:**
- Modify: `src/services/SaveService.ts`

**Step 1: Update schema version and add migration**

Modify `src/services/SaveService.ts`:

```typescript
// Increment schema version
const SAVE_SCHEMA_VERSION = 2  // Was 1

export const SaveService = {
  async load(slotId: number): Promise<GameState | null> {
    try {
      const db = await openDatabase()
      const save = await db.get('saves', slotId)

      if (!save) return null

      // Check schema version
      if (save.schemaVersion !== SAVE_SCHEMA_VERSION) {
        console.warn(`Save schema mismatch: found v${save.schemaVersion}, expected v${SAVE_SCHEMA_VERSION}`)
        console.warn('Clearing incompatible save data...')

        // Clear this save
        await db.delete('saves', slotId)

        return null
      }

      return save.state
    } catch (error) {
      console.error('Failed to load save:', error)
      return null
    }
  },

  async save(slotId: number, state: GameState): Promise<void> {
    try {
      const db = await openDatabase()

      const saveData = {
        id: slotId,
        schemaVersion: SAVE_SCHEMA_VERSION,
        state,
        timestamp: Date.now(),
        metadata: {
          partyLevel: calculatePartyLevel(state),
          location: state.currentScene,
          gold: state.party.gold
        }
      }

      await db.put('saves', saveData)
    } catch (error) {
      console.error('Failed to save game:', error)
      throw error
    }
  },

  async clearAll(): Promise<void> {
    try {
      const db = await openDatabase()
      const allKeys = await db.getAllKeys('saves')

      for (const key of allKeys) {
        await db.delete('saves', key)
      }

      console.log('All save data cleared')
    } catch (error) {
      console.error('Failed to clear saves:', error)
      throw error
    }
  }
}

function calculatePartyLevel(state: GameState): number {
  if (state.party.members.length === 0) return 0

  const levels = state.party.members.map(id => state.roster.get(id)?.level ?? 0)
  return Math.max(...levels)
}
```

**Step 2: Commit schema version update**

```bash
git add src/services/SaveService.ts
git commit -m "feat(services): increment save schema version to v2

BREAKING CHANGE: Save data format changed, old saves incompatible

- Increment SAVE_SCHEMA_VERSION to 2
- Auto-clear incompatible saves on load
- Add clearAll() method for manual cleanup
- Log warnings when schema mismatch detected

Old saves will be automatically deleted on load attempt.
Users will see empty save slots and can create fresh saves.

Part of comprehensive data type refactor."
```

---

## Task 6: Update Test Factories

**Files:**
- Modify: `src/test-helpers/character-factories.ts`

**Step 1: Update character factory**

Modify `src/test-helpers/character-factories.ts`:

```typescript
import { Character } from '../types/Character'
import { Race } from '../types/Race'
import { CharacterClass } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'

export function createTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-char-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Character',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality: 14,
    agility: 12,
    luck: 10,
    level: 1,
    experience: 0,
    age: 15,
    hp: 10,
    maxHp: 10,
    ac: 10,
    status: CharacterStatus.OK,
    vim: { current: 14, max: 14 },
    knownSpells: [],
    inventory: [],
    ...overrides
  }
}

export function createTestMage(overrides: Partial<Character> = {}): Character {
  return createTestCharacter({
    name: 'Test Mage',
    class: CharacterClass.MAGE,
    strength: 8,
    intelligence: 17,
    piety: 10,
    vitality: 6,
    hp: 4,
    maxHp: 4,
    vim: { current: 6, max: 6 },
    spellPoints: {
      mage: {
        level1: { current: 2, max: 2 },
        level2: { current: 0, max: 0 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
    },
    ...overrides
  })
}

export function createTestBishop(overrides: Partial<Character> = {}): Character {
  return createTestCharacter({
    name: 'Test Bishop',
    class: CharacterClass.BISHOP,
    intelligence: 16,
    piety: 16,
    hp: 6,
    maxHp: 6,
    vim: { current: 10, max: 10 },
    spellPoints: {
      mage: {
        level1: { current: 1, max: 1 },
        level2: { current: 0, max: 0 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      },
      priest: {
        level1: { current: 1, max: 1 },
        level2: { current: 0, max: 0 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
    },
    ...overrides
  })
}
```

**Step 2: Commit test factory updates**

```bash
git add src/test-helpers/character-factories.ts
git commit -m "refactor(tests): update character factories for new Character type

- Remove password, gold, createdAt, lastModified
- Add age (default 15)
- Add vim ({ current, max })
- Add spellPoints for mage and bishop factories
- Update test character defaults

All test factories now create valid characters matching new schema.

Part of comprehensive data type refactor."
```

---

## Task 7: Run Full Test Suite and Fix Failures

**Step 1: Run all tests**

```bash
npm test
```

Expected: Many failures due to type changes

**Step 2: Fix common test failures**

Common issues to fix:
- Tests expecting `password` field
- Tests expecting `gold` on character (should use party.gold)
- Tests expecting `createdAt`/`lastModified`
- Tests not providing `vim` field
- Tests not providing `age` field

Go through each failing test file and update:

```typescript
// OLD
const char: Character = {
  // ... fields ...
  password: 'test123',
  gold: 100,
  createdAt: Date.now(),
  lastModified: Date.now()
}

// NEW
const char: Character = {
  // ... fields ...
  age: 15,
  vim: { current: 10, max: 10 }
}
```

**Step 3: Run tests again**

```bash
npm test
```

Expected: All tests passing (528+ tests)

**Step 4: Commit test fixes**

```bash
git add -A
git commit -m "test: fix all tests for new Character type schema

- Remove password, gold, createdAt, lastModified from test data
- Add age (15) and vim ({ current, max }) to all character test objects
- Update component tests that referenced removed fields
- Update service tests for new type structure

All 528+ tests now passing with new schema.

Part of comprehensive data type refactor."
```

---

## Task 8: Update Component Tests

**Files:**
- Modify: `src/app/character-creation/character-creation.component.spec.ts`
- Modify: `src/app/training-grounds/__tests__/training-grounds.component.spec.ts`
- Modify: `src/components/character-card/__tests__/character-card.component.spec.ts`

**Step 1: Update character-creation component tests**

Modify tests to not expect password field or character gold.

**Step 2: Update training-grounds tests**

Remove any tests about password validation or character gold.

**Step 3: Update character-card tests**

Ensure tests work with new equipment slots.

**Step 4: Run component tests**

```bash
npm test -- --testPathPattern="character-creation|training-grounds|character-card"
```

Expected: All component tests passing

**Step 5: Commit component test updates**

```bash
git add src/app src/components
git commit -m "test: update component tests for Character type changes

- Character creation: Remove password and gold tests
- Training grounds: Update for new character structure
- Character card: Verify works with new equipment slots

All component tests passing.

Part of comprehensive data type refactor."
```

---

## Task 9: Update Documentation

**Files:**
- Modify: `docs/game-design/02-character-creation.md`
- Modify: `docs/systems/character-system.md`
- Create: `docs/implementation/data-type-refactor-summary.md`

**Step 1: Create refactor summary document**

Create `docs/implementation/data-type-refactor-summary.md`:

```markdown
# Data Type Refactor Summary

**Date:** 2025-02-11
**Status:** Complete
**Breaking Changes:** Yes (save schema v1 → v2)

## Overview

Comprehensive refactor of Character, Race, and CharacterClass types to accurately match original Wizardry 1 (1981) mechanics.

## Changes Made

### Character Type

**Removed:**
- `password: string` - Simplified character management
- `gold: number` - Moved to party-level only
- `createdAt: number` - Removed metadata
- `lastModified: number` - Removed metadata

**Added:**
- `age: number` - For level-up stat calculations
- `vim: MaxCurrent` - Resurrection vitality tracking
- `spellPoints?: CharacterSpellPoints` - 7 levels per spell type
- `equippedShield?: string` - Third equipment slot
- `equippedHelmet?: string` - Fourth equipment slot
- `equippedGauntlets?: string` - Fifth equipment slot

**Total Equipment Slots:** 5 (was 2)

### Race Type

**Changed:**
- `RACE_MODIFIERS` → `RACE_DEFINITIONS`
- Modifiers (deltas) → Base stats (absolute values)
- Added racial resistances (poison, magic, etc.)

**Example:**
```typescript
// OLD
RACE_MODIFIERS[Race.ELF] = { strength: -1, intelligence: +1, ... }

// NEW
RACE_DEFINITIONS[Race.ELF] = {
  baseStats: { strength: 7, intelligence: 10, ... },
  resistances: { magic: 2 }
}
```

### CharacterClass Type

**Added:**
- `CLASS_DEFINITIONS` - Complete class metadata
- Hit dice (1d4, 1d6, 1d8, 1d10)
- XP tables for levels 2-13 (11 entries per class)
- Equipment restrictions (allowed weapons/armor)
- Spell access (types and max level)
- Attacks per round formulas

### Helper Types

**Created:**
- `MaxCurrent` - Generic { current, max } pattern
- `SpellPointPool` - 7-level spell point structure
- `CharacterSpellPoints` - Optional mage/priest pools

## Migration

**Save Data:**
- Schema version incremented: v1 → v2
- Old saves automatically cleared on load
- No migration path (breaking change accepted)

**Services Updated:**
- CharacterCreationService - Uses RACE_DEFINITIONS.baseStats
- SaveService - Checks schema version, clears incompatible saves

## Testing

**Test Coverage:**
- 528+ tests updated and passing
- New tests for RACE_DEFINITIONS, CLASS_DEFINITIONS
- All component tests updated for new schema
- Test factories updated (character-factories.ts)

## Files Changed

**Types (7 files):**
- `src/types/Character.ts` - Complete rewrite
- `src/types/Race.ts` - Added RACE_DEFINITIONS
- `src/types/CharacterClass.ts` - Added CLASS_DEFINITIONS
- `src/types/MaxCurrent.ts` - New
- `src/types/SpellPoints.ts` - New
- `src/types/__tests__/Race.spec.ts` - New
- `src/types/__tests__/CharacterClass.spec.ts` - New

**Services (2 files):**
- `src/services/CharacterCreationService.ts` - Use base stats
- `src/services/SaveService.ts` - Schema v2

**Tests (46 files):**
- All test files updated for new Character structure
- Test factories updated

## Impact

**User-Facing:**
- ✅ Old saves cleared (intentional - fresh start)
- ✅ Character creation uses correct Wizardry mechanics
- ✅ 5 equipment slots available
- ✅ Spell points tracked correctly

**Developer-Facing:**
- ✅ Type safety improved (rich metadata in types)
- ✅ Better autocomplete (IDE shows all class properties)
- ✅ Matches original game design docs
- ✅ Foundation for Phase 7 (combat/spells)

## Next Steps

**Immediate:**
- None - refactor complete

**Future (Phase 7):**
- Implement spell casting (use spell points)
- Implement combat (use CLASS_DEFINITIONS formulas)
- Implement equipment restrictions (use allowedWeapons/allowedArmor)
- Implement racial resistances (use RACE_DEFINITIONS.resistances)
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: document data type refactor summary

- Created data-type-refactor-summary.md
- Documents all changes, migration, impact
- Lists all 55 files changed
- Provides context for future development

Part of comprehensive data type refactor."
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full test suite one final time**

```bash
npm test
```

Expected: All 528+ tests passing, 0 failures

**Step 2: Verify app builds**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 3: Manual verification checklist**

Start the dev server and verify:
- [ ] Can create a new character
- [ ] Character creation shows correct stats
- [ ] Training grounds displays characters correctly
- [ ] No console errors

```bash
npm start
```

**Step 4: Clean up old code (optional)**

Search for and remove any references to:
- `RACE_MODIFIERS` (replaced by RACE_DEFINITIONS)
- `character.password`
- `character.gold` (should be party.gold)
- `character.createdAt`
- `character.lastModified`

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after data type refactor

- Remove old RACE_MODIFIERS references
- Verify all tests passing (528+ tests)
- Verify build succeeds
- Manual testing complete

Data type refactor complete. Ready for Phase 7 (combat/spells)."
```

---

## Success Criteria

**All criteria must be met:**

- ✅ All 528+ tests passing
- ✅ npm run build succeeds with no errors
- ✅ Character creation works in UI
- ✅ RACE_DEFINITIONS has correct base stats (verified against research)
- ✅ CLASS_DEFINITIONS has complete metadata
- ✅ Character interface has spell points, VIM, 5 equipment slots
- ✅ SaveService schema v2 clears old saves
- ✅ Test factories updated
- ✅ Documentation complete

## Rollback Plan

If major issues arise:

```bash
# Revert all commits from this refactor
git log --oneline  # Find commit before Task 0
git reset --hard <commit-before-refactor>

# Force push if needed (only on feature branch!)
git push --force origin main
```

---

## Next Phase

After this refactor is complete, the codebase will be ready for:

**Phase 7: Dungeon Navigation and Combat**
- Spell casting (uses spell points)
- Combat system (uses CLASS_DEFINITIONS formulas)
- Equipment restrictions (uses allowedWeapons/allowedArmor)
- Racial resistances (uses RACE_DEFINITIONS.resistances)
- Level-up (uses XP tables, hit dice, VIM degradation)

All type foundations are now in place.
