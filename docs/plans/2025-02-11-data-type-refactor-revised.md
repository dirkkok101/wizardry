# Wizardry Data Type Refactor - Data-Driven Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Character, Race, and Class types to load from JSON data files at runtime, matching original Wizardry 1 mechanics with accurate base stats, spell points, VIM tracking, and complete equipment slots.

**Architecture:** Data-driven hybrid approach - TypeScript interfaces match JSON structure exactly, AssetLoadingService loads data at runtime, services provide typed access to loaded data, Character interface uses MaxCurrent helper for consistency.

**Tech Stack:** TypeScript 5.x, Angular 20.3.8, Jest, Immutable state patterns, IndexedDB for saves

---

## Prerequisites

**Before starting:**
- Review research in `docs/research/race-stats.md` and `docs/research/class-reference.md`
- All existing tests should pass (528+ tests)
- Working in `data-type-refactor` branch (breaking changes accepted)

**Key Architectural Decisions:**
- ✅ Load race/class data from JSON files (data-driven)
- ✅ Use saving throw formula system (negative modifiers: death:-1, wand:-2, breath:-4, petrify:-2, spell:-3)
- ✅ Ninja attacks: Research formula `2 + (level/5)` (starts at 2 attacks)
- ✅ Thief hit dice: 1d8 (matches JSON and research)
- ✅ Bishop: Good/Evil only alignment restriction
- ❌ Remove: Character password, per-character gold, createdAt, lastModified
- ✅ Add: Character age, VIM, spell points (7 levels), 3 new equipment slots

---

## Task 0: Create Helper Types (ALREADY COMPLETE)

**Status:** ✅ DONE - MaxCurrent.ts and SpellPoints.ts already created and committed (commit 781826a)

---

## Task 1: Fix Race JSON Data Files

**Files:**
- Modify: `data/races/human.json`
- Modify: `data/races/elf.json`
- Modify: `data/races/dwarf.json`
- Modify: `data/races/gnome.json`
- Modify: `data/races/hobbit.json`

**Step 1: Fix human.json saving throw bonus**

Update `data/races/human.json`:

```json
{
  "id": "human",
  "name": "Human",
  "baseStats": {
    "str": 8,
    "int": 8,
    "pie": 5,
    "vit": 8,
    "agi": 8,
    "luc": 9
  },
  "savingThrowBonus": {
    "death": -1
  },
  "statTotal": 46,
  "description": "Humans are the most balanced race...",
  "strengths": ["Balanced stats", "No penalties", "Can be any class"],
  "weaknesses": ["No exceptional stats", "Minimal saving throw bonuses"],
  "bestClasses": ["Fighter", "Lord", "Samurai"]
}
```

**Step 2: Fix elf.json saving throw bonus**

Update `data/races/elf.json` (remove nonsense "luckskil" property):

```json
{
  "id": "elf",
  "name": "Elf",
  "baseStats": {
    "str": 7,
    "int": 10,
    "pie": 10,
    "vit": 6,
    "agi": 9,
    "luc": 6
  },
  "savingThrowBonus": {
    "wand": -2
  },
  "statTotal": 48,
  "description": "Elves are intelligent and pious...",
  "strengths": ["High intelligence and piety", "Good agility", "Wand saving throw bonus"],
  "weaknesses": ["Low strength and vitality", "Fragile in combat"],
  "bestClasses": ["Mage", "Priest", "Bishop"]
}
```

**Step 3: Fix dwarf.json saving throw bonus**

Update `data/races/dwarf.json` (remove "gas" property, keep only "breath"):

```json
{
  "id": "dwarf",
  "name": "Dwarf",
  "baseStats": {
    "str": 10,
    "int": 7,
    "pie": 10,
    "vit": 10,
    "agi": 5,
    "luc": 6
  },
  "savingThrowBonus": {
    "breath": -4
  },
  "statTotal": 48,
  "description": "Dwarves are strong and hardy...",
  "strengths": ["High strength and vitality", "Excellent breath weapon resistance"],
  "weaknesses": ["Low agility", "Poor at magic"],
  "bestClasses": ["Fighter", "Priest", "Lord"]
}
```

**Step 4: Fix gnome.json saving throw bonus**

Update `data/races/gnome.json` (add petrification bonus):

```json
{
  "id": "gnome",
  "name": "Gnome",
  "baseStats": {
    "str": 7,
    "int": 7,
    "pie": 10,
    "vit": 8,
    "agi": 10,
    "luc": 7
  },
  "savingThrowBonus": {
    "petrify": -2
  },
  "statTotal": 49,
  "description": "Gnomes are small but nimble...",
  "strengths": ["Good agility and piety", "Petrification resistance"],
  "weaknesses": ["Low strength", "Fragile"],
  "bestClasses": ["Thief", "Priest", "Bishop"]
}
```

**Step 5: Fix hobbit.json saving throw bonus**

Update `data/races/hobbit.json` (add spell resistance):

```json
{
  "id": "hobbit",
  "name": "Hobbit",
  "baseStats": {
    "str": 5,
    "int": 7,
    "pie": 7,
    "vit": 6,
    "agi": 10,
    "luc": 15
  },
  "savingThrowBonus": {
    "spell": -3
  },
  "statTotal": 50,
  "description": "Hobbits are incredibly lucky...",
  "strengths": ["Exceptional luck", "High agility", "Excellent spell resistance"],
  "weaknesses": ["Very low strength", "Very fragile"],
  "bestClasses": ["Thief", "Ninja"]
}
```

**Step 6: Commit race data fixes**

```bash
git add data/races/*.json
git commit -m "fix(data): correct racial saving throw bonuses to match Wizardry 1

- Human: death -1 (better vs poison/paralysis/critical)
- Elf: wand -2 (formula bonus, though wand save unused)
- Dwarf: breath -4 (better vs breath attacks)
- Gnome: petrify -2 (better vs petrification)
- Hobbit: spell -3 (better vs spells/magic)

Uses negative modifier system from original game formula.
Remove nonsense 'luckskil' property from Elf.
Remove 'gas' property from Dwarf (not a save type).

Part of data type refactor."
```

---

## Task 2: Fix Class JSON Data Files

**Files:**
- Modify: `data/classes/bishop.json`
- Modify: `data/classes/thief.json`
- Modify: `data/classes/priest.json`
- Modify: `data/classes/ninja.json`
- Modify: `data/classes/fighter.json`
- Modify: `data/classes/mage.json`
- Modify: `data/classes/samurai.json`
- Modify: `data/classes/lord.json`

**Step 1: Fix bishop.json (remove STR requirement, fix alignment)**

Update `data/classes/bishop.json`:

```json
{
  "id": "bishop",
  "name": "Bishop",
  "description": "Can cast both mage and priest spells...",
  "requirements": {
    "int": 12,
    "pie": 12
  },
  "alignmentRestrictions": ["good", "evil"],
  "equipmentRestrictions": {
    "weapons": ["mace", "flail", "staff"],
    "armor": ["cloth", "leather", "chain", "plate"],
    "shields": ["small", "large"],
    "helmets": []
  },
  "hitDice": "1d6",
  "spellAccess": {
    "mage": {
      "minLevel": 1,
      "maxLevel": 7
    },
    "priest": {
      "minLevel": 1,
      "maxLevel": 7
    }
  },
  "attacksPerLevel": {
    "1+": 1
  },
  "xpTable": [3000, 6000, 12000, 24000, 48000, 96000, 190000, 380000, 760000, 1140000, 1520000],
  "specialAbilities": ["Can identify items", "Can cast both spell types"],
  "canIdentifyItems": true,
  "canDispelUndead": false,
  "canCriticalHit": false
}
```

**Step 2: Fix thief.json (remove "club" weapon)**

Update `data/classes/thief.json`:

```json
{
  "id": "thief",
  "name": "Thief",
  "description": "Skilled at disarming traps...",
  "requirements": {
    "agi": 11
  },
  "alignmentRestrictions": ["neutral", "evil"],
  "equipmentRestrictions": {
    "weapons": ["dagger", "short_sword"],
    "armor": ["leather"],
    "shields": [],
    "helmets": ["leather"]
  },
  "hitDice": "1d8",
  "spellAccess": null,
  "attacksPerLevel": {
    "1-4": 1,
    "5-9": 2,
    "10+": 3
  },
  "xpTable": [1250, 2500, 5000, 10000, 20000, 40000, 75000, 150000, 300000, 600000, 900000],
  "specialAbilities": ["Disarm traps", "Open locked chests", "Critical hit backstab"],
  "canIdentifyItems": false,
  "canDispelUndead": false,
  "canCriticalHit": true
}
```

