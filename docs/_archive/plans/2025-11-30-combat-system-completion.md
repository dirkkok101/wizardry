# Combat System Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the combat system implementation to match the Wizardry 1 Apple II reference documentation, fixing all formula discrepancies, implementing missing systems, and fixing documented bugs for better UX.

**Architecture:** The combat system uses a pure-function service layer (CombatService) with event-driven round execution. Monster AI selects actions, commands are queued and executed by initiative order, and events are emitted for UI animation. All state updates are immutable.

**Tech Stack:** TypeScript, Angular 19, Jest testing, JSON data files for spells/monsters/items

---

## Task 1: Fix Initiative Formula

**Files:**
- Modify: `src/app/services/CombatService.ts` (calculateInitiative function)
- Test: `src/app/services/__tests__/CombatService.initiative.spec.ts`

**Context:** Reference doc says initiative = 1d10 + Agility table lookup. Current implementation uses `random(1-10) + (AGI-10)/2`. Monsters should use 1d8+1 (range 2-9).

**Step 1: Write failing test for character initiative with agility table**

```typescript
// src/app/services/__tests__/CombatService.initiative.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('CombatService.calculateInitiative', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('character initiative with agility table', () => {
    it('applies +2 modifier for AGI 3 (slower)', () => {
      RandomService.queueNextValues([0.5]) // rolls 5 on 1d10
      const character = { type: 'character', agility: 3 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(7) // 5 + 2 = 7
    })

    it('applies +1 modifier for AGI 4-5', () => {
      RandomService.queueNextValues([0.5])
      const character = { type: 'character', agility: 5 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(6) // 5 + 1 = 6
    })

    it('applies 0 modifier for AGI 6-7', () => {
      RandomService.queueNextValues([0.5])
      const character = { type: 'character', agility: 7 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(5) // 5 + 0 = 5
    })

    it('applies -1 modifier for AGI 8-14', () => {
      RandomService.queueNextValues([0.5])
      const character = { type: 'character', agility: 10 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(4) // 5 - 1 = 4
    })

    it('applies -2 modifier for AGI 15', () => {
      RandomService.queueNextValues([0.5])
      const character = { type: 'character', agility: 15 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(3) // 5 - 2 = 3
    })

    it('applies -5 modifier for AGI 18 (fastest)', () => {
      RandomService.queueNextValues([0.9]) // rolls 9 on 1d10
      const character = { type: 'character', agility: 18 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(4) // 9 - 5 = 4
    })

    it('clamps result to minimum 1', () => {
      RandomService.queueNextValues([0.1]) // rolls 1 on 1d10
      const character = { type: 'character', agility: 18 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(1) // 1 - 5 = -4, clamped to 1
    })

    it('clamps result to maximum 10', () => {
      RandomService.queueNextValues([0.99]) // rolls 10 on 1d10
      const character = { type: 'character', agility: 3 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(10) // 10 + 2 = 12, clamped to 10
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService.initiative --testNamePattern="agility table"`
Expected: FAIL - current formula uses (AGI-10)/2 instead of table lookup

**Step 3: Write failing test for monster initiative (1d8+1)**

```typescript
// Add to same test file
describe('monster initiative', () => {
  it('uses 1d8+1 formula (range 2-9)', () => {
    RandomService.queueNextValues([0.0]) // rolls 1 on 1d8
    const monster = { type: 'monster', level: 5 } as any
    const initiative = CombatService.calculateInitiative(monster)
    expect(initiative).toBe(2) // 1 + 1 = 2
  })

  it('produces maximum of 9', () => {
    RandomService.queueNextValues([0.99]) // rolls 8 on 1d8
    const monster = { type: 'monster', level: 5 } as any
    const initiative = CombatService.calculateInitiative(monster)
    expect(initiative).toBe(9) // 8 + 1 = 9
  })
})
```

**Step 4: Run test to verify it fails**

Run: `npm test -- CombatService.initiative --testNamePattern="monster initiative"`
Expected: FAIL - current implementation doesn't use 1d8+1

**Step 5: Implement agility table and fix initiative calculation**

```typescript
// src/app/services/CombatService.ts
// Add at top of file after imports
const AGILITY_INITIATIVE_TABLE: Record<number, number> = {
  3: 2,   // +2 (slower)
  4: 1, 5: 1,   // +1
  6: 0, 7: 0,   // 0
  8: -1, 9: -1, 10: -1, 11: -1, 12: -1, 13: -1, 14: -1,  // -1
  15: -2,  // -2
  16: -3,  // -3
  17: -4,  // -4
  18: -5,  // -5 (faster)
}

function getAgilityModifier(agility: number): number {
  if (agility <= 3) return 2
  if (agility <= 5) return 1
  if (agility <= 7) return 0
  if (agility <= 14) return -1
  if (agility === 15) return -2
  if (agility === 16) return -3
  if (agility === 17) return -4
  return -5 // 18+
}

// Replace the calculateInitiative function
static calculateInitiative(combatant: Combatant): number {
  if (combatant.type === 'character') {
    const character = combatant as Character
    const baseRoll = RandomService.random(1, 10)
    const agilityMod = getAgilityModifier(character.agility)
    return Math.max(1, Math.min(10, baseRoll + agilityMod))
  } else {
    // Monster: 1d8 + 1 (range 2-9)
    return RandomService.random(1, 8) + 1
  }
}
```

**Step 6: Run all initiative tests to verify they pass**

Run: `npm test -- CombatService.initiative`
Expected: All PASS

**Step 7: Commit**

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.initiative.spec.ts
git commit -m "fix(combat): implement correct initiative formula with agility table

- Characters: 1d10 + agility modifier from lookup table
- Monsters: 1d8+1 (range 2-9)
- Clamp character initiative to 1-10 range
- Matches Apple II reference documentation"
```

---

## Task 2: Execute Multiple Attacks Per Round

**Files:**
- Modify: `src/app/scenes/combat-scene/combat.ts` (executeRound method)
- Test: `src/app/scenes/combat-scene/__tests__/combat.multiattack.spec.ts`

**Context:** Fighter/Lord/Samurai get 1 + floor(level/5) attacks. Ninja gets 2 + floor(level/5). Formula exists in `getAttacksPerRound()` but combat loop only processes 1 attack per command. Need to expand ATTACK commands.

**Step 1: Write failing test for multi-attack expansion**

```typescript
// src/app/scenes/combat-scene/__tests__/combat.multiattack.spec.ts
import { CombatService } from '@services/CombatService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/Character'

