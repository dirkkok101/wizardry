# Monster System Corrections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical spell resistance bug, implement partner chains and friendly encounters, and audit all 101 monster data files against Apple II source reference.

**Architecture:** TDD approach - fix services first, then extend schema, then update all monster JSON files. Bug fix is blocking, so it comes first. Data audit validates existing monsters before adding new features.

**Tech Stack:** TypeScript, Zod validation, Jest tests, Angular services

---

## Task 1: Fix checkMagicResistance Bug

**Files:**
- Modify: `src/app/services/MonsterResistanceService.ts:145-158`
- Test: `src/app/services/__tests__/MonsterResistanceService.spec.ts`

**Step 1: Write the failing test**

```typescript
// Add to MonsterResistanceService.spec.ts
describe('checkMagicResistance with spellResist field', () => {
  it('uses spellResist field not resistances array', () => {
    // Will O' Wisp has spellResist: 95 but no magic resistance in resistances[]
    const template = {
      id: 'will_o_wisp',
      spellResist: 95,
      resistances: []  // No magic resistance here
    } as MonsterTemplate

    RandomService.queueNextValues([0.5])  // 50% < 95% = should resist

    const result = MonsterResistanceService.checkMagicResistance(template)

    expect(result.resistChance).toBe(95)
    expect(result.resisted).toBe(true)
  })

  it('returns no resistance when spellResist is 0', () => {
    const template = {
      id: 'orc',
      spellResist: 0,
      resistances: []
    } as MonsterTemplate

    const result = MonsterResistanceService.checkMagicResistance(template)

    expect(result.resisted).toBe(false)
    expect(result.resistChance).toBe(0)
  })

  it('returns no resistance when spellResist is undefined', () => {
    const template = {
      id: 'kobold',
      resistances: []
    } as MonsterTemplate

    const result = MonsterResistanceService.checkMagicResistance(template)

    expect(result.resisted).toBe(false)
    expect(result.resistChance).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterResistanceService --testNamePattern="spellResist field"`
Expected: FAIL - current implementation checks resistances array, not spellResist field

**Step 3: Write minimal implementation**

```typescript
// MonsterResistanceService.ts - replace checkMagicResistance method (lines 145-158)
static checkMagicResistance(template: MonsterTemplate): ResistanceResult {
  // Use spellResist field for flat spell resistance percentage
  // NOT resistances[type='magic'] which is for purpose weapons
  const spellResist = template.spellResist ?? 0
  if (spellResist === 0) {
    return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
  }

  const resisted = RandomService.chance(spellResist)
  return {
    resisted,
    damageMultiplier: resisted ? 0 : 1.0,
    resistChance: spellResist,
    reason: resisted ? `Spell resistance (${spellResist}%)` : undefined
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterResistanceService --testNamePattern="spellResist field"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/services/MonsterResistanceService.ts src/app/services/__tests__/MonsterResistanceService.spec.ts
git commit -m "fix: use spellResist field for monster spell resistance

Previously checkMagicResistance() checked resistances[type='magic'] which
is for purpose weapon bonuses. Now correctly reads spellResist field for
flat spell save percentage. Fixes resistance for 17+ monsters including
Will O' Wisp (95%), Greater Demon (95%), Werdna (70%)."
```

---

## Task 2: Fix Paralysis Recovery Formula

**Files:**
- Modify: `src/app/services/MonsterResistanceService.ts:291-321`
- Test: `src/app/services/__tests__/MonsterResistanceService.spec.ts`

**Step 1: Write the failing test**

```typescript
// Add to MonsterResistanceService.spec.ts
describe('rollRecovery paralysis formula', () => {
  it('uses (level * 7)% capped at 50% per Apple II source', () => {
    // Level 5 monster: 5 * 7 = 35% recovery chance
    RandomService.queueNextValues([0.3])  // 30% < 35% = should recover

    const recovered = MonsterResistanceService.rollRecovery(5, 'PARALYZED')

    expect(recovered).toBe(true)
  })

  it('caps paralysis recovery at 50%', () => {
    // Level 10 monster: 10 * 7 = 70% -> capped at 50%
    RandomService.queueNextValues([0.45])  // 45% < 50% = should recover

    const recovered = MonsterResistanceService.rollRecovery(10, 'PARALYZED')

    expect(recovered).toBe(true)
  })

  it('level 10 monster fails recovery at 55%', () => {
    // Level 10: capped at 50%, so 55% roll should fail
    RandomService.queueNextValues([0.55])  // 55% > 50% = should NOT recover

    const recovered = MonsterResistanceService.rollRecovery(10, 'PARALYZED')

    expect(recovered).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterResistanceService --testNamePattern="paralysis formula"`