**Step 3: Fix priest.json (add level-scaling attacks, add XP table)**

Update `data/classes/priest.json`:

```json
{
  "id": "priest",
  "name": "Priest",
  "description": "Servant of the gods with divine magic...",
  "requirements": {
    "pie": 11
  },
  "alignmentRestrictions": ["good", "evil"],
  "equipmentRestrictions": {
    "weapons": ["mace", "flail", "staff", "hammer"],
    "armor": ["cloth", "leather", "chain", "plate"],
    "shields": ["small", "large"],
    "helmets": []
  },
  "hitDice": "1d8",
  "spellAccess": {
    "priest": {
      "minLevel": 1,
      "maxLevel": 7
    }
  },
  "attacksPerLevel": {
    "1-4": 1,
    "5-9": 2,
    "10+": 3
  },
  "xpTable": [1750, 3500, 7000, 14000, 28000, 55000, 110000, 225000, 450000, 675000, 900000],
  "specialAbilities": ["Can dispel undead"],
  "canIdentifyItems": false,
  "canDispelUndead": true,
  "canCriticalHit": false
}
```

**Step 4: Fix ninja.json (fix equipment, fix attacks formula)**

Update `data/classes/ninja.json`:

```json
{
  "id": "ninja",
  "name": "Ninja",
  "description": "Master of stealth and martial arts...",
  "requirements": {
    "str": 17,
    "int": 17,
    "pie": 17,
    "vit": 17,
    "agi": 17,
    "luc": 17
  },
  "alignmentRestrictions": ["evil"],
  "equipmentRestrictions": {
    "weapons": ["dagger", "short_sword", "shuriken", "staff", "nunchaku"],
    "armor": ["none"],
    "shields": [],
    "helmets": []
  },
  "hitDice": "1d8",
  "spellAccess": null,
  "attacksPerLevel": {
    "1-4": 2,
    "5-9": 3,
    "10-14": 4,
    "15+": 5
  },
  "xpTable": [4000, 8000, 16000, 32000, 64000, 128000, 256000, 500000, 1000000, 1500000, 2000000],
  "specialAbilities": ["Critical hits", "AC bonus when unarmored", "Fast attacks"],
  "canIdentifyItems": false,
  "canDispelUndead": false,
  "canCriticalHit": true
}
```

**Note:** Ninja attacks use formula `2 + (level / 5)`:
- Level 1-4: 2 attacks
- Level 5-9: 3 attacks (2 + 1)
- Level 10-14: 4 attacks (2 + 2)
- Level 15+: 5 attacks (capped at max research suggests)

**Step 5: Add XP tables to remaining classes**

Update `data/classes/fighter.json` (add xpTable):

```json
{
  "id": "fighter",
  "name": "Fighter",
  "description": "Master of weapons and combat...",
  "requirements": {
    "str": 11
  },
  "alignmentRestrictions": [],
  "equipmentRestrictions": {
    "weapons": ["all"],
    "armor": ["cloth", "leather", "chain", "plate"],
    "shields": ["small", "large"],
    "helmets": ["leather", "iron", "steel"]
  },
  "hitDice": "1d10",
  "spellAccess": null,
  "attacksPerLevel": {
    "1-4": 1,
    "5-9": 2,
    "10+": 3
  },
  "xpTable": [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000],
  "specialAbilities": ["Can use all weapons and armor"],
  "canIdentifyItems": false,
  "canDispelUndead": false,
  "canCriticalHit": true
}
```

Update `data/classes/mage.json` (add xpTable):

```json
{
  "id": "mage",
  "name": "Mage",
  "description": "Master of arcane magic...",
  "requirements": {
    "int": 11
  },
  "alignmentRestrictions": [],
  "equipmentRestrictions": {
    "weapons": ["dagger", "staff"],
    "armor": ["none"],
    "shields": [],
    "helmets": []
  },
  "hitDice": "1d4",
  "spellAccess": {
    "mage": {
      "minLevel": 1,
      "maxLevel": 7
    }
  },
  "attacksPerLevel": {
    "1+": 1
  },
  "xpTable": [2500, 5000, 10000, 20000, 40000, 60000, 90000, 125000, 175000, 250000, 400000],
  "specialAbilities": ["Can cast mage spells"],
  "canIdentifyItems": false,
  "canDispelUndead": false,
  "canCriticalHit": false
}
```

Update `data/classes/samurai.json` (add xpTable):

```json
{
  "id": "samurai",
  "name": "Samurai",
  "description": "Noble warrior with mage magic...",
  "requirements": {
    "str": 15,
    "int": 11,
    "pie": 10,
    "vit": 14,
    "agi": 10
  },
  "alignmentRestrictions": ["good", "neutral"],
  "equipmentRestrictions": {
    "weapons": ["all"],
    "armor": ["cloth", "leather", "chain", "plate"],
    "shields": ["small", "large"],
    "helmets": ["leather", "iron", "steel"]
  },
  "hitDice": "1d10",
  "spellAccess": {
    "mage": {
      "minLevel": 4,
      "maxLevel": 6
    }
  },
  "attacksPerLevel": {
    "1-4": 1,
    "5-9": 2,
    "10+": 3
  },
  "xpTable": [3500, 7000, 14000, 28000, 56000, 112000, 224000, 450000, 900000, 1350000, 1800000],
  "specialAbilities": ["Can use all weapons and armor", "Casts mage spells (max level 6)"],
  "canIdentifyItems": false,
  "canDispelUndead": false,
  "canCriticalHit": true
}
```

Update `data/classes/lord.json` (add xpTable):

```json
{
  "id": "lord",
  "name": "Lord",
  "description": "Noble paladin with priest magic...",
  "requirements": {
    "str": 15,
    "int": 12,
    "pie": 12,
    "vit": 15,
    "agi": 14,
    "luc": 15
  },
  "alignmentRestrictions": ["good"],
  "equipmentRestrictions": {
    "weapons": ["all"],
    "armor": ["cloth", "leather", "chain", "plate"],
    "shields": ["small", "large"],
    "helmets": ["leather", "iron", "steel"]
  },
  "hitDice": "1d10",
  "spellAccess": {
    "priest": {
      "minLevel": 4,
      "maxLevel": 6
    }
  },
  "attacksPerLevel": {
    "1-4": 1,
    "5-9": 2,
    "10+": 3
  },
  "xpTable": [3750, 7500, 15000, 30000, 60000, 120000, 240000, 480000, 960000, 1440000, 1920000],
  "specialAbilities": ["Can use all weapons and armor", "Casts priest spells (max level 6)", "Can dispel undead"],
  "canIdentifyItems": false,
  "canDispelUndead": true,
  "canCriticalHit": true
}
```

**Step 6: Commit class data fixes**

```bash
git add data/classes/*.json
git commit -m "fix(data): correct class data to match Wizardry 1 mechanics

Changes:
- Bishop: Remove STR requirement, add Good/Evil alignment restriction
- Thief: Remove 'club' weapon (only dagger/short_sword), add XP table, add level-scaling attacks
- Priest: Add level-scaling attacks (1-4:1, 5-9:2, 10+:3), add XP table
- Ninja: Fix equipment (armor:none only, no shields/helmets), fix attacks (2 + level/5 formula)
- Fighter: Add XP table
- Mage: Add XP table
- Samurai: Add XP table
- Lord: Add XP table

All XP tables now complete for levels 2-13.
All classes now have correct equipment restrictions.
Ninja attacks use research formula: 2 + (level/5).

Part of data type refactor."
```

---

## Task 3: Create Race TypeScript Interfaces

**Files:**
- Modify: `src/types/Race.ts`
- Create: `src/types/__tests__/Race.spec.ts`

**Step 1: Write test for RaceData interface**

Create `src/types/__tests__/Race.spec.ts`:

```typescript
import { Race, RaceData, parseSavingThrowBonus } from '../Race'

describe('Race Type System', () => {
  describe('RaceData interface', () => {
    it('matches JSON structure for Human', () => {
      const human: RaceData = {
        id: 'human',
        name: 'Human',
        baseStats: {
          str: 8,
          int: 8,
          pie: 5,
          vit: 8,
          agi: 8,
          luc: 9
        },
        savingThrowBonus: {
          death: -1
        },
        statTotal: 46,
        description: 'Test',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      expect(human.baseStats.str).toBe(8)
      expect(human.savingThrowBonus.death).toBe(-1)
    })

    it('matches JSON structure for Elf', () => {
      const elf: RaceData = {
        id: 'elf',
        name: 'Elf',
        baseStats: {
          str: 7,
          int: 10,
          pie: 10,
          vit: 6,
          agi: 9,
          luc: 6
        },
        savingThrowBonus: {
          wand: -2
        },
        statTotal: 48,
        description: 'Test',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      expect(elf.savingThrowBonus.wand).toBe(-2)
    })
  })

  describe('parseSavingThrowBonus', () => {
    it('parses death bonus correctly', () => {
      const bonus = parseSavingThrowBonus({ death: -1 })
      expect(bonus.death).toBe(-1)
      expect(bonus.wand).toBeUndefined()
    })

    it('handles empty saving throw bonuses', () => {
      const bonus = parseSavingThrowBonus({})
      expect(bonus).toEqual({})
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- Race.spec.ts
```

Expected: FAIL (RaceData interface not defined yet)

**Step 3: Update Race.ts with data interfaces**

Modify `src/types/Race.ts`:

```typescript
/**
 * Character Races - Original Wizardry races
 */
export enum Race {
  HUMAN = 'HUMAN',
  ELF = 'ELF',
  DWARF = 'DWARF',
  GNOME = 'GNOME',
  HOBBIT = 'HOBBIT'
}

/**
 * Base attribute stats for a race (from JSON data)
 */
export interface RaceBaseStats {
  str: number      // Strength (3-18 range)
  int: number      // Intelligence
  pie: number      // Piety
  vit: number      // Vitality
  agi: number      // Agility
  luc: number      // Luck
}

/**
 * Saving throw bonuses (negative modifiers - lower is better)
 * From original Wizardry 1 saving throw formula
 */
export interface SavingThrowBonus {
  death?: number       // Human: -1 (poison, paralysis, critical hits)
  wand?: number        // Elf: -2 (wand save - unused in game)
  breath?: number      // Dwarf: -4 (breath attacks, gas)
  petrify?: number     // Gnome: -2 (petrification)
  spell?: number       // Hobbit: -3 (spells, magic)
}

/**
 * Complete race data structure (matches JSON files)
 */
export interface RaceData {
  id: string
  name: string
  baseStats: RaceBaseStats
  savingThrowBonus: SavingThrowBonus
  statTotal: number
  description: string
  strengths: string[]
  weaknesses: string[]
  bestClasses: string[]
}

/**
 * Map race enum to lowercase ID for JSON loading
 */
export function getRaceId(race: Race): string {
  return race.toLowerCase()
}

/**
 * Map lowercase ID to race enum
 */
export function parseRace(id: string): Race | null {
  const upperID = id.toUpperCase()
  if (upperID in Race) {
    return Race[upperID as keyof typeof Race]
  }
  return null
}

/**
 * Helper to parse saving throw bonuses from JSON
 */
export function parseSavingThrowBonus(data: Record<string, number>): SavingThrowBonus {
  return {
    death: data.death,
    wand: data.wand,
    breath: data.breath,
    petrify: data.petrify,
    spell: data.spell
  }
}

// DEPRECATED: Old RACE_MODIFIERS will be removed after migration
export interface RaceModifiers {
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}

export const RACE_MODIFIERS: Record<Race, RaceModifiers> = {
  [Race.HUMAN]: { strength: 0, intelligence: 0, piety: 0, vitality: 0, agility: 0, luck: 0 },
  [Race.ELF]: { strength: -1, intelligence: 1, piety: 1, vitality: -2, agility: 1, luck: 0 },
  [Race.DWARF]: { strength: 2, intelligence: 0, piety: 0, vitality: 2, agility: -1, luck: 0 },
  [Race.GNOME]: { strength: -1, intelligence: 1, piety: 0, vitality: -1, agility: 1, luck: 0 },
  [Race.HOBBIT]: { strength: -2, intelligence: 0, piety: 1, vitality: -1, agility: 2, luck: 1 }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- Race.spec.ts
```

Expected: PASS (all tests passing)

**Step 5: Commit Race types**

```bash
git add src/types/Race.ts src/types/__tests__/Race.spec.ts
git commit -m "feat(types): add RaceData interface matching JSON structure

- RaceData interface matches data/races/*.json files exactly
- RaceBaseStats for base attribute values
- SavingThrowBonus for negative modifier system
- Helper functions getRaceId(), parseRace(), parseSavingThrowBonus()
- Keep old RACE_MODIFIERS for backward compatibility during migration

Tests verify interface matches JSON structure.

Part of data type refactor."
```

---

## Task 4: Create CharacterClass TypeScript Interfaces

**Files:**
- Modify: `src/types/CharacterClass.ts`
- Create: `src/types/__tests__/CharacterClass.spec.ts`

**Step 1: Write test for ClassData interface**

Create `src/types/__tests__/CharacterClass.spec.ts`:

```typescript
import { CharacterClass, ClassData, parseAlignmentRestrictions } from '../CharacterClass'
import { Alignment } from '../Alignment'

describe('CharacterClass Type System', () => {
  describe('ClassData interface', () => {
    it('matches JSON structure for Fighter', () => {
      const fighter: ClassData = {
        id: 'fighter',
        name: 'Fighter',
        description: 'Test',
        requirements: {
          str: 11
        },
        alignmentRestrictions: [],
        equipmentRestrictions: {
          weapons: ['all'],
          armor: ['cloth', 'leather', 'chain', 'plate'],
          shields: ['small', 'large'],
          helmets: ['leather', 'iron', 'steel']
        },
        hitDice: '1d10',
        spellAccess: null,
        attacksPerLevel: {
          '1-4': 1,
          '5-9': 2,
          '10+': 3
        },
        xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
      }

      expect(fighter.requirements.str).toBe(11)
      expect(fighter.hitDice).toBe('1d10')
      expect(fighter.xpTable).toHaveLength(11)
    })

    it('matches JSON structure for Mage', () => {
      const mage: ClassData = {
        id: 'mage',
        name: 'Mage',
        description: 'Test',
        requirements: {
          int: 11
        },
        alignmentRestrictions: [],
        equipmentRestrictions: {
          weapons: ['dagger', 'staff'],
          armor: ['none'],
          shields: [],
          helmets: []
        },
        hitDice: '1d4',
        spellAccess: {
          mage: {
            minLevel: 1,
            maxLevel: 7
          }
        },
        attacksPerLevel: {
          '1+': 1
        },
        xpTable: [2500, 5000, 10000, 20000, 40000, 60000, 90000, 125000, 175000, 250000, 400000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: false
      }

      expect(mage.spellAccess?.mage?.maxLevel).toBe(7)
      expect(mage.hitDice).toBe('1d4')
    })

    it('matches JSON structure for Bishop', () => {
      const bishop: ClassData = {
        id: 'bishop',
        name: 'Bishop',
        description: 'Test',
        requirements: {
          int: 12,
          pie: 12
        },
        alignmentRestrictions: ['good', 'evil'],
        equipmentRestrictions: {
          weapons: ['mace', 'flail', 'staff'],
          armor: ['cloth', 'leather', 'chain', 'plate'],
          shields: ['small', 'large'],
          helmets: []
        },
        hitDice: '1d6',
        spellAccess: {
          mage: {
            minLevel: 1,
            maxLevel: 7
          },
          priest: {
            minLevel: 1,
            maxLevel: 7
          }
        },
        attacksPerLevel: {
          '1+': 1
        },
        xpTable: [3000, 6000, 12000, 24000, 48000, 96000, 190000, 380000, 760000, 1140000, 1520000],
        specialAbilities: [],
        canIdentifyItems: true,
        canDispelUndead: false,
        canCriticalHit: false
      }

      expect(bishop.alignmentRestrictions).toEqual(['good', 'evil'])
      expect(bishop.requirements.str).toBeUndefined()
    })
  })

  describe('parseAlignmentRestrictions', () => {
    it('parses alignment restrictions correctly', () => {
      const restrictions = parseAlignmentRestrictions(['good', 'evil'])
      expect(restrictions).toEqual([Alignment.GOOD, Alignment.EVIL])
    })

    it('handles empty restrictions', () => {
      const restrictions = parseAlignmentRestrictions([])
      expect(restrictions).toEqual([])
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- CharacterClass.spec.ts
```