describe('Multi-Attack Execution', () => {
  describe('getAttacksPerRound', () => {
    it('Fighter level 1 gets 1 attack', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(1)
    })

    it('Fighter level 5 gets 2 attacks', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 5 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(2)
    })

    it('Fighter level 10 gets 3 attacks', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 10 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
    })

    it('Ninja level 1 gets 2 attacks (base bonus)', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 1 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(2)
    })

    it('Ninja level 5 gets 3 attacks', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 5 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(3)
    })

    it('Mage gets 1 attack regardless of level', () => {
      const mage = createTestCharacter({ class: CharacterClass.MAGE, level: 20 })
      expect(CombatService.getAttacksPerRound(mage)).toBe(1)
    })

    it('caps at 10 attacks maximum', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 50 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(10)
    })
  })
})
```

**Step 2: Run test to verify formula is correct**

Run: `npm test -- combat.multiattack`
Expected: Tests should PASS if formula exists, or FAIL if implementation differs

**Step 3: Write test for attack command expansion in round execution**

```typescript
// Add to same test file
describe('Attack Command Expansion', () => {
  it('expands single ATTACK command into multiple for Fighter level 5', () => {
    const fighter = createTestCharacter({
      id: 'fighter-1',
      class: CharacterClass.FIGHTER,
      level: 5
    })
    const attackCommand = {
      id: 'cmd-1',
      actor: fighter,
      type: 'ATTACK' as const,
      target: { id: 'monster-1' } as any,
      initiative: 5
    }

    const expanded = CombatService.expandAttackCommands([attackCommand])

    expect(expanded.length).toBe(2)
    expect(expanded[0].id).toBe('cmd-1_0')
    expect(expanded[1].id).toBe('cmd-1_1')
    expect(expanded.every(c => c.actor.id === 'fighter-1')).toBe(true)
  })

  it('does not expand PARRY commands', () => {
    const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 10 })
    const parryCommand = {
      id: 'cmd-1',
      actor: fighter,
      type: 'PARRY' as const,
      initiative: 5
    }

    const expanded = CombatService.expandAttackCommands([parryCommand])

    expect(expanded.length).toBe(1)
    expect(expanded[0].id).toBe('cmd-1')
  })

  it('does not expand monster ATTACK commands', () => {
    const monster = { id: 'monster-1', type: 'monster', level: 5 } as any
    const attackCommand = {
      id: 'cmd-1',
      actor: monster,
      type: 'ATTACK' as const,
      target: { id: 'char-1' } as any,
      initiative: 5
    }

    const expanded = CombatService.expandAttackCommands([attackCommand])

    expect(expanded.length).toBe(1) // Monsters always get 1 attack
  })
})
```

**Step 4: Run test to verify it fails**

Run: `npm test -- combat.multiattack --testNamePattern="expands single"`
Expected: FAIL - expandAttackCommands function doesn't exist

**Step 5: Implement expandAttackCommands function**

```typescript
// src/app/services/CombatService.ts
// Add new static method
static expandAttackCommands(commands: CombatCommand[]): CombatCommand[] {
  return commands.flatMap(cmd => {
    // Only expand character ATTACK commands
    if (cmd.type !== 'ATTACK') return [cmd]
    if (!cmd.actor || cmd.actor.type !== 'character') return [cmd]

    const character = cmd.actor as Character
    const attacks = CombatService.getAttacksPerRound(character)

    if (attacks <= 1) return [cmd]

    // Create multiple attack commands with unique IDs
    return Array.from({ length: attacks }, (_, i) => ({
      ...cmd,
      id: `${cmd.id}_${i}`
    }))
  })
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- combat.multiattack`
Expected: All PASS

**Step 7: Update combat scene to use expandAttackCommands**

Find the `executeRound` method in `combat.ts` and locate where commands are passed to CombatService. Add expansion before round execution.

```typescript
// In combat.ts executeRound() method, before calling CombatService.executeRoundWithEvents
// Find the line that creates/collects all commands and add:
const expandedCommands = CombatService.expandAttackCommands(allCommands)
// Then pass expandedCommands instead of allCommands to executeRoundWithEvents
```

**Step 8: Run full test suite**

Run: `npm test`
Expected: All tests PASS

**Step 9: Commit**

```bash
git add src/app/services/CombatService.ts src/app/scenes/combat-scene/combat.ts src/app/scenes/combat-scene/__tests__/combat.multiattack.spec.ts
git commit -m "feat(combat): implement multiple attacks per round for martial classes

- Fighter/Lord/Samurai: 1 + floor(level/5) attacks
- Ninja: 2 + floor(level/5) attacks
- Maximum 10 attacks
- ATTACK commands expanded before round execution
- Each attack rolls separately for hit/damage"
```

---

## Task 3: Implement Monster Spell Tables

**Files:**
- Create: `src/app/config/MonsterSpellTables.ts`
- Test: `src/app/config/__tests__/MonsterSpellTables.spec.ts`

**Context:** Monsters cast from fixed spell tables. Mage spells have A (66%) / B (34%) selection per level. Need tables before AI can use them.

**Step 1: Create monster spell table configuration**

```typescript
// src/app/config/MonsterSpellTables.ts
export interface SpellTableEntry {
  spellA: string  // 66% chance
  spellB: string  // 34% chance
}

/**
 * Monster Mage Spell Table (from Apple II reference)
 * Spell A has 66% chance, Spell B has 34% chance
 */
export const MONSTER_MAGE_SPELL_TABLE: Record<number, SpellTableEntry> = {
  1: { spellA: 'katino', spellB: 'halito' },
  2: { spellA: 'dilto', spellB: 'halito' },
  3: { spellA: 'molito', spellB: 'mahalito' },
  4: { spellA: 'dalto', spellB: 'lahalito' },
  5: { spellA: 'lahalito', spellB: 'madalto' },
  6: { spellA: 'madalto', spellB: 'zilwan' },
  7: { spellA: 'tiltowait', spellB: 'tiltowait' },
}

/**
 * Monster Priest Spell Table (from Apple II reference)
 * Priests always use max level (no degradation)
 * Spell A has 66% chance, Spell B has 34% chance
 */
export const MONSTER_PRIEST_SPELL_TABLE: Record<number, SpellTableEntry> = {
  1: { spellA: 'badios', spellB: 'badios' },
  2: { spellA: 'montino', spellB: 'montino' },
  3: { spellA: 'badios', spellB: 'badial' },
  4: { spellA: 'badial', spellB: 'badial' },
  5: { spellA: 'badialma', spellB: 'badi' },
  6: { spellA: 'lorto', spellB: 'mabadi' },
  7: { spellA: 'mabadi', spellB: 'mabadi' },
}

/**
 * Spell level degradation weights for mage spells
 * After casting, spell level may decrease
 * Index = degradation amount, value = weight
 */
export const MAGE_SPELL_DEGRADATION_WEIGHTS = [
  71.0,    // 0: stay at max level
  20.59,   // -1 level
  5.97,    // -2 levels
  1.73,    // -3 levels
  0.50,    // -4 levels
  0.15,    // -5 levels
  0.06,    // -6 levels
]

/**
 * Select a spell from the monster mage table
 */
export function selectMonsterMageSpell(mageLevel: number, rollSpellChoice: number): string {
  const effectiveLevel = Math.max(1, Math.min(7, mageLevel))
  const entry = MONSTER_MAGE_SPELL_TABLE[effectiveLevel]
  return rollSpellChoice < 0.66 ? entry.spellA : entry.spellB
}

/**
 * Select a spell from the monster priest table
 */
export function selectMonsterPriestSpell(priestLevel: number, rollSpellChoice: number): string {
  const effectiveLevel = Math.max(1, Math.min(7, priestLevel))
  const entry = MONSTER_PRIEST_SPELL_TABLE[effectiveLevel]
  return rollSpellChoice < 0.66 ? entry.spellA : entry.spellB
}

/**
 * Roll for spell level degradation
 * Returns amount to subtract from current spell level
 */
export function rollSpellLevelDegradation(roll: number): number {
  const total = MAGE_SPELL_DEGRADATION_WEIGHTS.reduce((a, b) => a + b, 0)
  let cumulative = 0
  const target = roll * total

  for (let i = 0; i < MAGE_SPELL_DEGRADATION_WEIGHTS.length; i++) {
    cumulative += MAGE_SPELL_DEGRADATION_WEIGHTS[i]
    if (target < cumulative) {
      return i
    }
  }
  return 0
}
```

**Step 2: Write tests for spell tables**

```typescript
// src/app/config/__tests__/MonsterSpellTables.spec.ts
import {
  selectMonsterMageSpell,
  selectMonsterPriestSpell,
  rollSpellLevelDegradation,
  MONSTER_MAGE_SPELL_TABLE,
  MONSTER_PRIEST_SPELL_TABLE
} from '../MonsterSpellTables'

describe('MonsterSpellTables', () => {
  describe('selectMonsterMageSpell', () => {
    it('selects spell A (katino) for level 1 with roll < 0.66', () => {
      expect(selectMonsterMageSpell(1, 0.5)).toBe('katino')
    })

    it('selects spell B (halito) for level 1 with roll >= 0.66', () => {
      expect(selectMonsterMageSpell(1, 0.7)).toBe('halito')
    })

    it('selects tiltowait for level 7 regardless of roll', () => {
      expect(selectMonsterMageSpell(7, 0.1)).toBe('tiltowait')
      expect(selectMonsterMageSpell(7, 0.9)).toBe('tiltowait')
    })

    it('clamps level to 1-7 range', () => {
      expect(selectMonsterMageSpell(0, 0.5)).toBe('katino') // clamped to 1
      expect(selectMonsterMageSpell(10, 0.5)).toBe('tiltowait') // clamped to 7
    })
  })

  describe('selectMonsterPriestSpell', () => {
    it('selects badios for level 1', () => {
      expect(selectMonsterPriestSpell(1, 0.5)).toBe('badios')
      expect(selectMonsterPriestSpell(1, 0.9)).toBe('badios') // both A and B are badios
    })

    it('selects mabadi for level 7', () => {
      expect(selectMonsterPriestSpell(7, 0.5)).toBe('mabadi')
    })
  })

  describe('rollSpellLevelDegradation', () => {
    it('returns 0 for rolls in first 71%', () => {
      expect(rollSpellLevelDegradation(0.0)).toBe(0)
      expect(rollSpellLevelDegradation(0.7)).toBe(0)
    })

    it('returns 1 for rolls in ~71-91% range', () => {
      expect(rollSpellLevelDegradation(0.75)).toBe(1)
    })

    it('returns higher degradation for rare rolls', () => {
      expect(rollSpellLevelDegradation(0.99)).toBeGreaterThan(0)
    })
  })

  describe('spell table completeness', () => {
    it('mage table has all 7 levels', () => {
      for (let level = 1; level <= 7; level++) {
        expect(MONSTER_MAGE_SPELL_TABLE[level]).toBeDefined()
        expect(MONSTER_MAGE_SPELL_TABLE[level].spellA).toBeTruthy()
        expect(MONSTER_MAGE_SPELL_TABLE[level].spellB).toBeTruthy()
      }
    })

    it('priest table has all 7 levels', () => {
      for (let level = 1; level <= 7; level++) {
        expect(MONSTER_PRIEST_SPELL_TABLE[level]).toBeDefined()
        expect(MONSTER_PRIEST_SPELL_TABLE[level].spellA).toBeTruthy()
        expect(MONSTER_PRIEST_SPELL_TABLE[level].spellB).toBeTruthy()
      }
    })
  })
})
```

**Step 3: Run tests**

Run: `npm test -- MonsterSpellTables`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/app/config/MonsterSpellTables.ts src/app/config/__tests__/MonsterSpellTables.spec.ts
git commit -m "feat(combat): add monster spell tables from Apple II reference

- Mage spell table levels 1-7 with A/B selection (66%/34%)
- Priest spell table levels 1-7 with A/B selection
- Spell level degradation weights for mage spells
- Helper functions for spell selection"
```

---

## Task 4: Implement Monster Spell Casting AI

**Files:**
- Modify: `src/app/services/CombatService.ts`
- Test: `src/app/services/__tests__/CombatService.monsterSpells.spec.ts`

**Context:** Monsters with mageLevel/priestLevel should cast spells 75% of the time. Priority: mage spells first, then priest spells, then breath (60%), then melee.

**Step 1: Write failing tests for monster spell casting decision**

```typescript
// src/app/services/__tests__/CombatService.monsterSpells.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('Monster Spell Casting AI', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('selectMonsterAction with spell caster', () => {
    const spellCasterMonster = {
      id: 'monster-1',
      type: 'monster' as const,
      mageLevel: 5,
      priestLevel: 0,
      level: 5,
      hp: 30,
      status: 'ALIVE'
    }

    const party = [
      { id: 'char-1', type: 'character', hp: 20, status: 'OK', position: 'front' }
    ] as any[]

    it('casts mage spell 75% of the time when roll succeeds', () => {
      // Roll for 75% check = success, spell choice roll
      RandomService.queueNextValues([0.5, 0.5])

      const action = CombatService.selectMonsterAction(
        spellCasterMonster as any,
        party,
        party, // front row
        undefined,
        []
      )

      expect(action.type).toBe('CAST_SPELL')
      expect(action.data?.spellId).toBeDefined()
    })

    it('falls back to attack when 75% roll fails', () => {
      // Roll for 75% check = fail (0.8 > 0.75)
      RandomService.queueNextValues([0.8])

      const action = CombatService.selectMonsterAction(
        spellCasterMonster as any,
        party,
        party,
        undefined,
        []
      )

      expect(action.type).toBe('ATTACK')
    })
  })

  describe('mage spell level degradation', () => {
    it('decreases group spell level after casting', () => {
      const monsterGroup = {
        id: 'A',
        monsters: [
          { id: 'm1', mageLevel: 5 },
          { id: 'm2', mageLevel: 5 }
        ],
        currentMageLevel: 5
      }

      // Simulate 1/(groupSize+2) = 1/4 = 25% chance to degrade
      RandomService.queueNextValues([0.1]) // < 0.25, so degrade

      const newGroup = CombatService.applySpellLevelDegradation(monsterGroup as any)

      expect(newGroup.currentMageLevel).toBeLessThan(5)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- CombatService.monsterSpells`
Expected: FAIL - spell casting logic not in selectMonsterAction

**Step 3: Implement monster spell casting in selectMonsterAction**

```typescript
// src/app/services/CombatService.ts
// Add imports at top
import {
  selectMonsterMageSpell,
  selectMonsterPriestSpell,
  rollSpellLevelDegradation
} from '@config/MonsterSpellTables'

// Modify selectMonsterAction to check for spells first
static selectMonsterAction(
  monster: MonsterInstance,
  party: Character[],
  frontRow: Character[],
  monsterGroup?: MonsterGroup,
  allGroups?: MonsterGroup[]
): CombatCommand {
  // Can't act if incapacitated
  if (!CombatService.canCombatantAct(monster)) {
    return CombatService.createCommand(monster, 'PARRY')
  }

  // Check for mage spell casting (75% chance)
  const effectiveMageLevel = monsterGroup?.currentMageLevel ?? monster.mageLevel ?? 0
  if (effectiveMageLevel > 0 && RandomService.chance(75)) {
    const spellId = selectMonsterMageSpell(effectiveMageLevel, RandomService.random01())
    const aliveParty = party.filter(c => c.status === 'OK')
    return CombatService.createCommand(monster, 'CAST_SPELL', aliveParty, { spellId })
  }

  // Check for priest spell casting (75% chance, only if didn't cast mage)
  const priestLevel = monster.priestLevel ?? 0
  if (priestLevel > 0 && RandomService.chance(75)) {
    const spellId = selectMonsterPriestSpell(priestLevel, RandomService.random01())
    const aliveParty = party.filter(c => c.status === 'OK')
    return CombatService.createCommand(monster, 'CAST_SPELL', aliveParty, { spellId })
  }

  // Check for breath weapon (60% chance) - will implement in Task 5
  if (monster.breathType && RandomService.chance(60)) {
    return CombatService.createCommand(monster, 'BREATH', party, { breathType: monster.breathType })
  }

  // Fall back to melee attack
  // ... existing melee attack logic ...
  const target = CombatService.selectMonsterTarget(monster, frontRow.length > 0 ? frontRow : party)
  if (!target) {
    return CombatService.createCommand(monster, 'PARRY')
  }
  return CombatService.createCommand(monster, 'ATTACK', target)
}

// Add spell level degradation function
static applySpellLevelDegradation(group: MonsterGroup): MonsterGroup {
  const aliveCount = group.monsters.filter(m => m.status === 'ALIVE').length
  const degradeChance = 1 / (aliveCount + 2)

  if (RandomService.roll(degradeChance)) {
    const degradeAmount = rollSpellLevelDegradation(RandomService.random01())
    const newLevel = Math.max(1, (group.currentMageLevel ?? group.monsters[0]?.mageLevel ?? 1) - degradeAmount)
    return {
      ...group,
      currentMageLevel: newLevel
    }
  }
  return group
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- CombatService.monsterSpells`
Expected: All PASS

**Step 5: Update MonsterGroup type to include currentMageLevel**

```typescript
// src/app/types/Combat.ts
// Add to MonsterGroup interface:
export interface MonsterGroup {
  id: 'A' | 'B' | 'C' | 'D'
  monsters: MonsterInstance[]
  formation: 'front' | 'back'
  identified: boolean
  currentMageLevel?: number  // Tracks degradation for the group
}
```

**Step 6: Run full test suite**

Run: `npm test`
Expected: All PASS

**Step 7: Commit**

```bash
git add src/app/services/CombatService.ts src/app/types/Combat.ts src/app/services/__tests__/CombatService.monsterSpells.spec.ts
git commit -m "feat(combat): implement monster spell casting AI

- 75% chance to cast mage spell if monster has mageLevel
- 75% chance to cast priest spell if monster has priestLevel
- Spell selection from tables (66% A / 34% B)
- Spell level degradation tracked per group
- 1/(groupSize+2) chance to degrade after casting"
```

---

## Task 5: Implement Breath Weapon System

**Files:**
- Modify: `src/app/services/CombatService.ts`
- Modify: `src/app/services/MonsterResistanceService.ts`
- Test: `src/app/services/__tests__/CombatService.breath.spec.ts`

**Context:** 60% chance to use breath, damage = current HP / 2, multiplicative saves (resistance halves, save halves, both = ~25%).

**Step 1: Write failing tests for breath weapon damage**

```typescript
// src/app/services/__tests__/CombatService.breath.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('Breath Weapon System', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateBreathDamage', () => {
    it('deals half of monster current HP (rounded down)', () => {
      const monster = { hp: 50 } as any
      expect(CombatService.calculateBreathDamage(monster)).toBe(25)
    })

    it('rounds down for odd HP', () => {
      const monster = { hp: 51 } as any
      expect(CombatService.calculateBreathDamage(monster)).toBe(25)
    })

    it('deals 0 for 1 HP monster', () => {
      const monster = { hp: 1 } as any
      expect(CombatService.calculateBreathDamage(monster)).toBe(0)
    })
  })

  describe('applyBreathResistance', () => {
    it('halves damage with elemental resistance (rounded up)', () => {
      const damage = CombatService.applyBreathResistance(40, true, false)
      expect(damage).toBe(20)
    })

    it('halves damage with successful save (rounded up)', () => {
      const damage = CombatService.applyBreathResistance(40, false, true)
      expect(damage).toBe(20)
    })

    it('quarters damage with both resistance and save (~25%)', () => {
      const damage = CombatService.applyBreathResistance(40, true, true)
      expect(damage).toBe(10) // 40 -> 20 -> 10
    })

    it('rounds up after halving (41 -> 21)', () => {
      const damage = CombatService.applyBreathResistance(41, true, false)
      expect(damage).toBe(21) // Math.ceil(41/2)
    })

    it('returns full damage with no protection', () => {
      const damage = CombatService.applyBreathResistance(40, false, false)
      expect(damage).toBe(40)
    })
  })

  describe('executeBreathCommand', () => {
    const breathingMonster = {
      id: 'dragon-1',
      hp: 100,
      breathType: 'fire',
      level: 10
    } as any

    const party = [
      { id: 'char-1', hp: 50, maxHp: 50, status: 'OK' },
      { id: 'char-2', hp: 40, maxHp: 40, status: 'OK' }
    ] as any[]

    it('hits all party members', () => {
      RandomService.queueNextValues([0.9, 0.9]) // both fail saves

      const result = CombatService.executeBreathCommand(
        {} as any, // combat state
        { actor: breathingMonster, target: party } as any,
        new Set(),
        new Map()
      )

      expect(result.characterUpdates.size).toBe(2)
    })

    it('deals 50 damage to each (100 HP / 2)', () => {
      RandomService.queueNextValues([0.9, 0.9]) // both fail saves

      const result = CombatService.executeBreathCommand(
        {} as any,
        { actor: breathingMonster, target: party } as any,
        new Set(),
        new Map()
      )

      const char1Update = result.characterUpdates.get('char-1')
      expect(char1Update?.hp).toBe(0) // 50 - 50 = 0
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- CombatService.breath`
Expected: FAIL - breath methods don't exist

**Step 3: Implement breath weapon methods**

```typescript
// src/app/services/CombatService.ts

static calculateBreathDamage(monster: MonsterInstance): number {
  return Math.floor(monster.hp / 2)
}

static applyBreathResistance(
  baseDamage: number,
  hasElementalResistance: boolean,
  madeSave: boolean
): number {
  let damage = baseDamage

  // Multiplicative reduction - each halves independently (rounded up)
  if (hasElementalResistance) {
    damage = Math.ceil(damage / 2)
  }
  if (madeSave) {
    damage = Math.ceil(damage / 2)
  }

  return damage
}

static executeBreathCommand(
  state: CombatState,
  command: CombatCommand,
  parryingCombatants: Set<string>,
  existingCharacterUpdates: Map<string, Character>
): CommandExecutionResult {
  const monster = command.actor as MonsterInstance
  const targets = command.target as Character[]
  const breathType = monster.breathType || 'fire'
  const baseDamage = CombatService.calculateBreathDamage(monster)

  const messages: string[] = []
  const characterUpdates = new Map(existingCharacterUpdates)

  messages.push(`${monster.name} breathes ${breathType}!`)

  for (const target of targets) {
    if (target.status !== 'OK') continue

    const currentChar = characterUpdates.get(target.id) || target

    // Check elemental resistance from equipment
    const hasResistance = CharacterResistanceService.hasElementalResistance(
      currentChar,
      breathType
    )

    // Roll save vs breath
    const madeSave = CharacterResistanceService.rollSaveVsBreath(currentChar)

    // Calculate final damage
    const finalDamage = CombatService.applyBreathResistance(
      baseDamage,
      hasResistance,
      madeSave
    )

    const newHp = Math.max(0, currentChar.hp - finalDamage)
    const newStatus = newHp <= 0 ? 'DEAD' : currentChar.status

    characterUpdates.set(target.id, {
      ...currentChar,
      hp: newHp,
      status: newStatus
    })

    let damageMsg = `→ ${target.name} takes ${finalDamage} damage`
    if (hasResistance && madeSave) {
      damageMsg += ' (resisted & saved!)'
    } else if (hasResistance) {
      damageMsg += ' (resisted)'
    } else if (madeSave) {
      damageMsg += ' (saved)'
    }
    messages.push(damageMsg)

    if (newHp <= 0) {
      messages.push(`→ ${target.name} is slain!`)
    }
  }

  return {
    state,
    messages,
    characterUpdates
  }
}
```

**Step 4: Add BREATH to CombatActionType**

```typescript
// src/app/types/Combat.ts
export type CombatActionType =
  | 'ATTACK'
  | 'CAST_SPELL'
  | 'USE_ITEM'
  | 'PARRY'
  | 'RUN'
  | 'DISPEL'
  | 'ADVANCE'
  | 'BREATH'  // Add this
```

**Step 5: Add breathType to MonsterInstance**

```typescript
// src/app/types/Combat.ts
export interface MonsterInstance {
  // ... existing fields
  breathType?: 'fire' | 'cold' | 'poison' | 'stone' | 'drain'
}
```

**Step 6: Update executeCommand to handle BREATH**

```typescript
// In CombatService.executeCommand switch statement, add:
case 'BREATH':
  return CombatService.executeBreathCommand(state, command, parryingCombatants, existingCharacterUpdates)
```

**Step 7: Run tests**

Run: `npm test -- CombatService.breath`
Expected: All PASS

**Step 8: Run full test suite**

Run: `npm test`
Expected: All PASS

**Step 9: Commit**

```bash
git add src/app/services/CombatService.ts src/app/types/Combat.ts src/app/services/__tests__/CombatService.breath.spec.ts
git commit -m "feat(combat): implement breath weapon system

- Damage = monster current HP / 2 (rounded down)
- Elemental resistance halves damage (rounded up)
- Successful save halves damage (rounded up)
- Both resistance + save = ~25% damage (multiplicative)
- Breath hits all party members"
```

---

## Task 6: Fix Flee Formula

**Files:**
- Modify: `src/app/services/CombatService.ts`
- Test: `src/app/services/__tests__/CombatService.flee.spec.ts`

**Context:** Reference: 39% - (MazeLevel × 3%) + small party bonus + demoralization. Level 10 = 0%.

**Step 1: Write failing tests for correct flee formula**

```typescript
// src/app/services/__tests__/CombatService.flee.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('Flee System (Reference Formula)', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateFleeChance', () => {
    const createState = (mazeLevel: number) => ({
      mazeLevel
    }) as any

    it('base chance is 39% minus 3% per maze level', () => {
      // Level 1: 39% - 3% = 36%
      expect(CombatService.calculateFleeChance(createState(1), [], [], [])).toBe(36)
      // Level 5: 39% - 15% = 24%
      expect(CombatService.calculateFleeChance(createState(5), [], [], [])).toBe(24)
    })

    it('adds small party bonus for 3 or fewer members', () => {
      const state = createState(1) // base 36%
      const oneChar = [{ id: '1' }] as any[]
      const twoChars = [{ id: '1' }, { id: '2' }] as any[]
      const threeChars = [{ id: '1' }, { id: '2' }, { id: '3' }] as any[]

      // 1 member: +15% (20 - 5*1)
      expect(CombatService.calculateFleeChance(state, oneChar, [], [])).toBe(51)
      // 2 members: +10% (20 - 5*2)
      expect(CombatService.calculateFleeChance(state, twoChars, [], [])).toBe(46)
      // 3 members: +5% (20 - 5*3)
      expect(CombatService.calculateFleeChance(state, threeChars, [], [])).toBe(41)
    })

    it('no bonus for 4+ party members', () => {
      const state = createState(1)
      const fourChars = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] as any[]
      expect(CombatService.calculateFleeChance(state, fourChars, [], [])).toBe(36)
    })

    it('adds 20% if monsters are demoralized', () => {
      const state = createState(1)
      const party = [{ id: '1', level: 10 }] as any[] // high level party
      const monsters = [{ id: 'm1', level: 1, status: 'ALIVE' }] as any[] // low level monster

      // Demoralized: party level sum > monster level sum
      const chance = CombatService.calculateFleeChance(state, party, [], monsters)
      expect(chance).toBeGreaterThan(36 + 15) // base + small party + demoralization
    })

    it('returns 0% on maze level 10 (never works)', () => {
      const state = createState(10)
      expect(CombatService.calculateFleeChance(state, [], [], [])).toBe(0)
    })

    it('clamps result to 0-95% range', () => {
      // Edge cases
      const lowLevel = createState(1)
      const highLevel = createState(20)

      expect(CombatService.calculateFleeChance(lowLevel, [{ id: '1' }] as any[], [], [])).toBeLessThanOrEqual(95)
      expect(CombatService.calculateFleeChance(highLevel, [], [], [])).toBeGreaterThanOrEqual(0)
    })
  })

  describe('demoralization check', () => {
    it('monsters are demoralized when party level sum > monster morale sum', () => {
      const party = [
        { level: 5 },
        { level: 5 }
      ] as any[] // total: 10

      const monsters = [
        { level: 3, status: 'ALIVE' },
        { level: 3, status: 'ALIVE' }
      ] as any[] // total: 6

      expect(CombatService.areMonstersDemoralized(party, monsters)).toBe(true)
    })

    it('monsters not demoralized when morale >= party level', () => {
      const party = [{ level: 5 }] as any[] // total: 5
      const monsters = [
        { level: 3, status: 'ALIVE' },
        { level: 3, status: 'ALIVE' }
      ] as any[] // total: 6

      expect(CombatService.areMonstersDemoralized(party, monsters)).toBe(false)
    })

    it('only counts ALIVE monsters for morale', () => {
      const party = [{ level: 5 }] as any[]
      const monsters = [
        { level: 10, status: 'DEAD' },
        { level: 2, status: 'ALIVE' }
      ] as any[]

      // Only alive monster level 2 vs party level 5
      expect(CombatService.areMonstersDemoralized(party, monsters)).toBe(true)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- CombatService.flee --testNamePattern="Reference Formula"`
Expected: FAIL - current implementation uses different formula

**Step 3: Implement correct flee formula**

```typescript
// src/app/services/CombatService.ts

static areMonstersDemoralized(party: Character[], monsters: MonsterInstance[]): boolean {
  const partyLevelSum = party.reduce((sum, c) => sum + c.level, 0)
  const monsterMoraleSum = monsters
    .filter(m => m.status === 'ALIVE')
    .reduce((sum, m) => sum + m.level, 0)
  return partyLevelSum > monsterMoraleSum
}

static calculateFleeChance(
  state: CombatState,
  party: Character[],
  fleeingCharacters: Character[],
  monsters: MonsterInstance[]
): number {
  const mazeLevel = state.mazeLevel ?? 1

  // Level 10: NEVER works
  if (mazeLevel === 10) return 0

  // Base chance: 39% - (mazeLevel * 3%)
  let chance = 39 - (mazeLevel * 3)

  // Small party bonus: if 3 or fewer, add (20 - partySize * 5)%
  const partySize = party.length
  if (partySize <= 3) {
    chance += 20 - (partySize * 5)
  }

  // Demoralization bonus: +20% if monsters are demoralized
  if (CombatService.areMonstersDemoralized(party, monsters)) {
    chance += 20
  }

  // Clamp to 0-95%
  return Math.max(0, Math.min(95, chance))
}
```

**Step 4: Run tests**

Run: `npm test -- CombatService.flee`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.flee.spec.ts
git commit -m "fix(combat): implement correct flee formula from reference

- Base: 39% - (mazeLevel × 3%)
- Small party bonus: +20% - (partySize × 5%) for 3 or fewer
- Demoralization bonus: +20% if party level > monster morale
- Level 10: 0% (never works)
- Clamped to 0-95% range"
```

---

## Task 7: Implement DispellService

**Files:**
- Create: `src/app/services/DispellService.ts`
- Test: `src/app/services/__tests__/DispellService.spec.ts`

**Context:** Formula: (50 + 5×casterLevel) - (10×monsterLevel) - classPenalty. Priest: 0%, Bishop: -20%, Lord: -40%. Fix original bug: allow dispel on any status.

**Step 1: Create DispellService with tests**

```typescript
// src/app/services/__tests__/DispellService.spec.ts
import { DispellService } from '../DispellService'
import { RandomService } from '../RandomService'
import { CharacterClass } from '@models/Character'

describe('DispellService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateDispellChance', () => {
    it('base formula: 50 + 5*casterLevel - 10*monsterLevel', () => {
      const priest = { class: CharacterClass.PRIEST, level: 10 } as any
      const undead = { level: 5 } as any

      // 50 + 50 - 50 = 50%
      expect(DispellService.calculateDispellChance(priest, undead)).toBe(50)
    })

    it('Priest has no penalty', () => {
      const priest = { class: CharacterClass.PRIEST, level: 5 } as any
      const undead = { level: 3 } as any

      // 50 + 25 - 30 = 45%
      expect(DispellService.calculateDispellChance(priest, undead)).toBe(45)
    })

    it('Bishop has -20% penalty', () => {
      const bishop = { class: CharacterClass.BISHOP, level: 5 } as any
      const undead = { level: 3 } as any

      // 50 + 25 - 30 - 20 = 25%
      expect(DispellService.calculateDispellChance(bishop, undead)).toBe(25)
    })

    it('Lord has -40% penalty', () => {
      const lord = { class: CharacterClass.LORD, level: 5 } as any
      const undead = { level: 3 } as any

      // 50 + 25 - 30 - 40 = 5%
      expect(DispellService.calculateDispellChance(lord, undead)).toBe(5)
    })

    it('clamps result to 0-100%', () => {
      const priest = { class: CharacterClass.PRIEST, level: 1 } as any
      const strongUndead = { level: 15 } as any

      // 50 + 5 - 150 = -95, clamped to 0
      expect(DispellService.calculateDispellChance(priest, strongUndead)).toBe(0)
    })
  })

  describe('canDispell', () => {
    it('Priest can dispell from level 1', () => {
      const priest = { class: CharacterClass.PRIEST, level: 1 } as any
      expect(DispellService.canDispell(priest)).toBe(true)
    })

    it('Bishop can dispell from level 4', () => {
      const bishop3 = { class: CharacterClass.BISHOP, level: 3 } as any
      const bishop4 = { class: CharacterClass.BISHOP, level: 4 } as any

      expect(DispellService.canDispell(bishop3)).toBe(false)
      expect(DispellService.canDispell(bishop4)).toBe(true)
    })

    it('Lord can dispell from level 9', () => {
      const lord8 = { class: CharacterClass.LORD, level: 8 } as any
      const lord9 = { class: CharacterClass.LORD, level: 9 } as any

      expect(DispellService.canDispell(lord8)).toBe(false)
      expect(DispellService.canDispell(lord9)).toBe(true)
    })

    it('other classes cannot dispell', () => {
      const fighter = { class: CharacterClass.FIGHTER, level: 20 } as any
      expect(DispellService.canDispell(fighter)).toBe(false)
    })
  })

  describe('attemptDispell', () => {
    it('dispells undead when roll succeeds', () => {
      const priest = { class: CharacterClass.PRIEST, level: 10 } as any
      const undead = { level: 5, undead: true, status: 'ALIVE' } as any

      RandomService.queueNextValues([0.3]) // 30% < 50% chance = success

      const result = DispellService.attemptDispell(priest, undead)
      expect(result.success).toBe(true)
    })

    it('fails when roll exceeds chance', () => {
      const priest = { class: CharacterClass.PRIEST, level: 5 } as any
      const undead = { level: 5, undead: true } as any

      RandomService.queueNextValues([0.9]) // 90% > 25% chance = fail

      const result = DispellService.attemptDispell(priest, undead)
      expect(result.success).toBe(false)
    })

    it('works on any status (bug fix: not just OK)', () => {
      const priest = { class: CharacterClass.PRIEST, level: 10 } as any
      const sleepingUndead = { level: 3, undead: true, status: 'ASLEEP' } as any

      RandomService.queueNextValues([0.1])

      const result = DispellService.attemptDispell(priest, sleepingUndead)
      expect(result.success).toBe(true) // Fixed: original only worked on OK
    })

    it('fails on non-undead', () => {
      const priest = { class: CharacterClass.PRIEST, level: 20 } as any
      const living = { level: 1, undead: false } as any

      const result = DispellService.attemptDispell(priest, living)
      expect(result.success).toBe(false)
      expect(result.reason).toBe('not_undead')
    })
  })
})
```

**Step 2: Create DispellService implementation**

```typescript
// src/app/services/DispellService.ts
import { Character, CharacterClass } from '@models/Character'
import { MonsterInstance } from '@models/Combat'
import { RandomService } from './RandomService'