Expected: FAIL - current formula uses 30 - 3*level which gives wrong results

**Step 3: Write minimal implementation**

```typescript
// MonsterResistanceService.ts - update rollRecovery method (lines 291-321)
static rollRecovery(
  monsterLevel: number,
  statusType: 'ASLEEP' | 'PARALYZED' | 'SILENCED' | 'FEAR'
): boolean {
  let chance: number

  switch (statusType) {
    case 'ASLEEP':
      // Sleep recovery: easier for higher level monsters to wake
      // Per Apple II source: monsters recover quickly from sleep
      chance = Math.min(50 + (monsterLevel * 5), 95)
      break
    case 'PARALYZED':
      // Paralysis recovery: (MonsterLevel × 7)%, maximum 50%
      // Per Apple II source code
      chance = Math.min(monsterLevel * 7, 50)
      break
    case 'SILENCED':
    case 'FEAR':
    default:
      // Other status: moderate recovery
      chance = Math.min(monsterLevel * 5, 50)
      break
  }

  return RandomService.chance(chance)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterResistanceService --testNamePattern="paralysis formula"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/services/MonsterResistanceService.ts src/app/services/__tests__/MonsterResistanceService.spec.ts
git commit -m "fix: correct paralysis recovery formula per Apple II source

Changed from (30 - 3*level) to (level * 7)% capped at 50%.
Higher level monsters now have BETTER recovery chances, matching
original Wizardry 1 behavior."
```

---