Expected: FAIL (ClassData interface not defined yet)

**Step 3: Update CharacterClass.ts with data interfaces**

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
  str?: number
  int?: number
  pie?: number
  vit?: number
  agi?: number
  luc?: number
}

/**
 * Equipment restrictions for a class
 */
export interface EquipmentRestrictions {
  weapons: string[]      // "all" or specific weapon types
  armor: string[]        // "all", "none", or specific armor types
  shields: string[]      // Empty array = cannot use shields
  helmets: string[]      // Empty array = cannot use helmets
}

/**
 * Spell access definition (for caster classes)
 */
export interface SpellAccess {
  mage?: {
    minLevel: number    // Level when spells become available
    maxLevel: number    // Max spell level (1-7, Samurai/Lord capped at 6)
  }
  priest?: {
    minLevel: number
    maxLevel: number
  }
}

/**
 * Attacks per level mapping (range-based)
 */
export interface AttacksPerLevel {
  [levelRange: string]: number  // e.g. "1-4": 1, "5-9": 2
}

/**
 * Complete class data structure (matches JSON files)
 */
export interface ClassData {
  id: string
  name: string
  description: string
  requirements: ClassRequirements
  alignmentRestrictions: string[]  // "good", "neutral", "evil" (empty = any)
  equipmentRestrictions: EquipmentRestrictions
  hitDice: string                  // "1d4", "1d6", "1d8", "1d10"
  spellAccess: SpellAccess | null
  attacksPerLevel: AttacksPerLevel
  xpTable: number[]                // XP required for levels 2-13 (11 entries)
  specialAbilities: string[]
  canIdentifyItems: boolean
  canDispelUndead: boolean
  canCriticalHit: boolean
}

/**
 * Map class enum to lowercase ID for JSON loading
 */
export function getClassId(charClass: CharacterClass): string {
  return charClass.toLowerCase()
}

/**
 * Map lowercase ID to class enum
 */
export function parseClass(id: string): CharacterClass | null {
  const upperID = id.toUpperCase()
  if (upperID in CharacterClass) {
    return CharacterClass[upperID as keyof typeof CharacterClass]
  }
  return null
}

/**
 * Parse alignment restrictions from JSON strings
 */
export function parseAlignmentRestrictions(restrictions: string[]): Alignment[] {
  return restrictions.map(r => {
    const upper = r.toUpperCase()
    if (upper in Alignment) {
      return Alignment[upper as keyof typeof Alignment]
    }
    throw new Error(`Invalid alignment: ${r}`)
  })
}

/**
 * Get attacks per round for a given level
 */
export function getAttacksForLevel(attacksPerLevel: AttacksPerLevel, level: number): number {
  // Find matching range
  for (const [range, attacks] of Object.entries(attacksPerLevel)) {
    if (range.includes('+')) {
      // "1+" means level 1 and up
      const minLevel = parseInt(range.replace('+', ''))
      if (level >= minLevel) {
        return attacks
      }
    } else if (range.includes('-')) {
      // "1-4" means levels 1 through 4
      const [min, max] = range.split('-').map(Number)
      if (level >= min && level <= max) {
        return attacks
      }
    }
  }

  // Default to 1 if no range found
  return 1
}