export interface DispellResult {
  success: boolean
  reason?: 'not_undead' | 'roll_failed' | 'cannot_dispell'
}

const CLASS_PENALTIES: Partial<Record<CharacterClass, number>> = {
  [CharacterClass.PRIEST]: 0,
  [CharacterClass.BISHOP]: -20,
  [CharacterClass.LORD]: -40,
}

const CLASS_MIN_LEVELS: Partial<Record<CharacterClass, number>> = {
  [CharacterClass.PRIEST]: 1,
  [CharacterClass.BISHOP]: 4,
  [CharacterClass.LORD]: 9,
}

export class DispellService {
  static canDispell(character: Character): boolean {
    const minLevel = CLASS_MIN_LEVELS[character.class]
    if (minLevel === undefined) return false
    return character.level >= minLevel
  }

  static calculateDispellChance(caster: Character, monster: MonsterInstance): number {
    const baseChance = 50 + (5 * caster.level) - (10 * monster.level)
    const penalty = CLASS_PENALTIES[caster.class] ?? 0
    return Math.max(0, Math.min(100, baseChance + penalty))
  }

  static attemptDispell(caster: Character, monster: MonsterInstance): DispellResult {
    if (!DispellService.canDispell(caster)) {
      return { success: false, reason: 'cannot_dispell' }
    }

    if (!monster.undead) {
      return { success: false, reason: 'not_undead' }
    }

    // Fixed: Allow dispell on any status (original bug only allowed OK)
    const chance = DispellService.calculateDispellChance(caster, monster)
    const roll = RandomService.random(1, 100)

    if (roll <= chance) {
      return { success: true }
    }

    return { success: false, reason: 'roll_failed' }
  }