## Task 3: Add Partner Schema to MonsterSchema.ts

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts`
- Test: `src/app/validation/__tests__/MonsterSchema.spec.ts`

**Step 1: Write the failing test**

```typescript
// Add to MonsterSchema.spec.ts
describe('partner field validation', () => {
  it('accepts valid partner data', () => {
    const monster = createValidMonster({
      partner: { monsterId: 'kobold', chance: 20 }
    })

    const result = safeValidateMonster(monster)

    expect(result.success).toBe(true)
  })

  it('rejects partner with chance > 100', () => {
    const monster = createValidMonster({
      partner: { monsterId: 'kobold', chance: 150 }
    })

    const result = safeValidateMonster(monster)

    expect(result.success).toBe(false)
  })

  it('rejects partner with chance < 0', () => {
    const monster = createValidMonster({
      partner: { monsterId: 'kobold', chance: -10 }
    })

    const result = safeValidateMonster(monster)

    expect(result.success).toBe(false)
  })

  it('allows monsters without partner field', () => {
    const monster = createValidMonster()
    delete (monster as Record<string, unknown>).partner

    const result = safeValidateMonster(monster)

    expect(result.success).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterSchema --testNamePattern="partner field"`
Expected: FAIL - partner field not in schema

**Step 3: Write minimal implementation**

```typescript
// MonsterSchema.ts - add after line 63 (after LocationSchema)
const PartnerSchema = z.object({
  monsterId: z.string().min(1),  // ID of partner monster to spawn
  chance: z.number().int().min(0).max(100)  // % chance to spawn partner group
})

// Then add to MonsterSchema object (after dropItems, around line 149):
  // Partner chain for encounter generation (per Apple II source)
  partner: PartnerSchema.optional(),
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterSchema --testNamePattern="partner field"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/validation/MonsterSchema.ts src/app/validation/__tests__/MonsterSchema.spec.ts
git commit -m "feat: add partner field to MonsterSchema for encounter chains

Supports monster partner spawning where defeating primary monster
may spawn additional partner groups (e.g., Orc has 20% chance to
spawn Kobolds). Per Apple II Wizardry 1 source code."
```

---

## Task 4: Add Partner Chain Generation to MonsterService

**Files:**
- Modify: `src/app/services/MonsterService.ts`
- Test: `src/app/services/__tests__/MonsterService.spec.ts`

**Step 1: Write the failing test**

```typescript
// Add to MonsterService.spec.ts
describe('generateEncounterWithPartners', () => {
  beforeEach(() => {
    // Mock monster templates with partner chains
    jest.spyOn(MonsterDataLoader, 'getMonster').mockImplementation((id) => {
      const templates: Record<string, MonsterTemplate> = {
        'orc': {
          id: 'orc', name: 'Orc', level: 1,
          numberAppearing: { min: 3, max: 6 },
          hp: { min: 1, max: 4 },
          partner: { monsterId: 'kobold', chance: 100 }  // 100% for test
        } as MonsterTemplate,
        'kobold': {
          id: 'kobold', name: 'Kobold', level: 2,
          numberAppearing: { min: 3, max: 5 },
          hp: { min: 3, max: 7 },
          // No partner - chain ends
        } as MonsterTemplate
      }
      return templates[id]
    })
  })

  it('generates primary group when no partner', () => {
    const groups = MonsterService.generateEncounterWithPartners('kobold')

    expect(groups.length).toBe(1)
    expect(groups[0].monsterId).toBe('kobold')
  })

  it('generates partner groups when chance succeeds', () => {
    RandomService.queueNextValues([0.5])  // For partner chance check (100% = always succeed)

    const groups = MonsterService.generateEncounterWithPartners('orc')

    expect(groups.length).toBe(2)
    expect(groups[0].monsterId).toBe('orc')
    expect(groups[1].monsterId).toBe('kobold')
  })

  it('limits to maximum 4 groups', () => {
    // Set up infinite chain (murphy_ghost -> murphy_ghost)
    jest.spyOn(MonsterDataLoader, 'getMonster').mockReturnValue({
      id: 'murphy_ghost', name: "Murphy's Ghost", level: 10,
      numberAppearing: { min: 1, max: 1 },
      hp: { min: 20, max: 110 },
      partner: { monsterId: 'murphy_ghost', chance: 100 }
    } as MonsterTemplate)

    // Queue enough random values for 10 attempts
    RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])

    const groups = MonsterService.generateEncounterWithPartners('murphy_ghost')

    expect(groups.length).toBeLessThanOrEqual(4)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterService --testNamePattern="generateEncounterWithPartners"`
Expected: FAIL - method doesn't exist

**Step 3: Write minimal implementation**

```typescript
// MonsterService.ts - add new method after generateMonsterGroup
/**
 * Generate encounter with partner chain spawning
 * Per Apple II source: each monster has a % chance to spawn partner groups
 * Chain continues until: partner check fails, max 4 groups, or loop detected
 *
 * @param monsterId - Primary monster ID to start chain
 * @returns Array of MonsterInstance arrays (each array is a group)
 */
static generateEncounterWithPartners(monsterId: string): { monsterId: string; monsters: MonsterInstance[] }[] {
  const groups: { monsterId: string; monsters: MonsterInstance[] }[] = []
  const visited = new Set<string>()  // Prevent infinite loops

  let currentId: string | undefined = monsterId
  while (currentId && groups.length < 4) {
    // Prevent infinite loops (Murphy's Ghost has 80% chance to spawn itself)
    if (visited.has(currentId)) {
      break
    }
    visited.add(currentId)

    const template = MonsterDataLoader.getMonster(currentId)
    if (!template) break

    // Generate this group
    const monsters = this.generateMonsterGroup(currentId)
    groups.push({ monsterId: currentId, monsters })

    // Check for partner spawn
    if (template.partner && RandomService.chance(template.partner.chance)) {
      currentId = template.partner.monsterId
    } else {
      currentId = undefined
    }
  }

  return groups
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterService --testNamePattern="generateEncounterWithPartners"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/services/MonsterService.ts src/app/services/__tests__/MonsterService.spec.ts
git commit -m "feat: add partner chain encounter generation

Implements Apple II Wizardry 1 monster partner spawning system.
Each monster can spawn additional partner groups based on % chance.
Chains are limited to 4 groups max and detect loops to prevent
infinite spawning (Murphy's Ghost → Murphy's Ghost)."
```

---

## Task 5: Add Friendly Encounter Check to EncounterService

**Files:**
- Create: `src/app/services/EncounterService.ts` (if not exists)
- Test: `src/app/services/__tests__/EncounterService.spec.ts`

**Step 1: Write the failing test**

```typescript
// Create or add to EncounterService.spec.ts
import { EncounterService } from '../EncounterService'
import { RandomService } from '../RandomService'

describe('EncounterService', () => {
  describe('checkFriendlyEncounter', () => {
    it('returns false for evil-aligned parties', () => {
      const result = EncounterService.checkFriendlyEncounter('evil', 'dragon')

      expect(result).toBe(false)
    })

    it('returns false for neutral-aligned parties', () => {
      const result = EncounterService.checkFriendlyEncounter('neutral', 'dragon')

      expect(result).toBe(false)
    })

    it('checks 26% chance for dragon class with good party', () => {
      RandomService.queueNextValues([0.2])  // 20% < 26% = friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'dragon')

      expect(result).toBe(true)
    })

    it('checks 11% chance for fighter class with good party', () => {
      RandomService.queueNextValues([0.1])  // 10% < 11% = friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'fighter')

      expect(result).toBe(true)
    })

    it('checks 1% chance for undead class with good party', () => {
      RandomService.queueNextValues([0.005])  // 0.5% < 1% = friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'undead')

      expect(result).toBe(true)
    })

    it('fails friendly check when roll exceeds chance', () => {
      RandomService.queueNextValues([0.5])  // 50% > 26% = not friendly

      const result = EncounterService.checkFriendlyEncounter('good', 'dragon')

      expect(result).toBe(false)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- EncounterService --testNamePattern="checkFriendlyEncounter"`
Expected: FAIL - method doesn't exist

**Step 3: Write minimal implementation**

```typescript
// EncounterService.ts - create or add to existing file
import { RandomService } from './RandomService'

type Alignment = 'good' | 'neutral' | 'evil'
type MonsterClass = 'fighter' | 'mage' | 'priest' | 'thief' | 'giant' | 'mythical' |
  'dragon' | 'animal' | 'were' | 'undead' | 'demon' | 'insect' | 'enchanted'

/**
 * Friendly encounter chances by monster class (per Apple II source)
 * Only Good-aligned parties can encounter friendly monsters
 */
const FRIENDLY_CHANCES: Record<MonsterClass, number> = {
  dragon: 26,
  priest: 16,
  fighter: 11,
  mage: 6,
  thief: 4,
  giant: 1,
  mythical: 1,
  animal: 1,
  were: 1,
  undead: 1,
  demon: 1,
  insect: 1,
  enchanted: 1
}

export class EncounterService {
  /**
   * Check if an encounter should be friendly
   * Per Apple II source: only Good parties can meet friendly monsters
   *
   * @param partyAlignment - Party's alignment (good/neutral/evil)
   * @param monsterClass - Monster's class type
   * @returns true if monsters are friendly
   */
  static checkFriendlyEncounter(
    partyAlignment: Alignment,
    monsterClass: MonsterClass
  ): boolean {
    // Only Good-aligned parties can encounter friendly monsters
    if (partyAlignment !== 'good') {
      return false
    }

    const friendlyChance = FRIENDLY_CHANCES[monsterClass] ?? 1
    return RandomService.chance(friendlyChance)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- EncounterService --testNamePattern="checkFriendlyEncounter"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/services/EncounterService.ts src/app/services/__tests__/EncounterService.spec.ts
git commit -m "feat: add friendly encounter system per Apple II source

Good-aligned parties can encounter friendly monsters based on class:
- Dragon: 26%
- Priest: 16%
- Fighter: 11%
- Mage: 6%
- Thief: 4%
- Others: 1%

Evil and Neutral parties never encounter friendly monsters."
```

---

## Task 6: Clarify Schema Comments

**Files:**
- Modify: `src/app/validation/MonsterSchema.ts:34-45`

**Step 1: No test needed - documentation only**

**Step 2: Update comments**

```typescript
// MonsterSchema.ts - update ResistanceSchema comments (lines 34-45)
const ResistanceSchema = z.object({
  type: z.enum([
    'physical', // Half damage from Lorto, Malikto, Molito, Tiltowait
    'fire',     // Half damage from Litokan, Mahalito, Lahalito
    'cold',     // Half damage from Dalto, Madalto
    'magic',    // Purpose weapon bonus ONLY (e.g., Mage Masher vs mages)
                // NOTE: For flat spell resistance %, use the spellResist field instead
    'poison',   // Resistance to poison status effect
    'drain',    // Resistance to level drain attacks
    'stone'     // Resistance to petrification
  ]),
  value: z.number().int().min(0).max(100)
})
```

**Step 3: Commit**

```bash
git add src/app/validation/MonsterSchema.ts
git commit -m "docs: clarify magic resistance vs spellResist in schema

Added comment clarifying that resistances[type='magic'] is for
purpose weapon bonuses, NOT spell resistance. Spell resistance
should use the spellResist field instead."
```

---

## Task 7: Add Partner Data to First 10 Monsters (Template)

**Files:**
- Modify: `data/monsters/bubbly_slime.json`
- Modify: `data/monsters/orc.json`
- Modify: `data/monsters/kobold.json`
- Modify: `data/monsters/undead_kobold.json`
- Modify: `data/monsters/rogue.json`
- Modify: `data/monsters/bushwacker.json`
- Modify: `data/monsters/highwayman.json`
- Modify: `data/monsters/zombie.json`
- Modify: `data/monsters/creeping_crud.json`
- Modify: `data/monsters/gas_cloud.json`

**Step 1: No test - data update**

**Step 2: Add partner data per Apple II reference**

```json
// bubbly_slime.json - add before closing brace
  "partner": { "monsterId": "orc", "chance": 10 }

// orc.json
  "partner": { "monsterId": "kobold", "chance": 20 }

// kobold.json
  "partner": { "monsterId": "orc", "chance": 15 }

// undead_kobold.json
  "partner": { "monsterId": "kobold", "chance": 10 }

// rogue.json
  "partner": { "monsterId": "orc", "chance": 20 }

// bushwacker.json
  "partner": { "monsterId": "zombie", "chance": 20 }

// highwayman.json
  "partner": { "monsterId": "zombie", "chance": 20 }

// zombie.json
  "partner": { "monsterId": "creeping_crud", "chance": 20 }

// creeping_crud.json
  "partner": { "monsterId": "bubbly_slime", "chance": 24 }

// gas_cloud.json
  "partner": { "monsterId": "bubbly_slime", "chance": 15 }
```

**Step 3: Commit**

```bash
git add data/monsters/bubbly_slime.json data/monsters/orc.json data/monsters/kobold.json \
  data/monsters/undead_kobold.json data/monsters/rogue.json data/monsters/bushwacker.json \
  data/monsters/highwayman.json data/monsters/zombie.json data/monsters/creeping_crud.json \
  data/monsters/gas_cloud.json
git commit -m "feat: add partner chain data to monsters 0-9

Per Apple II source monster partner chains table."
```

---

## Task 8: Add Partner Data to Remaining Monsters

This is a bulk data update task. Apply partner data to all remaining monsters per the Apple II reference "Monster Partner Chains" table.

**Key partner chains to add:**
- Murphy's Ghost (77): 80% Murphy's Ghost (self-referencing!)
- Werdna (96): 100% Vampire Lord
- Vampire Lord (95): 100% Vampire
- Fire Dragon (81): No partner (null)
- Will O' Wisp (78): No partner (null)
- Creeping Coin (12): 100% Creeping Coin (self-referencing!)

**Commit after each batch of ~20 monsters.**

---

## Task 9: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run tests with coverage**

Run: `npm test -- --coverage`
Expected: Coverage remains above 80%

---

## Task 10: Create Monster Data Audit Script (Future)

**Note:** This task creates a validation script to compare all 101 monster JSON files against the Apple II reference. Run separately to generate discrepancy report.

**Files:**
- Create: `scripts/validate-monsters.ts`

This script should:
1. Load reference data (hardcoded from documentation)
2. Load all monster JSON files
3. Compare each field: hp, ac, damage, xp, abilities, resistances
4. Output report of discrepancies

---

## Summary of Changes

| Task | Type | Files Modified |
|------|------|----------------|
| 1 | Bug Fix | MonsterResistanceService.ts |
| 2 | Bug Fix | MonsterResistanceService.ts |
| 3 | Feature | MonsterSchema.ts |
| 4 | Feature | MonsterService.ts |
| 5 | Feature | EncounterService.ts (new) |
| 6 | Docs | MonsterSchema.ts |
| 7-8 | Data | data/monsters/*.json (101 files) |
| 9 | Verify | Run test suite |
| 10 | Tool | scripts/validate-monsters.ts |

**Total estimated commits:** 10-15