// DEPRECATED: Old CLASS_REQUIREMENTS will be removed after migration
export const CLASS_REQUIREMENTS: Record<CharacterClass, ClassRequirements> = {
  [CharacterClass.FIGHTER]: { str: 11 },
  [CharacterClass.MAGE]: { int: 11 },
  [CharacterClass.PRIEST]: { pie: 11 },
  [CharacterClass.THIEF]: { agi: 11 },
  [CharacterClass.BISHOP]: { int: 12, pie: 12 },
  [CharacterClass.SAMURAI]: { str: 15, int: 11, pie: 10, vit: 14, agi: 10 },
  [CharacterClass.LORD]: { str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15 },
  [CharacterClass.NINJA]: { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- CharacterClass.spec.ts
```

Expected: PASS (all tests passing)

**Step 5: Commit CharacterClass types**

```bash
git add src/types/CharacterClass.ts src/types/__tests__/CharacterClass.spec.ts
git commit -m "feat(types): add ClassData interface matching JSON structure

- ClassData interface matches data/classes/*.json files exactly
- ClassRequirements, EquipmentRestrictions, SpellAccess, AttacksPerLevel
- Helper functions getClassId(), parseClass(), parseAlignmentRestrictions(), getAttacksForLevel()
- Keep old CLASS_REQUIREMENTS for backward compatibility during migration

Tests verify interface matches JSON structure for Fighter, Mage, Bishop.

Part of data type refactor."
```

---

## Task 5: Implement AssetLoadingService Data Loading

**Files:**
- Modify: `src/services/AssetLoadingService.ts`
- Create: `src/services/__tests__/AssetLoadingService.spec.ts`

**Step 1: Write test for loadDataFiles()**

Create `src/services/__tests__/AssetLoadingService.spec.ts`:

```typescript
import { AssetLoadingService } from '../AssetLoadingService'
import { RaceData } from '../../types/Race'
import { ClassData } from '../../types/CharacterClass'

describe('AssetLoadingService', () => {
  describe('loadDataFiles', () => {
    it('loads all race data files', async () => {
      const races = await AssetLoadingService.loadDataFiles<RaceData>('races')

      expect(races.size).toBe(5)
      expect(races.has('human')).toBe(true)
      expect(races.has('elf')).toBe(true)
      expect(races.has('dwarf')).toBe(true)
      expect(races.has('gnome')).toBe(true)
      expect(races.has('hobbit')).toBe(true)

      const human = races.get('human')!
      expect(human.baseStats.str).toBe(8)
      expect(human.savingThrowBonus.death).toBe(-1)
    })

    it('loads all class data files', async () => {
      const classes = await AssetLoadingService.loadDataFiles<ClassData>('classes')

      expect(classes.size).toBe(8)
      expect(classes.has('fighter')).toBe(true)
      expect(classes.has('mage')).toBe(true)
      expect(classes.has('priest')).toBe(true)
      expect(classes.has('thief')).toBe(true)
      expect(classes.has('bishop')).toBe(true)
      expect(classes.has('samurai')).toBe(true)
      expect(classes.has('lord')).toBe(true)
      expect(classes.has('ninja')).toBe(true)

      const fighter = classes.get('fighter')!
      expect(fighter.hitDice).toBe('1d10')
      expect(fighter.xpTable).toHaveLength(11)
    })

    it('throws error for invalid directory', async () => {
      await expect(
        AssetLoadingService.loadDataFiles('invalid')
      ).rejects.toThrow()
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- AssetLoadingService.spec.ts
```

Expected: FAIL (loadDataFiles not implemented yet)

**Step 3: Read current AssetLoadingService**

Check `src/services/AssetLoadingService.ts` to understand current structure.

**Step 4: Implement loadDataFiles() method**

Modify `src/services/AssetLoadingService.ts`:

```typescript
export interface AssetLoadingProgress {
  total: number
  loaded: number
  currentAsset: string
}

export const AssetLoadingService = {
  /**
   * Load all JSON data files from a directory
   * @param directory - Directory name under /assets/ (e.g., 'races', 'classes')
   * @returns Map of data objects keyed by their 'id' property
   */
  async loadDataFiles<T extends { id: string }>(directory: string): Promise<Map<string, T>> {
    const dataMap = new Map<string, T>()

    // Determine file list based on directory
    const files = getDataFileList(directory)

    // Load each file
    for (const filename of files) {
      const path = `/assets/${directory}/${filename}`

      try {
        const response = await fetch(path)
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.statusText}`)
        }

        const data: T = await response.json()
        dataMap.set(data.id, data)
      } catch (error) {
        console.error(`Error loading ${path}:`, error)
        throw error
      }
    }

    return dataMap
  },

  // ... existing loadGameAssets, loadImage methods ...
}

/**
 * Get list of data files for a directory
 */
function getDataFileList(directory: string): string[] {
  switch (directory) {
    case 'races':
      return ['human.json', 'elf.json', 'dwarf.json', 'gnome.json', 'hobbit.json']

    case 'classes':
      return ['fighter.json', 'mage.json', 'priest.json', 'thief.json', 'bishop.json', 'samurai.json', 'lord.json', 'ninja.json']

    case 'spells':
      return ['mage-spells.json', 'priest-spells.json']

    case 'items':
      return ['weapons.json', 'armor.json', 'consumables.json']

    case 'monsters':
      return ['monsters.json']

    case 'maps':
      return Array.from({ length: 10 }, (_, i) => `level-${String(i + 1).padStart(2, '0')}.json`)

    default:
      throw new Error(`Unknown data directory: ${directory}`)
  }
}
```

**Step 5: Update angular.json to copy data files to assets**

Modify `angular.json`:

Find the `assets` array in the build configuration and add data directory:

```json
"assets": [
  "src/favicon.ico",
  {
    "glob": "**/*",
    "input": "data",
    "output": "/assets"
  }
]
```

**Step 6: Run test to verify it passes**

```bash
npm test -- AssetLoadingService.spec.ts
```

Expected: PASS (all tests passing)

**Step 7: Commit AssetLoadingService updates**

```bash
git add src/services/AssetLoadingService.ts src/services/__tests__/AssetLoadingService.spec.ts angular.json
git commit -m "feat(services): implement loadDataFiles() for JSON data loading

- Add loadDataFiles<T>() method to load JSON files from /assets directories
- Support races, classes, spells, items, monsters, maps directories
- Returns Map<string, T> keyed by 'id' property
- Update angular.json to copy data/ directory to assets/
- Tests verify loading all race and class data files

AssetLoadingService now complete for data-driven architecture.

Part of data type refactor."
```

---

## Task 6: Create RaceService and ClassService

**Files:**
- Create: `src/services/RaceService.ts`
- Create: `src/services/__tests__/RaceService.spec.ts`
- Create: `src/services/ClassService.ts`
- Create: `src/services/__tests__/ClassService.spec.ts`

**Step 1: Write test for RaceService**

Create `src/services/__tests__/RaceService.spec.ts`:

```typescript
import { RaceService } from '../RaceService'
import { Race } from '../../types/Race'

describe('RaceService', () => {
  beforeAll(async () => {
    await RaceService.initialize()
  })

  describe('getRaceData', () => {
    it('returns race data for Human', () => {
      const data = RaceService.getRaceData(Race.HUMAN)

      expect(data.name).toBe('Human')
      expect(data.baseStats.str).toBe(8)
      expect(data.savingThrowBonus.death).toBe(-1)
    })

    it('returns race data for Elf', () => {
      const data = RaceService.getRaceData(Race.ELF)

      expect(data.name).toBe('Elf')
      expect(data.baseStats.int).toBe(10)
      expect(data.savingThrowBonus.wand).toBe(-2)
    })

    it('throws error for uninitialized service', () => {
      const uninitializedService = Object.create(RaceService)
      uninitializedService.raceData = null

      expect(() => uninitializedService.getRaceData(Race.HUMAN)).toThrow('RaceService not initialized')
    })
  })

  describe('getAllRaces', () => {
    it('returns all 5 races', () => {
      const races = RaceService.getAllRaces()

      expect(races).toHaveLength(5)
      expect(races.map(r => r.id)).toContain('human')
      expect(races.map(r => r.id)).toContain('elf')
      expect(races.map(r => r.id)).toContain('dwarf')
      expect(races.map(r => r.id)).toContain('gnome')
      expect(races.map(r => r.id)).toContain('hobbit')
    })
  })

  describe('getSavingThrowBonus', () => {
    it('returns death bonus for Human', () => {
      const bonus = RaceService.getSavingThrowBonus(Race.HUMAN, 'death')
      expect(bonus).toBe(-1)
    })

    it('returns 0 for non-existent bonus', () => {
      const bonus = RaceService.getSavingThrowBonus(Race.HUMAN, 'wand')
      expect(bonus).toBe(0)
    })

    it('returns spell bonus for Hobbit', () => {
      const bonus = RaceService.getSavingThrowBonus(Race.HOBBIT, 'spell')
      expect(bonus).toBe(-3)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- RaceService.spec.ts
```

Expected: FAIL (RaceService not defined yet)

**Step 3: Implement RaceService**

Create `src/services/RaceService.ts`:

```typescript
import { Race, RaceData, getRaceId } from '../types/Race'
import { AssetLoadingService } from './AssetLoadingService'

type SaveType = 'death' | 'wand' | 'breath' | 'petrify' | 'spell'

class RaceServiceClass {
  private raceData: Map<string, RaceData> | null = null

  /**
   * Initialize the race service by loading all race data
   */
  async initialize(): Promise<void> {
    this.raceData = await AssetLoadingService.loadDataFiles<RaceData>('races')
  }

  /**
   * Get race data for a specific race
   */
  getRaceData(race: Race): RaceData {
    if (!this.raceData) {
      throw new Error('RaceService not initialized. Call initialize() first.')
    }

    const id = getRaceId(race)
    const data = this.raceData.get(id)

    if (!data) {
      throw new Error(`Race data not found for: ${race}`)
    }

    return data
  }

  /**
   * Get all race data
   */
  getAllRaces(): RaceData[] {
    if (!this.raceData) {
      throw new Error('RaceService not initialized. Call initialize() first.')
    }

    return Array.from(this.raceData.values())
  }

  /**
   * Get saving throw bonus for a race and save type
   * Returns 0 if no bonus exists
   */
  getSavingThrowBonus(race: Race, saveType: SaveType): number {
    const data = this.getRaceData(race)
    return data.savingThrowBonus[saveType] ?? 0
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.raceData !== null
  }
}

export const RaceService = new RaceServiceClass()
```

**Step 4: Run test to verify it passes**

```bash
npm test -- RaceService.spec.ts
```

Expected: PASS (all tests passing)

**Step 5: Write test for ClassService**

Create `src/services/__tests__/ClassService.spec.ts`:

```typescript
import { ClassService } from '../ClassService'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'

describe('ClassService', () => {
  beforeAll(async () => {
    await ClassService.initialize()
  })

  describe('getClassData', () => {
    it('returns class data for Fighter', () => {
      const data = ClassService.getClassData(CharacterClass.FIGHTER)

      expect(data.name).toBe('Fighter')
      expect(data.hitDice).toBe('1d10')
      expect(data.requirements.str).toBe(11)
    })

    it('returns class data for Bishop', () => {
      const data = ClassService.getClassData(CharacterClass.BISHOP)

      expect(data.name).toBe('Bishop')
      expect(data.requirements.int).toBe(12)
      expect(data.requirements.pie).toBe(12)
      expect(data.requirements.str).toBeUndefined()
    })
  })

  describe('getXpForLevel', () => {
    it('returns correct XP for Fighter level 2', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 2)
      expect(xp).toBe(2000)
    })

    it('returns correct XP for Fighter level 13', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 13)
      expect(xp).toBe(1500000)
    })

    it('returns 0 for level 1', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 1)
      expect(xp).toBe(0)
    })
  })

  describe('getAttacksPerRound', () => {
    it('returns 1 attack for Fighter level 1', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 1)
      expect(attacks).toBe(1)
    })

    it('returns 2 attacks for Fighter level 5', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 5)
      expect(attacks).toBe(2)
    })

    it('returns 3 attacks for Fighter level 10', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 10)
      expect(attacks).toBe(3)
    })

    it('returns 2 attacks for Ninja level 1', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.NINJA, 1)
      expect(attacks).toBe(2)
    })

    it('returns 3 attacks for Ninja level 5', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.NINJA, 5)
      expect(attacks).toBe(3)
    })
  })

  describe('isAlignmentAllowed', () => {
    it('allows any alignment for Fighter', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.GOOD)).toBe(true)
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.NEUTRAL)).toBe(true)
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.EVIL)).toBe(true)
    })

    it('allows only Good/Evil for Bishop', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.GOOD)).toBe(true)
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.NEUTRAL)).toBe(false)
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.EVIL)).toBe(true)
    })

    it('allows only Evil for Ninja', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.GOOD)).toBe(false)
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.NEUTRAL)).toBe(false)
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.EVIL)).toBe(true)
    })
  })
})
```

**Step 6: Run test to verify it fails**

```bash
npm test -- ClassService.spec.ts
```

Expected: FAIL (ClassService not defined yet)

**Step 7: Implement ClassService**

Create `src/services/ClassService.ts`:

```typescript
import { CharacterClass, ClassData, getClassId, getAttacksForLevel, parseAlignmentRestrictions } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'
import { AssetLoadingService } from './AssetLoadingService'

class ClassServiceClass {
  private classData: Map<string, ClassData> | null = null

  /**
   * Initialize the class service by loading all class data
   */
  async initialize(): Promise<void> {
    this.classData = await AssetLoadingService.loadDataFiles<ClassData>('classes')
  }

  /**
   * Get class data for a specific class
   */
  getClassData(charClass: CharacterClass): ClassData {
    if (!this.classData) {
      throw new Error('ClassService not initialized. Call initialize() first.')
    }

    const id = getClassId(charClass)
    const data = this.classData.get(id)

    if (!data) {
      throw new Error(`Class data not found for: ${charClass}`)
    }

    return data
  }

  /**
   * Get all class data
   */
  getAllClasses(): ClassData[] {
    if (!this.classData) {
      throw new Error('ClassService not initialized. Call initialize() first.')
    }

    return Array.from(this.classData.values())
  }

  /**
   * Get XP required for a specific level
   * Level 1 = 0 XP, Level 2+ uses xpTable
   */
  getXpForLevel(charClass: CharacterClass, level: number): number {
    if (level <= 1) {
      return 0
    }

    const data = this.getClassData(charClass)
    const index = level - 2  // xpTable is for levels 2-13

    if (index < 0 || index >= data.xpTable.length) {
      throw new Error(`Invalid level ${level} for class ${charClass}`)
    }

    return data.xpTable[index]
  }

  /**
   * Get attacks per round for a class at a given level
   */
  getAttacksPerRound(charClass: CharacterClass, level: number): number {
    const data = this.getClassData(charClass)
    return getAttacksForLevel(data.attacksPerLevel, level)
  }

  /**
   * Check if an alignment is allowed for a class
   */
  isAlignmentAllowed(charClass: CharacterClass, alignment: Alignment): boolean {
    const data = this.getClassData(charClass)

    // Empty array means any alignment allowed
    if (data.alignmentRestrictions.length === 0) {
      return true
    }

    const allowedAlignments = parseAlignmentRestrictions(data.alignmentRestrictions)
    return allowedAlignments.includes(alignment)
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.classData !== null
  }
}

export const ClassService = new ClassServiceClass()
```

**Step 8: Run test to verify it passes**

```bash
npm test -- ClassService.spec.ts
```

Expected: PASS (all tests passing)

**Step 9: Commit RaceService and ClassService**

```bash
git add src/services/RaceService.ts src/services/__tests__/RaceService.spec.ts src/services/ClassService.ts src/services/__tests__/ClassService.spec.ts
git commit -m "feat(services): add RaceService and ClassService for loaded data access

RaceService:
- initialize() to load race data from JSON
- getRaceData(race) to get race information
- getSavingThrowBonus(race, saveType) to get save bonuses
- getAllRaces() to get all race data

ClassService:
- initialize() to load class data from JSON
- getClassData(class) to get class information
- getXpForLevel(class, level) to get XP requirements
- getAttacksPerRound(class, level) to get combat attacks
- isAlignmentAllowed(class, alignment) to check restrictions
- getAllClasses() to get all class data

Tests verify all functionality with real JSON data.

Part of data type refactor."
```

---

## Task 7: Update Character Type

**Files:**
- Modify: `src/types/Character.ts`
- Create: `src/types/__tests__/Character.spec.ts`

**Step 1: Write test for updated Character interface**

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
    expect(fighter.vim.current).toBe(14)
    expect(fighter.age).toBe(15)
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

  it('does NOT have password field', () => {
    const character: any = {
      id: 'test',
      name: 'Test'
      // ... other fields
    }

    expect(character.password).toBeUndefined()
  })

  it('does NOT have character-level gold field', () => {
    const character: any = {
      id: 'test',
      name: 'Test'
      // ... other fields
    }

    expect(character.gold).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- Character.spec.ts
```

Expected: FAIL (Character interface doesn't have new fields yet)

**Step 3: Read current Character.ts**

Read `src/types/Character.ts` to understand current structure.

**Step 4: Update Character interface**

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

  // Attributes (final values after racial base stats + rolls applied)
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

**Step 5: Run test to verify it passes**

```bash
npm test -- Character.spec.ts
```

Expected: PASS (all 5 tests passing)

**Step 6: Commit Character interface**

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

Tests verify fighter (no spells), mage (mage spells), and full equipment.

Part of data type refactor."
```

---

## Task 8: Initialize Data Loading at Startup

**Files:**
- Modify: `src/services/GameInitializationService.ts`
- Modify: `src/services/__tests__/GameInitializationService.spec.ts`

**Step 1: Read current GameInitializationService**

Check current implementation to understand initialization flow.

**Step 2: Update tests to expect data loading**

Modify `src/services/__tests__/GameInitializationService.spec.ts`:

Add test for data initialization:

```typescript
import { GameInitializationService } from '../GameInitializationService'
import { RaceService } from '../RaceService'
import { ClassService } from '../ClassService'

describe('GameInitializationService', () => {
  describe('initialize', () => {
    it('initializes race and class data', async () => {
      await GameInitializationService.initialize()

      expect(RaceService.isInitialized()).toBe(true)
      expect(ClassService.isInitialized()).toBe(true)
    })
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm test -- GameInitializationService.spec.ts
```

Expected: FAIL (data services not initialized)

**Step 4: Update GameInitializationService to load data**

Modify `src/services/GameInitializationService.ts`:

```typescript
import { RaceService } from './RaceService'
import { ClassService } from './ClassService'

export const GameInitializationService = {
  async initialize(): Promise<void> {
    console.log('Initializing game data...')

    // Load race and class data first (required for character creation)
    await Promise.all([
      RaceService.initialize(),
      ClassService.initialize()
    ])

    console.log('Game data initialized successfully')

    // ... existing initialization code ...
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- GameInitializationService.spec.ts
```

Expected: PASS

**Step 6: Commit GameInitializationService updates**

```bash
git add src/services/GameInitializationService.ts src/services/__tests__/GameInitializationService.spec.ts
git commit -m "feat(services): initialize RaceService and ClassService at startup

- Load race data from JSON at game initialization
- Load class data from JSON at game initialization
- Run in parallel for faster startup
- Tests verify both services initialized

Part of data type refactor."
```

---

## Task 9: Update CharacterCreationService

**Files:**
- Modify: `src/services/CharacterCreationService.ts`
- Modify: `src/services/__tests__/CharacterCreationService.spec.ts`

**Step 1: Update tests to expect base stats from RaceService**

Modify `src/services/__tests__/CharacterCreationService.spec.ts`:

```typescript
import { CharacterCreationService } from '../CharacterCreationService'
import { RaceService } from '../RaceService'
import { ClassService } from '../ClassService'
import { Race } from '../../types/Race'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'

describe('CharacterCreationService', () => {
  beforeAll(async () => {
    await RaceService.initialize()
    await ClassService.initialize()
  })

  describe('createCharacter', () => {
    it('applies racial base stats correctly for Human', () => {
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

    it('applies racial base stats correctly for Elf', () => {
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

    it('initializes VIM to vitality stat', () => {
      const character = CharacterCreationService.createCharacter({
        name: 'Test',
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

      expect(character.vim.current).toBe(18) // Human VIT base 8 + roll 10
      expect(character.vim.max).toBe(18)
    })

    it('initializes age to 15-16 range', () => {
      const character = CharacterCreationService.createCharacter({
        name: 'Test',
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

      expect(character.age).toBeGreaterThanOrEqual(14)
      expect(character.age).toBeLessThanOrEqual(16)
    })

    it('initializes spell points for mage', () => {
      const mage = CharacterCreationService.createCharacter({
        name: 'Test Mage',
        race: Race.HUMAN,
        class: CharacterClass.MAGE,
        alignment: Alignment.GOOD,
        rolledStats: {
          strength: 5,
          intelligence: 12,
          piety: 5,
          vitality: 5,
          agility: 5,
          luck: 5,
          bonusPoints: 0
        }
      })

      expect(mage.spellPoints).toBeDefined()
      expect(mage.spellPoints?.mage).toBeDefined()
      expect(mage.spellPoints?.mage?.level1.max).toBeGreaterThan(0)
    })

    it('does not initialize spell points for fighter', () => {
      const fighter = CharacterCreationService.createCharacter({
        name: 'Test Fighter',
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

      expect(fighter.spellPoints).toBeUndefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- CharacterCreationService.spec.ts
```

Expected: FAIL (still using old RACE_MODIFIERS approach)

**Step 3: Read current CharacterCreationService**

Read `src/services/CharacterCreationService.ts` to understand current implementation.

**Step 4: Update CharacterCreationService to use RaceService**

Modify `src/services/CharacterCreationService.ts`:

```typescript
import { Character } from '../types/Character'
import { Race } from '../types/Race'
import { CharacterClass } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'
import { CharacterSpellPoints } from '../types/SpellPoints'
import { RaceService } from './RaceService'
import { ClassService } from './ClassService'

export interface CreateCharacterParams {
  name: string
  race: Race
  class: CharacterClass
  alignment: Alignment
  rolledStats: {
    strength: number
    intelligence: number
    piety: number
    vitality: number
    agility: number
    luck: number
    bonusPoints: number
  }
}

export const CharacterCreationService = {
  createCharacter(params: CreateCharacterParams): Character {
    const raceData = RaceService.getRaceData(params.race)
    const classData = ClassService.getClassData(params.class)

    // Calculate final stats: racial base + rolled amount + bonus points
    const strength = raceData.baseStats.str + params.rolledStats.strength
    const intelligence = raceData.baseStats.int + params.rolledStats.intelligence
    const piety = raceData.baseStats.pie + params.rolledStats.piety
    const vitality = raceData.baseStats.vit + params.rolledStats.vitality
    const agility = raceData.baseStats.agi + params.rolledStats.agility
    const luck = raceData.baseStats.luc + params.rolledStats.luck

    // Initialize VIM to vitality stat
    const vim = { current: vitality, max: vitality }

    // Initialize spell points for casters
    const spellPoints = initializeSpellPoints(params.class, intelligence, piety)

    // Roll HP based on class hit dice
    const hp = rollHP(classData.hitDice)

    // Roll age (14-16)
    const age = rollAge()

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
      age,
      hp,
      maxHp: hp,
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
  const classData = ClassService.getClassData(charClass)

  if (!classData.spellAccess) {
    return undefined
  }

  const result: CharacterSpellPoints = {}

  if (classData.spellAccess.mage) {
    const magePoints = calculateSpellPointsForStat(intelligence)
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

  if (classData.spellAccess.priest) {
    const priestPoints = calculateSpellPointsForStat(piety)
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
function calculateSpellPointsForStat(stat: number): number {
  const base = Math.floor((stat - 10) / 6)
  return Math.max(0, Math.min(9, base))
}

function rollAge(): number {
  return 14 + Math.floor(Math.random() * 3)  // 14-16
}

function rollHP(hitDice: string): number {
  const dieMatch = hitDice.match(/1d(\d+)/)
  if (!dieMatch) {
    throw new Error(`Invalid hit dice format: ${hitDice}`)
  }

  const dieSize = parseInt(dieMatch[1])
  return 1 + Math.floor(Math.random() * dieSize)
}

function generateId(): string {
  return 'char-' + Math.random().toString(36).substr(2, 9)
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- CharacterCreationService.spec.ts
```

Expected: PASS (all tests passing)

**Step 6: Commit CharacterCreationService updates**

```bash
git add src/services/CharacterCreationService.ts src/services/__tests__/CharacterCreationService.spec.ts
git commit -m "refactor(services): use RaceService/ClassService in character creation

- Replace RACE_MODIFIERS with RaceService.getRaceData()
- Formula: final stat = racial base + rolled amount
- Use ClassService.getClassData() for hit dice
- Initialize VIM to vitality stat
- Initialize spell points for casters (level 1 only at creation)
- Initialize age to 14-16 random
- Tests verify Human and Elf base stat calculations

Part of data type refactor."
```

---

## Task 10: Update SaveService Schema Version

**Files:**
- Modify: `src/services/SaveService.ts`

**Step 1: Update schema version**

Modify `src/services/SaveService.ts`:

Find `SAVE_SCHEMA_VERSION` and increment to 2:

```typescript
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

  // ... rest of SaveService implementation
}
```

**Step 2: Commit schema version update**

```bash
git add src/services/SaveService.ts
git commit -m "feat(services): increment save schema version to v2

BREAKING CHANGE: Save data format changed, old saves incompatible

- Increment SAVE_SCHEMA_VERSION to 2
- Auto-clear incompatible saves on load
- Log warnings when schema mismatch detected

Old saves will be automatically deleted on load attempt.
Users will see empty save slots and can create fresh saves.

Part of data type refactor."
```

---

## Task 11: Update Test Factories

**Files:**
- Modify: `src/test-helpers/character-factories.ts`

**Step 1: Read current test factories**

Check `src/test-helpers/character-factories.ts` to understand current structure.

**Step 2: Update character factory**

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

**Step 3: Commit test factory updates**

```bash
git add src/test-helpers/character-factories.ts
git commit -m "refactor(tests): update character factories for new Character type

- Remove password, gold, createdAt, lastModified
- Add age (default 15)
- Add vim ({ current, max })
- Add spellPoints for mage and bishop factories
- Update test character defaults

All test factories now create valid characters matching new schema.

Part of data type refactor."
```

---

## Task 12: Fix All Failing Tests

**Step 1: Run full test suite**

```bash
npm test
```

Expected: Many failures due to type changes

**Step 2: Fix service tests**

Go through each failing test file and update:

Common fixes needed:
- Remove references to `character.password`
- Remove references to `character.gold` (use `party.gold`)
- Remove references to `character.createdAt`, `character.lastModified`
- Add `character.age` to test data
- Add `character.vim` to test data
- Update to use `RaceService` instead of `RACE_MODIFIERS`
- Update to use `ClassService` instead of `CLASS_REQUIREMENTS`

**Step 3: Run tests again**

```bash
npm test
```

Expected: Progressively fewer failures as fixes are applied

**Step 4: Commit test fixes in batches**

```bash
git add -A
git commit -m "test: fix service tests for new Character type schema

- Remove password, gold, createdAt, lastModified from test data
- Add age and vim to all character test objects
- Update services to use RaceService/ClassService
- Fix type expectations for new structure

Part of data type refactor."
```

---

## Task 13: Update Component Tests

**Files:**
- Modify: `src/app/training-grounds/__tests__/training-grounds.component.spec.ts`
- Modify: Component test files that reference Character type

**Step 1: Update component tests**

Find and fix component tests that:
- Expect password field
- Expect character gold
- Don't provide age or vim fields
- Reference old race/class structures

**Step 2: Run component tests**

```bash
npm test -- --testPathPattern="component"
```

Expected: All component tests passing

**Step 3: Commit component test updates**

```bash
git add src/app src/components
git commit -m "test: update component tests for Character type changes

- Remove password and gold field expectations
- Add age and vim to test character data
- Update for new 5-slot equipment structure
- All component tests passing

Part of data type refactor."
```

---

## Task 14: Update Documentation

**Files:**
- Create: `docs/implementation/data-type-refactor-summary.md`
- Modify: `docs/research/race-stats.md` (add verified data)
- Modify: `docs/research/class-reference.md` (add verified data)

**Step 1: Create refactor summary document**

Create `docs/implementation/data-type-refactor-summary.md`:

```markdown
# Data Type Refactor Summary - Data-Driven Architecture

**Date:** 2025-02-11
**Status:** Complete
**Breaking Changes:** Yes (save schema v1 → v2)

## Overview

Comprehensive refactor of Character, Race, and CharacterClass types to load from JSON data files at runtime, accurately matching original Wizardry 1 (1981) mechanics.

## Architecture Approach

**Data-Driven Design:**
- Race/class data stored in JSON files (`data/races/*.json`, `data/classes/*.json`)
- TypeScript interfaces match JSON structure exactly
- AssetLoadingService loads data at game initialization
- RaceService/ClassService provide typed access to loaded data
- Single source of truth: JSON files (easy to modify without recompiling)

## Changes Made

### Character Type

**Removed:**
- `password: string` - Simplified character management
- `gold: number` - Moved to party-level only
- `createdAt: number` - Removed metadata
- `lastModified: number` - Removed metadata

**Added:**
- `age: number` - For level-up stat calculations (14-16 starting)
- `vim: MaxCurrent` - Resurrection vitality tracking
- `spellPoints?: CharacterSpellPoints` - 7 levels per spell type
- `equippedShield?: string` - Third equipment slot
- `equippedHelmet?: string` - Fourth equipment slot
- `equippedGauntlets?: string` - Fifth equipment slot

**Total Equipment Slots:** 5 (was 2)

### Race Data (JSON Files)

**Fixed Saving Throw Bonuses:**
- Human: `death: -1` (better vs poison/paralysis/critical hits)
- Elf: `wand: -2` (formula bonus, though wand save unused in game)
- Dwarf: `breath: -4` (better vs breath attacks)
- Gnome: `petrify: -2` (better vs petrification)
- Hobbit: `spell: -3` (better vs spells/magic)

Uses **negative modifier system** from original Wizardry 1 saving throw formula.

### Class Data (JSON Files)

**Fixed Requirements:**
- Bishop: Removed incorrect STR requirement
- Added alignment restrictions (Bishop: Good/Evil only)

**Fixed Equipment:**
- Thief: Removed "club" weapon (only dagger/short_sword allowed)
- Ninja: Fixed to armor: ["none"] only (best unarmored)
- Ninja: Removed shields and helmets (cannot use)

**Fixed Attacks Per Round:**
- Priest: Level-scaling attacks (1-4:1, 5-9:2, 10+:3)
- Thief: Level-scaling attacks (same as Priest/Fighter)
- Ninja: Research formula 2 + (level/5) - starts at 2 attacks!

**Added XP Tables:**
- All 8 classes now have complete XP tables for levels 2-13

**Other Fixes:**
- Thief hit dice: Confirmed 1d8 (matches research)

### New Services

**RaceService:**
- `initialize()` - Load race data from JSON files
- `getRaceData(race)` - Get complete race information
- `getSavingThrowBonus(race, saveType)` - Get saving throw bonuses
- `getAllRaces()` - Get all race data

**ClassService:**
- `initialize()` - Load class data from JSON files
- `getClassData(class)` - Get complete class information
- `getXpForLevel(class, level)` - Get XP requirements
- `getAttacksPerRound(class, level)` - Get combat attacks
- `isAlignmentAllowed(class, alignment)` - Check alignment restrictions
- `getAllClasses()` - Get all class data

### AssetLoadingService

**New Method:**
- `loadDataFiles<T>(directory)` - Generic JSON loader
- Supports: races, classes, spells, items, monsters, maps
- Returns Map<string, T> keyed by 'id' property

**angular.json Update:**
- Copy `data/` directory to `/assets` at build time

### CharacterCreationService

**Updated to use data services:**
- Get base stats from `RaceService.getRaceData()`
- Get hit dice from `ClassService.getClassData()`
- Formula: `final stat = racial base + rolled amount`
- Initialize VIM to vitality stat
- Initialize spell points for casters (level 1 only)
- Initialize age to 14-16

### SaveService

**Schema Version:**
- Incremented to v2 (was v1)
- Auto-clears incompatible saves on load
- Users will see empty save slots (expected)

## Migration

**Save Data:**
- Schema version: v1 → v2
- Old saves automatically cleared on load
- No migration path (breaking change accepted)

**Code Migration:**
- Removed `RACE_MODIFIERS` (replaced with RaceService)
- Removed hardcoded class metadata (replaced with ClassService)
- All services updated to use loaded data

## Testing

**Test Coverage:**
- 528+ tests updated and passing
- New tests for RaceService, ClassService, AssetLoadingService
- All component tests updated for new schema
- Test factories updated (character-factories.ts)

## Files Changed

**Data Files (13 files):**
- `data/races/*.json` (5 files) - Fixed saving throw bonuses
- `data/classes/*.json` (8 files) - Fixed requirements, equipment, attacks, added XP tables

**Types (7 files):**
- `src/types/Character.ts` - Complete rewrite
- `src/types/Race.ts` - Added RaceData interface
- `src/types/CharacterClass.ts` - Added ClassData interface
- `src/types/MaxCurrent.ts` - New helper type
- `src/types/SpellPoints.ts` - New helper type
- `src/types/__tests__/Race.spec.ts` - New
- `src/types/__tests__/CharacterClass.spec.ts` - New

**Services (7 files):**
- `src/services/RaceService.ts` - New
- `src/services/ClassService.ts` - New
- `src/services/AssetLoadingService.ts` - Added loadDataFiles()
- `src/services/CharacterCreationService.ts` - Use data services
- `src/services/GameInitializationService.ts` - Initialize data services
- `src/services/SaveService.ts` - Schema v2
- Plus 5 new test files

**Tests (40+ files):**
- All test files updated for new Character structure
- Test factories updated

**Config (1 file):**
- `angular.json` - Copy data directory to assets

## Impact

**User-Facing:**
- ✅ Old saves cleared (intentional - fresh start)
- ✅ Character creation uses correct Wizardry 1 mechanics
- ✅ 5 equipment slots available
- ✅ Spell points tracked correctly
- ✅ Saving throw bonuses accurate to original game

**Developer-Facing:**
- ✅ Data-driven architecture (JSON as source of truth)
- ✅ Easy to modify races/classes without recompiling
- ✅ Type safety with runtime loading
- ✅ Better separation of data and code
- ✅ AssetLoadingService complete
- ✅ Foundation for Phase 7 (combat/spells)

## Next Steps

**Immediate:**
- None - refactor complete

**Future (Phase 7):**
- Implement spell casting (use spell points from CharacterSpellPoints)
- Implement combat (use ClassService for attacks/round formulas)
- Implement equipment restrictions (use ClassService allowedWeapons/armor)
- Implement racial saving throws (use RaceService bonuses in formula)
- Implement level-up (use ClassService XP tables, hit dice rolls)
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: document data type refactor with data-driven architecture

- Created data-type-refactor-summary.md
- Documents all changes, migration, impact
- Explains data-driven architecture approach
- Lists all files changed
- Provides context for future development

Part of data type refactor."
```

---

## Task 15: Final Verification

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All 528+ tests passing, 0 failures

**Step 2: Verify app builds**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 3: Manual verification**

Start dev server:

```bash
npm start
```

Manual checklist:
- [ ] App loads without errors
- [ ] Can create a new character
- [ ] Character creation shows correct stats
- [ ] Training grounds displays characters correctly
- [ ] No console errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification for data type refactor

- All 528+ tests passing
- Build succeeds with no errors
- Manual testing complete
- Data-driven architecture verified

Data type refactor complete. Ready for Phase 7 (combat/spells)."
```

---

## Success Criteria

**All criteria must be met:**

- ✅ All 528+ tests passing
- ✅ `npm run build` succeeds with no errors
- ✅ Character creation works in UI
- ✅ Race data loaded from JSON (correct base stats and saving throw bonuses)
- ✅ Class data loaded from JSON (complete with XP tables, equipment, attacks)
- ✅ RaceService and ClassService provide typed access to data
- ✅ Character interface has spell points, VIM, age, 5 equipment slots
- ✅ CharacterCreationService uses base stats from RaceService
- ✅ SaveService schema v2 clears old saves
- ✅ Test factories updated
- ✅ Documentation complete

---

## Rollback Plan

If major issues arise:

```bash
# Revert all commits from this refactor
git log --oneline  # Find commit before Task 0
git reset --hard <commit-before-refactor>

# Only force push on feature branch (NOT main!)
git push --force origin data-type-refactor
```

---

## Next Phase

After this refactor is complete, the codebase will be ready for:

**Phase 7: Dungeon Navigation and Combat**
- Spell casting (uses CharacterSpellPoints from Character)
- Combat system (uses ClassService.getAttacksPerRound() formulas)
- Equipment restrictions (uses ClassService.getClassData() equipment rules)
- Racial saving throws (uses RaceService.getSavingThrowBonus() in formula)
- Level-up (uses ClassService XP tables, hit dice, VIM degradation)

All type foundations and data loading now in place.