  static dispellGroup(
    caster: Character,
    monsters: MonsterInstance[]
  ): { dispelled: MonsterInstance[], messages: string[] } {
    const dispelled: MonsterInstance[] = []
    const messages: string[] = []

    messages.push(`${caster.name} attempts to turn undead!`)

    for (const monster of monsters) {
      const result = DispellService.attemptDispell(caster, monster)

      if (result.success) {
        dispelled.push(monster)
        messages.push(`→ ${monster.name} is dispelled!`)
      } else if (result.reason === 'not_undead') {
        messages.push(`→ ${monster.name} is not undead!`)
      } else {
        messages.push(`→ ${monster.name} resists!`)
      }
    }

    return { dispelled, messages }
  }
}
```

**Step 3: Run tests**

Run: `npm test -- DispellService`
Expected: All PASS

**Step 4: Integrate with CombatService.executeDispelCommand**

```typescript
// In CombatService.ts, update executeDispelCommand to use DispellService
import { DispellService } from './DispellService'

static executeDispelCommand(
  state: CombatState,
  command: CombatCommand,
  parryingCombatants: Set<string>,
  existingCharacterUpdates: Map<string, Character>
): CommandExecutionResult {
  const caster = command.actor as Character
  const targetGroup = state.monsterGroups.find(g => g.id === command.targetGroupId)

  if (!targetGroup) {
    return {
      state,
      messages: [`${caster.name} has no target to dispell!`],
      characterUpdates: existingCharacterUpdates
    }
  }

  const { dispelled, messages } = DispellService.dispellGroup(
    caster,
    targetGroup.monsters.filter(m => m.status === 'ALIVE')
  )

  // Remove dispelled monsters from group
  let newState = state
  if (dispelled.length > 0) {
    const newMonsters = targetGroup.monsters.map(m =>
      dispelled.find(d => d.id === m.id)
        ? { ...m, status: 'DEAD' as const, hp: 0 }
        : m
    )

    newState = {
      ...state,
      monsterGroups: state.monsterGroups.map(g =>
        g.id === targetGroup.id
          ? { ...g, monsters: newMonsters }
          : g
      )
    }
  }

  return {
    state: newState,
    messages,
    characterUpdates: existingCharacterUpdates
  }
}
```

**Step 5: Run full test suite**

Run: `npm test`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/app/services/DispellService.ts src/app/services/__tests__/DispellService.spec.ts src/app/services/CombatService.ts
git commit -m "feat(combat): implement DispellService for turn undead

- Formula: (50 + 5×level) - (10×monsterLevel) - classPenalty
- Priest: no penalty, available level 1
- Bishop: -20% penalty, available level 4
- Lord: -40% penalty, available level 9
- Bug fix: works on any status (not just OK)
- Dispelled monsters grant no XP"
```

---

## Task 8: Fix Status Recovery Bugs

**Files:**
- Modify: `src/app/services/CombatService.ts`
- Modify: `data/spells/manifo.json`
- Test: `src/app/services/__tests__/CombatService.statusRecovery.spec.ts`

**Context:** Fix MANIFO (use PARALYZED not ASLEEP), add character recovery for PARALYZED/SILENCED (original bugs fixed for UX).

**Step 1: Verify and fix MANIFO spell data**

```bash
# Check current manifo.json
cat data/spells/manifo.json
```

**Step 2: Update MANIFO to inflict PARALYZED**

```json
// data/spells/manifo.json - ensure effect is PARALYZED not ASLEEP
{
  "id": "manifo",
  "name": "MANIFO",
  "description": "Paralyzes a group of monsters",
  "level": 2,
  "type": "priest",
  "mpCost": 1,
  "target": "enemy_group",
  "effect": {
    "type": "status",
    "status": "PARALYZED",
    "resistanceFormula": "50 + monster.level * 10"
  }
}
```

**Step 3: Write tests for character status recovery (bug fixes)**

```typescript
// Add to CombatService.statusRecovery.spec.ts
describe('Character Status Recovery (Bug Fixes)', () => {
  describe('PARALYZED recovery', () => {
    it('characters can recover from PARALYZED (bug fix)', () => {
      const character = {
        id: 'char-1',
        level: 5,
        status: 'PARALYZED'
      } as any

      // 7% per level, max 50% = 35% for level 5
      RandomService.queueNextValues([0.2]) // 20% < 35% = recovery

      const recovered = CombatService.processCharacterStatusRecovery(character)
      expect(recovered.status).toBe('OK')
    })

    it('uses (level × 7)% chance, max 50%', () => {
      const highLevelChar = { level: 10, status: 'PARALYZED' } as any

      // Level 10 = 70%, capped to 50%
      RandomService.queueNextValues([0.45]) // 45% < 50% = recovery

      const recovered = CombatService.processCharacterStatusRecovery(highLevelChar)
      expect(recovered.status).toBe('OK')
    })
  })

  describe('SILENCED recovery', () => {
    it('characters can recover from SILENCED (bug fix)', () => {
      const character = {
        id: 'char-1',
        level: 5,
        status: 'OK' // status stored differently
      } as any
      const state = {
        statusEffects: new Map([['char-1', new Set(['SILENCED'])]])
      } as any

      // 10% per level, max 50% = 50% for level 5
      RandomService.queueNextValues([0.3]) // 30% < 50% = recovery

      const newState = CombatService.processCharacterCombatStatusRecovery(state, character)
      expect(newState.statusEffects.get('char-1')?.has('SILENCED')).toBe(false)
    })
  })
})
```

**Step 4: Implement character status recovery**

```typescript
// src/app/services/CombatService.ts

static processCharacterStatusRecovery(character: Character): Character {
  // ASLEEP: (level × 10)%, max 50%
  if (character.status === 'ASLEEP') {
    const chance = Math.min(character.level * 10, 50)
    if (RandomService.chance(chance)) {
      return { ...character, status: 'OK' }
    }
  }

  // AFRAID: (level × 5)%, max 50%
  if (character.status === 'AFRAID') {
    const chance = Math.min(character.level * 5, 50)
    if (RandomService.chance(chance)) {
      return { ...character, status: 'OK' }
    }
  }

  // PARALYZED: (level × 7)%, max 50% - BUG FIX: original had no recovery
  if (character.status === 'PARALYZED') {
    const chance = Math.min(character.level * 7, 50)
    if (RandomService.chance(chance)) {
      return { ...character, status: 'OK' }
    }
  }

  return character
}

static processCharacterCombatStatusRecovery(
  state: CombatState,
  character: Character
): CombatState {
  const effects = state.statusEffects.get(character.id)
  if (!effects || effects.size === 0) return state

  const newEffects = new Set(effects)

  // SILENCED: (level × 10)%, max 50% - BUG FIX: original never recovered
  if (effects.has('SILENCED')) {
    const chance = Math.min(character.level * 10, 50)
    if (RandomService.chance(chance)) {
      newEffects.delete('SILENCED')
    }
  }

  // BLIND: (level × 10)%, max 50%
  if (effects.has('BLIND')) {
    const chance = Math.min(character.level * 10, 50)
    if (RandomService.chance(chance)) {
      newEffects.delete('BLIND')
    }
  }

  return {
    ...state,
    statusEffects: new Map(state.statusEffects).set(character.id, newEffects)
  }
}
```

**Step 5: Run tests**

Run: `npm test -- CombatService.statusRecovery`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/app/services/CombatService.ts data/spells/manifo.json src/app/services/__tests__/CombatService.statusRecovery.spec.ts
git commit -m "fix(combat): fix status effect bugs for better UX

- MANIFO: now inflicts PARALYZED as intended (not ASLEEP)
- Character PARALYZED: add (level×7)% recovery, max 50%
- Character SILENCED: add (level×10)% recovery, max 50%
- All bug fixes improve UX over original Apple II behavior"
```

---

## Task 9: Verify Spell Data (TILTOWAIT)

**Files:**
- Modify: `data/spells/tiltowait.json`
- Test: Manual verification

**Step 1: Check and fix TILTOWAIT damage**

```bash
# View current tiltowait.json
cat data/spells/tiltowait.json
```

**Step 2: Update to 10d15 if incorrect**

```json
// data/spells/tiltowait.json
{
  "id": "tiltowait",
  "name": "TILTOWAIT",
  "description": "Nuclear explosion damages all enemies",
  "level": 7,
  "type": "mage",
  "mpCost": 1,
  "target": "all_enemies",
  "effect": {
    "type": "damage",
    "dice": "10d15",
    "damageType": "force"
  }
}
```

**Step 3: Commit if changes made**

```bash
git add data/spells/tiltowait.json
git commit -m "fix(data): correct TILTOWAIT to 10d15 per Apple II source

Manual says 10d10 but actual code uses 10d15 (10-150 damage range)"
```

---

## Task 10: Implement Item Protection System

**Files:**
- Create: `src/app/services/ItemProtectionService.ts`
- Test: `src/app/services/__tests__/ItemProtectionService.spec.ts`

**Context:** Class protection: 50% nullify attacks from specific monster types. Purposed weapons: double damage vs types.

**Step 1: Create ItemProtectionService**

```typescript
// src/app/services/ItemProtectionService.ts
import { Character } from '@models/Character'
import { MonsterInstance } from '@models/Combat'
import { RandomService } from './RandomService'

export type MonsterType = 'DRAGON' | 'WERE' | 'MAGE' | 'UNDEAD' | 'DEMON' | 'GIANT' | 'MYTHICAL' | 'ANIMAL' | 'INSECT' | 'ENCHANTED'

interface ProtectionItem {
  id: string
  protectsAgainst: MonsterType[]
}

interface PurposedWeapon {
  id: string
  doubleDamageVs: MonsterType[]
}

const CLASS_PROTECTION_ITEMS: ProtectionItem[] = [
  { id: 'dragon_slayer', protectsAgainst: ['DRAGON'] },
  { id: 'were_slayer', protectsAgainst: ['WERE'] },
  { id: 'mage_masher', protectsAgainst: ['MAGE'] },
  { id: 'ring_pro_undead', protectsAgainst: ['UNDEAD'] },
]

const PURPOSED_WEAPONS: PurposedWeapon[] = [
  { id: 'dragon_slayer', doubleDamageVs: ['DRAGON'] },
  { id: 'were_slayer', doubleDamageVs: ['WERE'] },
  { id: 'mage_masher', doubleDamageVs: ['MAGE'] },
]

export class ItemProtectionService {
  /**
   * Check if equipped item nullifies attack (50% chance)
   */
  static checkClassProtection(character: Character, monster: MonsterInstance): boolean {
    const equippedItems = character.equipment || []

    for (const item of CLASS_PROTECTION_ITEMS) {
      if (equippedItems.some(e => e.id === item.id)) {
        if (item.protectsAgainst.includes(monster.type as MonsterType)) {
          // 50% chance to nullify
          return RandomService.chance(50)
        }
      }
    }

    return false
  }

  /**
   * Check if weapon deals double damage against monster type
   */
  static checkPurposedWeapon(character: Character, monster: MonsterInstance): boolean {
    const weapon = character.equipment?.find(e => e.slot === 'weapon')
    if (!weapon) return false

    const purposed = PURPOSED_WEAPONS.find(w => w.id === weapon.id)
    if (!purposed) return false

    return purposed.doubleDamageVs.includes(monster.type as MonsterType)
  }

  /**
   * Check physical protection (immune to paralysis + critical hits)
   */
  static hasPhysicalProtection(character: Character): boolean {
    const equippedItems = character.equipment || []
    return equippedItems.some(e => e.resistances?.includes('PHYSICAL'))
  }

  /**
   * Check magic protection (blocks spells targeting you)
   */
  static hasMagicProtection(character: Character): boolean {
    const equippedItems = character.equipment || []
    return equippedItems.some(e => e.resistances?.includes('MAGIC'))
  }
}
```

**Step 2: Write tests**

```typescript
// src/app/services/__tests__/ItemProtectionService.spec.ts
import { ItemProtectionService } from '../ItemProtectionService'
import { RandomService } from '../RandomService'

describe('ItemProtectionService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('checkClassProtection', () => {
    it('dragon slayer gives 50% chance to nullify dragon attacks', () => {
      const character = {
        equipment: [{ id: 'dragon_slayer', slot: 'weapon' }]
      } as any
      const dragon = { type: 'DRAGON' } as any

      RandomService.queueNextValues([0.3]) // 30% < 50% = nullify
      expect(ItemProtectionService.checkClassProtection(character, dragon)).toBe(true)

      RandomService.queueNextValues([0.7]) // 70% > 50% = no nullify
      expect(ItemProtectionService.checkClassProtection(character, dragon)).toBe(false)
    })

    it('returns false for non-matching monster type', () => {
      const character = {
        equipment: [{ id: 'dragon_slayer', slot: 'weapon' }]
      } as any
      const goblin = { type: 'MYTHICAL' } as any

      expect(ItemProtectionService.checkClassProtection(character, goblin)).toBe(false)
    })
  })

  describe('checkPurposedWeapon', () => {
    it('dragon slayer deals double damage to dragons', () => {
      const character = {
        equipment: [{ id: 'dragon_slayer', slot: 'weapon' }]
      } as any
      const dragon = { type: 'DRAGON' } as any

      expect(ItemProtectionService.checkPurposedWeapon(character, dragon)).toBe(true)
    })

    it('returns false for non-purposed weapon', () => {
      const character = {
        equipment: [{ id: 'long_sword', slot: 'weapon' }]
      } as any
      const dragon = { type: 'DRAGON' } as any

      expect(ItemProtectionService.checkPurposedWeapon(character, dragon)).toBe(false)
    })
  })

  describe('hasPhysicalProtection', () => {
    it('returns true if equipped item has PHYSICAL resistance', () => {
      const character = {
        equipment: [{ id: 'garb_of_lords', resistances: ['PHYSICAL'] }]
      } as any

      expect(ItemProtectionService.hasPhysicalProtection(character)).toBe(true)
    })
  })
})
```

**Step 3: Integrate into CombatService.resolveAttack**

```typescript
// In CombatService.resolveAttack, add before hit calculation:
// Check class protection (50% nullify)
if (defender.type === 'character') {
  if (ItemProtectionService.checkClassProtection(defender as Character, attacker as MonsterInstance)) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      messages: [`${defender.name}'s equipment deflects the attack!`]
    }
  }
}

// And for damage calculation:
// Check purposed weapon (double damage)
if (attacker.type === 'character') {
  if (ItemProtectionService.checkPurposedWeapon(attacker as Character, defender as MonsterInstance)) {
    damage *= 2
    messages.push('Double damage!')
  }
}
```

**Step 4: Run tests**

Run: `npm test -- ItemProtectionService`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/app/services/ItemProtectionService.ts src/app/services/__tests__/ItemProtectionService.spec.ts src/app/services/CombatService.ts
git commit -m "feat(combat): implement item protection system

- Class protection: 50% nullify attacks from specific monster types
- Purposed weapons: double damage vs specific types
- Physical protection: immune to paralysis + critical hits
- Magic protection: blocks spells targeting you"
```

---

## Task 11: Monster Call for Help

**Files:**
- Modify: `src/app/services/CombatService.ts`
- Test: `src/app/services/__tests__/CombatService.callForHelp.spec.ts`

**Context:** 75% call if group < 5 monsters, (level×5)% success rate.

**Step 1: Write tests**

```typescript
// src/app/services/__tests__/CombatService.callForHelp.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('Monster Call for Help', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('checkCallForHelp', () => {
    const callerMonster = {
      id: 'monster-1',
      abilities: ['CALL'],
      level: 10
    } as any

    it('75% chance to attempt call when group has < 5 monsters', () => {
      RandomService.queueNextValues([0.5, 0.1]) // 50% < 75% = call, 10% < 50% = success

      const group = { monsters: [callerMonster, {}, {}] } as any // 3 monsters

      const result = CombatService.checkCallForHelp(callerMonster, group)
      expect(result.attempted).toBe(true)
    })

    it('does not call when group has >= 5 monsters', () => {
      const group = { monsters: [{}, {}, {}, {}, {}] } as any // 5 monsters

      const result = CombatService.checkCallForHelp(callerMonster, group)
      expect(result.attempted).toBe(false)
    })

    it('success rate is (level × 5)%', () => {
      // Level 10 = 50% success
      RandomService.queueNextValues([0.5, 0.3]) // call succeeds, 30% < 50% = help arrives

      const group = { monsters: [callerMonster] } as any
      const result = CombatService.checkCallForHelp(callerMonster, group)

      expect(result.success).toBe(true)
    })

    it('monster without CALL ability cannot call', () => {
      const nonCaller = { id: 'monster-1', abilities: [], level: 10 } as any
      const group = { monsters: [nonCaller] } as any

      const result = CombatService.checkCallForHelp(nonCaller, group)
      expect(result.attempted).toBe(false)
    })
  })
})
```

**Step 2: Implement call for help**

```typescript
// src/app/services/CombatService.ts

interface CallForHelpResult {
  attempted: boolean
  success: boolean
  messages: string[]
}

static checkCallForHelp(
  monster: MonsterInstance,
  group: MonsterGroup
): CallForHelpResult {
  // Must have CALL ability
  if (!monster.abilities?.includes('CALL')) {
    return { attempted: false, success: false, messages: [] }
  }

  // Only call if group has fewer than 5 monsters
  const aliveCount = group.monsters.filter(m => m.status === 'ALIVE').length
  if (aliveCount >= 5) {
    return { attempted: false, success: false, messages: [] }
  }

  // 75% chance to attempt call
  if (!RandomService.chance(75)) {
    return { attempted: false, success: false, messages: [] }
  }

  const messages = [`${monster.name} calls for help!`]

  // (Level × 5)% success rate
  const successChance = monster.level * 5
  if (RandomService.chance(successChance)) {
    messages.push('→ Reinforcements arrive!')
    return { attempted: true, success: true, messages }
  }

  messages.push('→ No one answers...')
  return { attempted: true, success: false, messages }
}
```

**Step 3: Run tests**

Run: `npm test -- CombatService.callForHelp`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.callForHelp.spec.ts
git commit -m "feat(combat): implement monster call for help

- 75% chance to attempt when group < 5 monsters
- (level × 5)% success rate
- Requires CALL ability
- Spawns reinforcements on success"
```

---

## Task 12: Demoralization & Monster Flee

**Files:**
- Modify: `src/app/services/CombatService.ts`
- Test: `src/app/services/__tests__/CombatService.demoralization.spec.ts`

**Context:** Monsters demoralized when party level > monster morale. 65% flee chance if demoralized + has RUN ability.

**Step 1: Write tests**

```typescript
// src/app/services/__tests__/CombatService.demoralization.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('Demoralization & Monster Flee', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('checkMonsterFlee', () => {
    it('monster with RUN ability has 65% flee chance when demoralized', () => {
      const runnerMonster = {
        id: 'monster-1',
        abilities: ['RUN'],
        level: 3,
        status: 'ALIVE'
      } as any
      const party = [{ level: 10 }] as any[] // party stronger
      const monsters = [runnerMonster] as any[] // weak monster

      RandomService.queueNextValues([0.5]) // 50% < 65% = flee

      const result = CombatService.checkMonsterFlee(runnerMonster, party, monsters)
      expect(result.fled).toBe(true)
    })

    it('monster without RUN ability does not flee', () => {
      const nonRunner = {
        id: 'monster-1',
        abilities: [],
        level: 3,
        status: 'ALIVE'
      } as any
      const party = [{ level: 10 }] as any[]
      const monsters = [nonRunner] as any[]

      const result = CombatService.checkMonsterFlee(nonRunner, party, monsters)
      expect(result.fled).toBe(false)
    })

    it('monster does not flee when not demoralized', () => {
      const runnerMonster = {
        id: 'monster-1',
        abilities: ['RUN'],
        level: 15, // high level
        status: 'ALIVE'
      } as any
      const party = [{ level: 5 }] as any[] // party weaker
      const monsters = [runnerMonster] as any[]

      const result = CombatService.checkMonsterFlee(runnerMonster, party, monsters)
      expect(result.fled).toBe(false)
    })
  })
})
```

**Step 2: Implement monster flee check**

```typescript
// src/app/services/CombatService.ts

interface MonsterFleeResult {
  fled: boolean
  messages: string[]
}

static checkMonsterFlee(
  monster: MonsterInstance,
  party: Character[],
  allMonsters: MonsterInstance[]
): MonsterFleeResult {
  // Must have RUN ability
  if (!monster.abilities?.includes('RUN')) {
    return { fled: false, messages: [] }
  }

  // Must be demoralized
  if (!CombatService.areMonstersDemoralized(party, allMonsters)) {
    return { fled: false, messages: [] }
  }

  // 65% flee chance when demoralized
  if (RandomService.chance(65)) {
    return {
      fled: true,
      messages: [`${monster.name} flees in terror!`]
    }
  }

  return { fled: false, messages: [] }
}
```

**Step 3: Run tests**

Run: `npm test -- CombatService.demoralization`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.demoralization.spec.ts
git commit -m "feat(combat): implement monster demoralization and flee

- Monsters demoralized when party level sum > monster morale sum
- 65% flee chance for demoralized monsters with RUN ability
- Fled monsters grant no XP"
```

---

## Task 13: Naked Ninja AC Bonus

**Files:**
- Modify: `src/app/services/CharacterService.ts` or relevant AC calculation
- Test: `src/app/services/__tests__/CharacterService.ac.spec.ts`

**Context:** Naked Ninja AC = 8 - (Level/3). Only applies if not wearing armor.

**Step 1: Write tests**

```typescript
// In CharacterService.ac.spec.ts
describe('Naked Ninja AC', () => {
  it('unarmored ninja gets AC 8 - (level/3)', () => {
    const ninja = createTestCharacter({
      class: CharacterClass.NINJA,
      level: 9,
      equipment: [] // no armor
    })

    // 8 - (9/3) = 8 - 3 = 5
    expect(CharacterService.calculateAC(ninja)).toBe(5)
  })

  it('armored ninja uses armor AC instead', () => {
    const ninja = createTestCharacter({
      class: CharacterClass.NINJA,
      level: 9,
      equipment: [{ slot: 'armor', acBonus: -5 }] // AC 5 armor
    })

    // Uses armor, not naked bonus (armor = 5, naked would be 5 too)
    expect(CharacterService.calculateAC(ninja)).toBe(5)
  })

  it('other classes do not get naked bonus', () => {
    const fighter = createTestCharacter({
      class: CharacterClass.FIGHTER,
      level: 9,
      equipment: []
    })

    // Base AC 10, no bonus
    expect(CharacterService.calculateAC(fighter)).toBe(10)
  })
})
```

**Step 2: Implement naked ninja AC**

```typescript
// In CharacterService.ts or ACService.ts
static calculateNakedNinjaAC(level: number): number {
  return 8 - Math.floor(level / 3)
}

static calculateAC(character: Character): number {
  const baseAC = 10
  let ac = baseAC

  // Check if wearing armor
  const hasArmor = character.equipment?.some(e => e.slot === 'armor')

  if (!hasArmor && character.class === CharacterClass.NINJA) {
    // Naked ninja bonus
    ac = CharacterService.calculateNakedNinjaAC(character.level)
  } else {
    // Normal AC from equipment
    for (const item of character.equipment || []) {
      ac += item.acBonus || 0
    }
  }

  return ac
}
```

**Step 3: Run tests**

Run: `npm test -- CharacterService.ac`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/app/services/CharacterService.ts src/app/services/__tests__/CharacterService.ac.spec.ts
git commit -m "feat(character): implement naked ninja AC bonus

- Unarmored ninja: AC = 8 - (level/3)
- Level 21 needed to match Evil Plate +3 (AC -1)
- Bonus does not apply if wearing armor"
```

---

## Task 14: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS

**Step 2: Check coverage**

```bash
npm test -- --coverage
```

Expected: >80% coverage on CombatService

**Step 3: Commit final state**

```bash
git add -A
git commit -m "test: verify all combat system tests pass

Coverage:
- CombatService: >80%
- DispellService: >90%
- ItemProtectionService: >90%
- All formula tests passing"
```

---

## Summary

This plan implements all identified gaps from the combat system validation:

1. **Initiative Formula** - Fixed to use agility table and 1d8+1 for monsters
2. **Multiple Attacks** - Expanded in combat loop for martial classes
3. **Monster Spell Tables** - Full 7-level mage/priest implementation
4. **Monster Spell AI** - 75% cast chance with level degradation
5. **Breath Weapons** - 60% chance, HP/2 damage, multiplicative saves
6. **Flee Formula** - Correct reference formula with level 10 block
7. **DispellService** - Full turn undead with class penalties
8. **Status Bug Fixes** - MANIFO, MONTINO, character recovery
9. **Spell Data** - TILTOWAIT 10d15 verified
10. **Item Protection** - Class protection and purposed weapons
11. **Call for Help** - Monster reinforcement system
12. **Demoralization** - Monster flee mechanics
13. **Naked Ninja AC** - Unarmored AC bonus

Total: ~24 hours of implementation work in 14 bite-sized tasks.

---

**Plan complete and saved to `docs/plans/2025-11-30-combat-system-completion.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
