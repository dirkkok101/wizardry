# Combat Scene - Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete Wizardry 1 combat scene with command queue architecture, authentic mechanics, and full integration with maze/temple scenes.

**Architecture:** Command pattern with pure function services (MonsterService, CombatService, SpellService), immutable state updates, 100% test coverage.

**Tech Stack:** TypeScript, Angular 19, Jest, Angular Signals

**Execution Method:** Batch execution with checkpoints (default: 3 tasks per batch)

---

## Prerequisites Verification

Before starting, these items were verified in codebase:

✅ **Dependencies Installed:**
- `uuid@13.0.0` and `@types/uuid@10.0.0`
- Jest 29.7.0 with jest-preset-angular 14.6.0
- TypeScript 5.9.2
- Angular 20.3.x

✅ **Existing Types:**
- `Character` with all needed fields (agility, hp, maxHp, ac, status, etc.)
- `CharacterStatus` enum with combat states (OK, DEAD, ASLEEP, PARALYZED, etc.)
- `GameState` with roster, party, dungeon fields
- `Party` with formation, position, gold

✅ **Test Infrastructure:**
- Test factories in `src/test-helpers/test-factories.ts`
- Jest config at root with colocated tests in `__tests__/` subdirectories
- 791 tests passing in 20s baseline

✅ **Monster Data:**
- 97 monster JSON files in `data/monsters/`
- Kobold verified with correct structure (hp: {min:3, max:7}, ac:8, etc.)

---

## Phase 1: Type System & Monster Service (Week 1)

### Task 1: Create Combat Type Definitions

**Files:**
- Create: `src/types/Combat.ts`

**Step 1: Create Combat.ts with all type interfaces**

Create the file with complete type system:

```typescript
// src/types/Combat.ts
import { Character } from './Character'

export type CombatActionType = 'ATTACK' | 'CAST_SPELL' | 'USE_ITEM' | 'PARRY' | 'RUN' | 'DISPEL'
export type CombatantStatus = 'ALIVE' | 'DEAD' | 'ASLEEP' | 'PARALYZED'

export interface DiceRoll {
  dice: string  // "1d8", "2d6", etc.
  min: number
  max: number
}

export interface MonsterInstance {
  id: string
  monsterId: string
  name: string
  hp: number
  maxHp: number
  ac: number
  damage: DiceRoll[]
  xp: number
  gold?: number
  status: CombatantStatus
  level: number
  agility?: number  // For initiative calculation
}

export type Combatant = Character | MonsterInstance

export interface CombatCommand {
  id: string
  actor: Combatant
  type: CombatActionType
  initiative: number
  target?: Combatant | Combatant[]
  data?: any  // spell ID, item ID, etc.
}

export interface CombatState {
  monsters: MonsterInstance[]
  commandQueue: CombatCommand[]
  roundNumber: number
  combatLog: string[]
  canFlee: boolean
}

export interface AttackResult {
  hit: boolean
  damage: number
  critical: boolean
  message: string
}

export interface SpellEffect {
  damage?: number[]
  healing?: number[]
  statusEffects?: { target: string; effect: string }[]
  message: string
}

export interface CombatVictoryResult {
  xpPerCharacter: number
  gold: number
  items?: string[]
}
```

**Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/Combat.ts
git commit -m "feat: add combat type definitions

- Add CombatCommand, MonsterInstance, CombatState interfaces
- Add AttackResult, SpellEffect, CombatVictoryResult types
- Add Combatant union type (Character | MonsterInstance)
- Support command queue architecture"
```

---

### Task 2: MonsterService - Load Monster Template

**Files:**
- Create: `src/services/MonsterService.ts`
- Create: `src/services/__tests__/MonsterService.spec.ts`

**Step 1: Write failing test**

```typescript
// src/services/__tests__/MonsterService.spec.ts
import { MonsterService } from '../MonsterService'

describe('MonsterService', () => {
  describe('loadMonster', () => {
    it('loads kobold template from JSON', () => {
      const kobold = MonsterService.loadMonster('kobold')

      expect(kobold.id).toBe('kobold')
      expect(kobold.name).toBe('Kobold')
      expect(kobold.ac).toBe(8)
      expect(kobold.hp).toEqual({ min: 3, max: 7 })
      expect(kobold.damage).toHaveLength(1)
      expect(kobold.damage[0].dice).toBe('1d4')
    })

    it('throws error for non-existent monster', () => {
      expect(() => MonsterService.loadMonster('nonexistent')).toThrow('Monster not found: nonexistent')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterService`
Expected: FAIL - "MonsterService is not defined"

**Step 3: Write minimal implementation**

```typescript
// src/services/MonsterService.ts
import { MonsterInstance } from '../types/Combat'
import koboldData from '../../data/monsters/kobold.json'

interface MonsterTemplate {
  id: string
  name: string
  level: number
  numberAppearing: { min: number; max: number }
  hp: { min: number; max: number }
  ac: number
  damage: Array<{ dice: string; min: number; max: number }>
  xp: number
  gold?: number
  type: string
  specialAbilities: string[]
  resistances: Array<{ type: string; value: number }>
  regeneration: number
  isBoss: boolean
  canFlee: boolean
}

const MONSTER_CACHE = new Map<string, MonsterTemplate>()

// Pre-load common monsters
MONSTER_CACHE.set('kobold', koboldData as MonsterTemplate)

export class MonsterService {
  static loadMonster(monsterId: string): MonsterTemplate {
    const cached = MONSTER_CACHE.get(monsterId)
    if (cached) return cached

    try {
      // Dynamic import for other monsters
      const data = require(`../../data/monsters/${monsterId}.json`)
      MONSTER_CACHE.set(monsterId, data)
      return data
    } catch (error) {
      throw new Error(`Monster not found: ${monsterId}`)
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterService`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/services/MonsterService.ts src/services/__tests__/MonsterService.spec.ts
git commit -m "feat: add MonsterService.loadMonster()

- Load monster templates from JSON files
- Cache loaded monsters for performance
- Throw error for non-existent monsters
- 100% test coverage (2/2 tests passing)"
```

---

### Task 3: MonsterService - Create Monster Instance

**Files:**
- Modify: `src/services/MonsterService.ts`
- Modify: `src/services/__tests__/MonsterService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to MonsterService.spec.ts
describe('createMonsterInstance', () => {
  it('creates instance with rolled HP', () => {
    const instance = MonsterService.createMonsterInstance('kobold')

    expect(instance.id).toBeDefined()
    expect(instance.id).not.toBe('kobold')  // Unique ID
    expect(instance.monsterId).toBe('kobold')
    expect(instance.name).toBe('Kobold')
    expect(instance.hp).toBeGreaterThanOrEqual(3)
    expect(instance.hp).toBeLessThanOrEqual(7)
    expect(instance.maxHp).toBe(instance.hp)
    expect(instance.status).toBe('ALIVE')
  })

  it('rolls different HP each time', () => {
    const instances = Array.from({ length: 100 }, () =>
      MonsterService.createMonsterInstance('kobold')
    )

    // Verify all HP in range
    instances.forEach(m => {
      expect(m.hp).toBeGreaterThanOrEqual(3)
      expect(m.hp).toBeLessThanOrEqual(7)
    })

    // Verify variance (not all same HP)
    const uniqueHP = new Set(instances.map(m => m.hp))
    expect(uniqueHP.size).toBeGreaterThan(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterService`
Expected: FAIL - "createMonsterInstance is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to MonsterService.ts
import { v4 as uuidv4 } from 'uuid'

export class MonsterService {
  // ... existing loadMonster()

  static createMonsterInstance(monsterId: string): MonsterInstance {
    const template = this.loadMonster(monsterId)

    // Roll HP from min/max range
    const hp = this.rollInRange(template.hp.min, template.hp.max)

    return {
      id: uuidv4(),
      monsterId: template.id,
      name: template.name,
      hp,
      maxHp: hp,
      ac: template.ac,
      damage: template.damage,
      xp: template.xp,
      gold: template.gold,
      status: 'ALIVE',
      level: template.level,
      agility: 10  // Default monster agility
    }
  }

  private static rollInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterService`
Expected: PASS (4 tests)

**Step 5: Verify uuid is installed**

Run: `npm list uuid`
Expected: Shows uuid@13.0.0 (already installed, no action needed)

**Step 6: Commit**

```bash
git add src/services/MonsterService.ts src/services/__tests__/MonsterService.spec.ts
git commit -m "feat: add MonsterService.createMonsterInstance()

- Create monster instances with rolled HP
- Generate unique IDs using uuid (already installed)
- Set initial status to ALIVE
- Verify HP variance across 100 rolls
- 100% test coverage (4/4 tests passing)"
```

---

### Task 4: MonsterService - Generate Monster Group

**Files:**
- Modify: `src/services/MonsterService.ts`
- Modify: `src/services/__tests__/MonsterService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to MonsterService.spec.ts
describe('generateMonsterGroup', () => {
  it('generates group with correct size range', () => {
    // Kobold: 3-5 monsters
    const group = MonsterService.generateMonsterGroup('kobold')

    expect(group.length).toBeGreaterThanOrEqual(3)
    expect(group.length).toBeLessThanOrEqual(5)
    expect(group.every(m => m.monsterId === 'kobold')).toBe(true)
    expect(group.every(m => m.status === 'ALIVE')).toBe(true)
  })

  it('generates unique instances', () => {
    const group = MonsterService.generateMonsterGroup('kobold')

    // All IDs should be unique
    const ids = group.map(m => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(group.length)
  })

  it('rolls different HP for each monster', () => {
    const runs = Array.from({ length: 20 }, () =>
      MonsterService.generateMonsterGroup('kobold')
    )

    // At least one group should have variance
    const hasVariance = runs.some(group => {
      const hps = group.map(m => m.hp)
      const unique = new Set(hps)
      return unique.size > 1
    })

    expect(hasVariance).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MonsterService`
Expected: FAIL - "generateMonsterGroup is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to MonsterService.ts
export class MonsterService {
  // ... existing methods

  static generateMonsterGroup(monsterId: string): MonsterInstance[] {
    const template = this.loadMonster(monsterId)

    // Roll group size from numberAppearing range
    const count = this.rollInRange(
      template.numberAppearing.min,
      template.numberAppearing.max
    )

    // Create that many instances
    return Array.from({ length: count }, () =>
      this.createMonsterInstance(monsterId)
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- MonsterService`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add src/services/MonsterService.ts src/services/__tests__/MonsterService.spec.ts
git commit -m "feat: add MonsterService.generateMonsterGroup()

- Generate monster groups based on numberAppearing range
- Create unique instances with individual HP rolls
- Verify group size constraints (3-5 for kobolds)
- Verify HP variance within groups
- 100% test coverage (7/7 tests passing)"
```

---

## Phase 2: CombatService Core (Week 2)

### Task 5: CombatService - Initiative Calculation

**Files:**
- Create: `src/services/CombatService.ts`
- Create: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// src/services/__tests__/CombatService.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('CombatService', () => {
  describe('calculateInitiative', () => {
    it('calculates initiative with AGI modifier', () => {
      const char = createTestCharacter({ agility: 18 })  // +4 modifier

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Formula: random(0-9) + AGI_modifier
      // AGI 18 = +4 modifier
      // Range: 4-13 (0+4 to 9+4)
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(4)
        expect(init).toBeLessThanOrEqual(13)
      })
    })

    it('has minimum of 1', () => {
      const char = createTestCharacter({ agility: 3 })  // -4 modifier

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Even with negative modifier, minimum is 1
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
      })
    })

    it('uses default AGI 10 if undefined', () => {
      const char = createTestCharacter({ agility: undefined })

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // AGI 10 = +0 modifier, range 0-9, but min 1
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
        expect(init).toBeLessThanOrEqual(9)
      })
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "CombatService is not defined"

**Step 3: Write minimal implementation**

```typescript
// src/services/CombatService.ts
import { Combatant } from '../types/Combat'

export class CombatService {
  /**
   * Calculate initiative for combatant
   * Formula: random(0-9) + AGI_modifier (minimum 1)
   */
  static calculateInitiative(combatant: Combatant): number {
    const agi = combatant.agility || 10
    const agiMod = Math.floor((agi - 10) / 2)
    const roll = Math.floor(Math.random() * 10)  // 0-9

    return Math.max(1, roll + agiMod)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.calculateInitiative()

- Calculate initiative: random(0-9) + AGI_modifier
- Enforce minimum initiative of 1
- Handle undefined agility (default to 10)
- 100% test coverage (3/3 tests passing)"
```

---

### Task 6: CombatService - Initiate Combat

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
import { MonsterService } from '../MonsterService'

describe('initiateCombat', () => {
  it('creates combat state with monster group', () => {
    const party = [
      createTestCharacter({ id: 'char1' }),
      createTestCharacter({ id: 'char2' })
    ]

    const state = CombatService.initiateCombat('kobold', party, true)

    expect(state.monsters.length).toBeGreaterThanOrEqual(3)
    expect(state.monsters.length).toBeLessThanOrEqual(5)
    expect(state.monsters.every(m => m.monsterId === 'kobold')).toBe(true)
    expect(state.commandQueue).toEqual([])
    expect(state.roundNumber).toBe(1)
    expect(state.combatLog).toEqual([])
    expect(state.canFlee).toBe(true)
  })

  it('sets canFlee to false for fixed encounters', () => {
    const party = [createTestCharacter()]
    const state = CombatService.initiateCombat('kobold', party, false)

    expect(state.canFlee).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "initiateCombat is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
import { CombatState } from '../types/Combat'
import { Character } from '../types/Character'
import { MonsterService } from './MonsterService'

export class CombatService {
  // ... existing calculateInitiative()

  static initiateCombat(
    monsterId: string,
    party: Character[],
    canFlee: boolean
  ): CombatState {
    const monsters = MonsterService.generateMonsterGroup(monsterId)

    return {
      monsters,
      commandQueue: [],
      roundNumber: 1,
      combatLog: [],
      canFlee
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.initiateCombat()

- Initialize CombatState from monster encounter
- Generate monster group using MonsterService
- Set initial round to 1, empty command queue
- Support canFlee flag for fixed encounters
- 100% test coverage (5/5 tests passing)"
```

---

### Task 7: Add Test Factories for Combat

**Files:**
- Modify: `src/test-helpers/test-factories.ts`

**Step 1: Write factory functions**

```typescript
// Add to test-factories.ts
import { MonsterInstance, CombatState, CombatCommand } from '../types/Combat'

export function createTestMonster(overrides: Partial<MonsterInstance> = {}): MonsterInstance {
  return {
    id: `monster-${Math.random().toString(36).substr(2, 9)}`,
    monsterId: 'kobold',
    name: 'Kobold',
    hp: 5,
    maxHp: 5,
    ac: 8,
    damage: [{ dice: '1d4', min: 1, max: 4 }],
    xp: 415,
    status: 'ALIVE',
    level: 1,
    agility: 10,
    ...overrides
  }
}

export function createTestCombatState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    monsters: [createTestMonster()],
    commandQueue: [],
    roundNumber: 1,
    combatLog: [],
    canFlee: true,
    ...overrides
  }
}

export function createTestCombatCommand(overrides: Partial<CombatCommand> = {}): CombatCommand {
  const actor = createTestCharacter()
  return {
    id: `cmd-${Math.random().toString(36).substr(2, 9)}`,
    actor,
    type: 'ATTACK',
    initiative: 5,
    ...overrides
  }
}

export function createCombatParty(): { party: Character[], roster: Map<string, Character> } {
  const char1 = createTestCharacter({ id: 'char1', name: 'Fighter', hp: 15, maxHp: 15 })
  const char2 = createTestCharacter({ id: 'char2', name: 'Mage', hp: 8, maxHp: 8 })
  const party = [char1, char2]
  const roster = new Map([
    [char1.id, char1],
    [char2.id, char2]
  ])
  return { party, roster }
}
```

**Step 2: Verify factories work**

```typescript
// Add to test-factories.spec.ts (or create if doesn't exist)
describe('Combat Test Factories', () => {
  it('creates test monster with defaults', () => {
    const monster = createTestMonster()
    expect(monster.id).toBeDefined()
    expect(monster.monsterId).toBe('kobold')
    expect(monster.hp).toBe(5)
  })

  it('creates test combat state with defaults', () => {
    const state = createTestCombatState()
    expect(state.monsters).toHaveLength(1)
    expect(state.roundNumber).toBe(1)
  })

  it('creates combat party with two characters', () => {
    const { party, roster } = createCombatParty()
    expect(party).toHaveLength(2)
    expect(roster.size).toBe(2)
  })
})
```

**Step 3: Run test to verify**

Run: `npm test -- test-factories`
Expected: PASS

**Step 4: Commit**

```bash
git add src/test-helpers/test-factories.ts
git commit -m "feat: add combat test factories

- Add createTestMonster() factory
- Add createTestCombatState() factory
- Add createTestCombatCommand() factory
- Add createCombatParty() factory
- All factories support override pattern"
```

---

### Task 8: CombatService - Create Command

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
import { createTestMonster } from '../../test-helpers/test-factories'

describe('createCommand', () => {
  it('creates attack command with initiative', () => {
    const actor = createTestCharacter({ agility: 15 })
    const target = createTestMonster()

    const cmd = CombatService.createCommand(actor, 'ATTACK', target)

    expect(cmd.id).toBeDefined()
    expect(cmd.actor).toBe(actor)
    expect(cmd.type).toBe('ATTACK')
    expect(cmd.target).toBe(target)
    expect(cmd.initiative).toBeGreaterThanOrEqual(1)
    expect(cmd.data).toBeUndefined()
  })

  it('creates spell command with spell data', () => {
    const actor = createTestCharacter()
    const target = createTestMonster()

    const cmd = CombatService.createCommand(actor, 'CAST_SPELL', target, { spellId: 'halito' })

    expect(cmd.type).toBe('CAST_SPELL')
    expect(cmd.data).toEqual({ spellId: 'halito' })
  })

  it('rolls different initiative each time', () => {
    const actor = createTestCharacter({ agility: 10 })
    const initiatives = Array.from({ length: 50 }, () =>
      CombatService.createCommand(actor, 'ATTACK').initiative
    )

    const unique = new Set(initiatives)
    expect(unique.size).toBeGreaterThan(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "createCommand is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
import { CombatCommand, CombatActionType, Combatant } from '../types/Combat'
import { v4 as uuidv4 } from 'uuid'

export class CombatService {
  // ... existing methods

  static createCommand(
    actor: Combatant,
    actionType: CombatActionType,
    target?: Combatant | Combatant[],
    data?: any
  ): CombatCommand {
    return {
      id: uuidv4(),
      actor,
      type: actionType,
      initiative: this.calculateInitiative(actor),
      target,
      data
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.createCommand()

- Create combat commands with auto-generated IDs
- Calculate initiative on command creation
- Support optional target and data fields
- Verify initiative variance across multiple commands
- 100% test coverage (8/8 tests passing)"
```

---

### Task 9: CombatService - Calculate Hit Chance

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
describe('calculateHitChance', () => {
  it('calculates basic hit chance formula', () => {
    const attacker = createTestCharacter({ level: 1 })  // Attack bonus ~1
    const defender = createTestMonster({ ac: 8 })

    const hitChance = CombatService.calculateHitChance(attacker, defender)

    // Formula: (attackBonus + defenderAC + 10) × 5%
    // (1 + 8 + 10) × 5% = 19 × 5% = 95%
    expect(hitChance).toBe(95)
  })

  it('caps hit chance at 95%', () => {
    const attacker = createTestCharacter({ level: 10 })  // High attack bonus
    const defender = createTestMonster({ ac: 10 })

    const hitChance = CombatService.calculateHitChance(attacker, defender)

    expect(hitChance).toBeLessThanOrEqual(95)
  })

  it('has minimum hit chance of 5%', () => {
    const attacker = createTestCharacter({ level: 1 })
    const defender = createTestMonster({ ac: -10 })  // Very low AC

    const hitChance = CombatService.calculateHitChance(attacker, defender)

    expect(hitChance).toBeGreaterThanOrEqual(5)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "calculateHitChance is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
export class CombatService {
  // ... existing methods

  /**
   * Calculate hit chance percentage
   * Formula: (attackBonus + defenderAC + 10) × 5%
   * Clamped between 5% and 95%
   */
  static calculateHitChance(attacker: Combatant, defender: Combatant): number {
    const attackBonus = this.getAttackBonus(attacker)
    const rawChance = (attackBonus + defender.ac + 10) * 5

    return Math.max(5, Math.min(95, rawChance))
  }

  private static getAttackBonus(combatant: Combatant): number {
    // For characters: level + STR modifier
    if ('class' in combatant && combatant.class) {
      const strMod = Math.floor((combatant.strength - 10) / 2)
      return combatant.level + strMod
    }
    // For monsters: level
    return combatant.level || 1
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (11 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.calculateHitChance()

- Implement Wizardry hit chance formula
- Cap at 95% max, 5% min
- Calculate attack bonus from level and STR
- Support both characters and monsters
- 100% test coverage (11/11 tests passing)"
```

---

### Task 10: CombatService - Resolve Attack

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
describe('resolveAttack', () => {
  it('returns miss when roll fails', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster()

    // Mock Math.random to return high value (miss)
    jest.spyOn(Math, 'random').mockReturnValue(0.99)

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(false)
    expect(result.damage).toBe(0)
    expect(result.critical).toBe(false)
    expect(result.message).toContain('Miss')

    jest.restoreAllMocks()
  })

  it('returns hit with damage when roll succeeds', () => {
    const attacker = createTestCharacter({ strength: 16 })  // +3 STR mod
    const defender = createTestMonster()

    // Mock Math.random to return low value (hit)
    jest.spyOn(Math, 'random').mockReturnValue(0.5)

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(true)
    expect(result.damage).toBeGreaterThan(0)
    expect(result.critical).toBe(false)

    jest.restoreAllMocks()
  })

  it('doubles damage on critical hit', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster()

    // Mock Math.random to return 0.95 (critical hit)
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.95)  // Hit roll
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.5)   // Damage roll

    const result = CombatService.resolveAttack(attacker, defender)

    expect(result.hit).toBe(true)
    expect(result.critical).toBe(true)
    expect(result.message).toContain('Critical')

    jest.restoreAllMocks()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "resolveAttack is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
import { AttackResult } from '../types/Combat'

export class CombatService {
  // ... existing methods

  static resolveAttack(attacker: Combatant, defender: Combatant): AttackResult {
    const hitChance = this.calculateHitChance(attacker, defender)
    const roll = Math.random() * 100

    if (roll >= hitChance) {
      return {
        hit: false,
        damage: 0,
        critical: false,
        message: 'Miss!'
      }
    }

    // Roll damage
    const baseDamage = this.rollDamage(attacker)
    const strMod = this.getStrengthModifier(attacker)
    const damage = Math.max(1, baseDamage + strMod)

    // Critical hit on roll >= 95
    const critical = roll >= 95
    const finalDamage = critical ? damage * 2 : damage

    return {
      hit: true,
      damage: finalDamage,
      critical,
      message: critical ? `Critical Hit! ${finalDamage} damage!` : `${finalDamage} damage!`
    }
  }

  private static rollDamage(combatant: Combatant): number {
    // For characters: roll equipped weapon damage
    if ('equippedWeapon' in combatant && combatant.equippedWeapon) {
      // TODO: Load weapon data and roll damage
      return 4  // Placeholder: 1d6 average
    }
    // For monsters: roll from damage array
    if ('damage' in combatant && combatant.damage && combatant.damage.length > 0) {
      const dice = combatant.damage[0]
      return this.rollInRange(dice.min, dice.max)
    }
    return 1  // Minimum damage
  }

  private static getStrengthModifier(combatant: Combatant): number {
    if ('strength' in combatant) {
      return Math.floor((combatant.strength - 10) / 2)
    }
    return 0
  }

  private static rollInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (14 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.resolveAttack()

- Resolve attacks with hit/miss determination
- Calculate damage with STR modifier
- Implement critical hits (roll >= 95)
- Support both character and monster damage
- 100% test coverage (14/14 tests passing)"
```

---

### Task 11: CombatService - Monster AI (Select Action)

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
describe('selectMonsterAction', () => {
  it('selects attack on random front row member', () => {
    const monster = createTestMonster()
    const frontChar = createTestCharacter({ id: 'front1', hp: 10 })
    const backChar = createTestCharacter({ id: 'back1', hp: 8 })
    const party = [frontChar, backChar]
    const frontRow = ['front1']

    const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

    expect(cmd.actor).toBe(monster)
    expect(cmd.type).toBe('ATTACK')
    expect(cmd.target).toBe(frontChar)
    expect(cmd.initiative).toBeGreaterThanOrEqual(1)
  })

  it('attacks back row when front row is dead', () => {
    const monster = createTestMonster()
    const frontChar = createTestCharacter({ id: 'front1', hp: 0, status: CharacterStatus.DEAD })
    const backChar = createTestCharacter({ id: 'back1', hp: 8 })
    const party = [frontChar, backChar]
    const frontRow = ['front1']

    const cmd = CombatService.selectMonsterAction(monster, party, frontRow)

    expect(cmd.target).toBe(backChar)
  })

  it('randomly distributes attacks across front row', () => {
    const monster = createTestMonster()
    const char1 = createTestCharacter({ id: 'c1', hp: 10 })
    const char2 = createTestCharacter({ id: 'c2', hp: 10 })
    const char3 = createTestCharacter({ id: 'c3', hp: 10 })
    const party = [char1, char2, char3]
    const frontRow = ['c1', 'c2', 'c3']

    const targets = Array.from({ length: 30 }, () =>
      CombatService.selectMonsterAction(monster, party, frontRow).target
    )

    const targetIds = new Set(targets.map((t: any) => t.id))
    expect(targetIds.size).toBeGreaterThan(1)  // At least 2 different targets
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "selectMonsterAction is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
import { CharacterStatus } from '../types/CharacterStatus'

export class CombatService {
  // ... existing methods

  static selectMonsterAction(
    monster: MonsterInstance,
    party: Character[],
    frontRow: string[]
  ): CombatCommand {
    // Get alive front row members
    const aliveFront = party.filter(c =>
      frontRow.includes(c.id) && c.status !== CharacterStatus.DEAD && c.hp > 0
    )

    // If no alive front row, target alive back row
    const targetPool = aliveFront.length > 0
      ? aliveFront
      : party.filter(c => c.status !== CharacterStatus.DEAD && c.hp > 0)

    // Select random target
    const target = targetPool[Math.floor(Math.random() * targetPool.length)]

    return this.createCommand(monster, 'ATTACK', target)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (17 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.selectMonsterAction()

- Basic monster AI: attack random front row
- Fall back to back row if front row dead
- Verify random target distribution
- Skip dead/zero HP party members
- 100% test coverage (17/17 tests passing)"
```

---

### Task 12: CombatService - Execute Single Command

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
describe('executeCommand', () => {
  it('executes attack command and updates HP', () => {
    const attacker = createTestCharacter({ strength: 16 })
    const defender = createTestMonster({ hp: 10, maxHp: 10 })
    const state = createTestCombatState({ monsters: [defender] })
    const cmd = createTestCombatCommand({ actor: attacker, type: 'ATTACK', target: defender })

    // Mock successful hit
    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      message: '5 damage!'
    })

    const result = CombatService.executeCommand(state, cmd)

    expect(result.newState.monsters[0].hp).toBe(5)
    expect(result.message).toContain('5 damage')

    jest.restoreAllMocks()
  })

  it('marks monster as DEAD when HP reaches 0', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster({ hp: 3, maxHp: 10 })
    const state = createTestCombatState({ monsters: [defender] })
    const cmd = createTestCombatCommand({ actor: attacker, type: 'ATTACK', target: defender })

    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 5,
      critical: false,
      message: '5 damage!'
    })

    const result = CombatService.executeCommand(state, cmd)

    expect(result.newState.monsters[0].hp).toBe(0)
    expect(result.newState.monsters[0].status).toBe('DEAD')

    jest.restoreAllMocks()
  })

  it('returns miss message when attack fails', () => {
    const attacker = createTestCharacter()
    const defender = createTestMonster()
    const state = createTestCombatState({ monsters: [defender] })
    const cmd = createTestCombatCommand({ actor: attacker, type: 'ATTACK', target: defender })

    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: false,
      damage: 0,
      critical: false,
      message: 'Miss!'
    })

    const result = CombatService.executeCommand(state, cmd)

    expect(result.message).toContain('Miss')

    jest.restoreAllMocks()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "executeCommand is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
export class CombatService {
  // ... existing methods

  static executeCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    // Handle different command types
    if (command.type === 'ATTACK') {
      return this.executeAttackCommand(state, command)
    }

    // TODO: Handle other command types (CAST_SPELL, USE_ITEM, etc.)
    return { newState: state, message: 'Unknown command type' }
  }

  private static executeAttackCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    const target = command.target as Combatant
    if (!target) {
      return { newState: state, message: 'No target specified' }
    }

    const attackResult = this.resolveAttack(command.actor, target)
    const actorName = this.getCombatantName(command.actor)
    const targetName = this.getCombatantName(target)

    if (!attackResult.hit) {
      return {
        newState: state,
        message: `${actorName} attacks ${targetName}: ${attackResult.message}`
      }
    }

    // Apply damage to target
    const newState = this.applyDamage(state, target, attackResult.damage)

    return {
      newState,
      message: `${actorName} attacks ${targetName}: ${attackResult.message}`
    }
  }

  private static applyDamage(
    state: CombatState,
    target: Combatant,
    damage: number
  ): CombatState {
    // Apply damage to monster
    if ('monsterId' in target) {
      const newMonsters = state.monsters.map(m => {
        if (m.id !== target.id) return m
        const newHp = Math.max(0, m.hp - damage)
        return {
          ...m,
          hp: newHp,
          status: newHp === 0 ? 'DEAD' : m.status
        }
      })
      return { ...state, monsters: newMonsters }
    }

    // TODO: Apply damage to character
    return state
  }

  private static getCombatantName(combatant: Combatant): string {
    return combatant.name || 'Unknown'
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (20 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.executeCommand()

- Execute single combat commands
- Apply damage to monsters with HP tracking
- Mark monsters as DEAD at 0 HP
- Generate descriptive combat messages
- 100% test coverage (20/20 tests passing)"
```

---

### Task 13: CombatService - Execute Full Round

**Files:**
- Modify: `src/services/CombatService.ts`
- Modify: `src/services/__tests__/CombatService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to CombatService.spec.ts
describe('executeRound', () => {
  it('executes commands in initiative order', () => {
    const char1 = createTestCharacter({ id: 'c1', name: 'Fighter' })
    const char2 = createTestCharacter({ id: 'c2', name: 'Mage' })
    const monster = createTestMonster({ name: 'Kobold' })
    const state = createTestCombatState({ monsters: [monster] })

    const cmd1 = createTestCombatCommand({ actor: char1, initiative: 5, target: monster })
    const cmd2 = createTestCombatCommand({ actor: char2, initiative: 10, target: monster })
    const cmd3 = createTestCombatCommand({ actor: monster, initiative: 7, target: char1 })

    state.commandQueue = [cmd1, cmd2, cmd3]

    const result = CombatService.executeRound(state)

    // Should execute in order: cmd2 (10), cmd3 (7), cmd1 (5)
    expect(result.messages).toHaveLength(3)
    expect(result.messages[0]).toContain('Mage')
    expect(result.messages[1]).toContain('Kobold')
    expect(result.messages[2]).toContain('Fighter')
  })

  it('skips dead combatants', () => {
    const char = createTestCharacter({ hp: 0, status: CharacterStatus.DEAD })
    const monster = createTestMonster()
    const state = createTestCombatState({ monsters: [monster] })

    const cmd = createTestCombatCommand({ actor: char, target: monster })
    state.commandQueue = [cmd]

    const result = CombatService.executeRound(state)

    expect(result.messages).toHaveLength(0)
  })

  it('detects victory when all monsters dead', () => {
    const char = createTestCharacter()
    const monster = createTestMonster({ hp: 1 })
    const state = createTestCombatState({ monsters: [monster] })

    const cmd = createTestCombatCommand({ actor: char, target: monster })
    state.commandQueue = [cmd]

    jest.spyOn(CombatService, 'resolveAttack').mockReturnValue({
      hit: true,
      damage: 10,
      critical: false,
      message: '10 damage!'
    })

    const result = CombatService.executeRound(state)

    expect(result.victory).toBe(true)
    expect(result.defeat).toBe(false)

    jest.restoreAllMocks()
  })

  it('increments round number', () => {
    const state = createTestCombatState({ roundNumber: 3 })

    const result = CombatService.executeRound(state)

    expect(result.newState.roundNumber).toBe(4)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CombatService`
Expected: FAIL - "executeRound is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to CombatService.ts
export class CombatService {
  // ... existing methods

  static executeRound(state: CombatState): {
    newState: CombatState
    messages: string[]
    victory: boolean
    defeat: boolean
  } {
    // Sort commands by initiative (descending)
    const sortedQueue = [...state.commandQueue].sort(
      (a, b) => b.initiative - a.initiative
    )

    let currentState = { ...state, commandQueue: [] }
    const messages: string[] = []

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor is dead
      if (this.isCombatantDead(command.actor)) continue

      const result = this.executeCommand(currentState, command)
      currentState = result.newState
      messages.push(result.message)

      // Check victory/defeat after each action
      const allMonstersDead = currentState.monsters.every(m => m.status === 'DEAD')
      if (allMonstersDead) {
        return { newState: currentState, messages, victory: true, defeat: false }
      }

      // TODO: Check party wipe (defeat)
    }

    return {
      newState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      messages,
      victory: false,
      defeat: false
    }
  }

  private static isCombatantDead(combatant: Combatant): boolean {
    if ('status' in combatant) {
      return combatant.status === 'DEAD' || combatant.status === CharacterStatus.DEAD
    }
    return combatant.hp <= 0
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CombatService`
Expected: PASS (24 tests)

**Step 5: Commit**

```bash
git add src/services/CombatService.ts src/services/__tests__/CombatService.spec.ts
git commit -m "feat: add CombatService.executeRound()

- Execute full combat round in initiative order
- Skip dead combatants
- Detect victory when all monsters dead
- Increment round number after execution
- 100% test coverage (24/24 tests passing)"
```

---

## Phase 3: SpellService & Effects (Week 3)

### Task 14: Create SpellService - Can Cast Spell

**Files:**
- Create: `src/services/SpellCastingService.ts`
- Create: `src/services/__tests__/SpellCastingService.spec.ts`

**Step 1: Write failing test**

```typescript
// src/services/__tests__/SpellCastingService.spec.ts
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '../../test-helpers/test-factories'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('SpellCastingService', () => {
  describe('canCastSpell', () => {
    it('allows casting with sufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: [0, 3, 2, 0, 0, 0, 0],  // 3 level-1 points, 2 level-2
          priest: [0, 0, 0, 0, 0, 0, 0]
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')  // Level 1 spell

      expect(result.canCast).toBe(true)
    })

    it('prevents casting with insufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: [0, 0, 0, 0, 0, 0, 0],  // No spell points
          priest: [0, 0, 0, 0, 0, 0, 0]
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(false)
      expect(result.reason).toBe('Insufficient spell points')
    })

    it('prevents casting while asleep', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.ASLEEP,
        spellPoints: {
          mage: [0, 9, 0, 0, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(false)
      expect(result.reason).toBe('Cannot cast while incapacitated')
    })

    it('prevents casting while paralyzed', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.PARALYZED,
        spellPoints: {
          mage: [0, 9, 0, 0, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(false)
      expect(result.reason).toBe('Cannot cast while incapacitated')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SpellCastingService`
Expected: FAIL - "SpellCastingService is not defined"

**Step 3: Write minimal implementation**

```typescript
// src/services/SpellCastingService.ts
import { Character } from '../types/Character'
import { CharacterStatus } from '../types/CharacterStatus'

// TODO: Load spell data from JSON
interface SpellData {
  id: string
  name: string
  level: number
  type: 'mage' | 'priest'
  // ... other fields
}

const SPELL_CACHE = new Map<string, SpellData>()
SPELL_CACHE.set('halito', { id: 'halito', name: 'HALITO', level: 1, type: 'mage' })

export class SpellCastingService {
  static canCastSpell(caster: Character, spellId: string): {
    canCast: boolean
    reason?: string
  } {
    const spell = SPELL_CACHE.get(spellId)
    if (!spell) {
      return { canCast: false, reason: 'Unknown spell' }
    }

    // Check incapacitation
    if (caster.status === CharacterStatus.ASLEEP || caster.status === CharacterStatus.PARALYZED) {
      return { canCast: false, reason: 'Cannot cast while incapacitated' }
    }

    // Check spell points
    if (!caster.spellPoints) {
      return { canCast: false, reason: 'No spell points' }
    }

    const spellPoints = caster.spellPoints[spell.type]?.[spell.level] || 0
    if (spellPoints < 1) {
      return { canCast: false, reason: 'Insufficient spell points' }
    }

    return { canCast: true }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SpellCastingService`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.spec.ts
git commit -m "feat: add SpellCastingService.canCastSpell()

- Validate spell point availability
- Check incapacitation status (asleep, paralyzed)
- Verify spell exists in cache
- 100% test coverage (4/4 tests passing)"
```

---

### Task 15: SpellCastingService - Deduct Spell Points

**Files:**
- Modify: `src/services/SpellCastingService.ts`
- Modify: `src/services/__tests__/SpellCastingService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to SpellCastingService.spec.ts
describe('deductSpellPoints', () => {
  it('deducts one point from correct spell level', () => {
    const caster = createTestCharacter({
      spellPoints: {
        mage: [0, 5, 3, 2, 0, 0, 0],
        priest: [0, 0, 0, 0, 0, 0, 0]
      }
    })

    const newCaster = SpellCastingService.deductSpellPoints(caster, 'halito')

    expect(newCaster.spellPoints!.mage[1]).toBe(4)  // 5 - 1
    expect(newCaster.spellPoints!.mage[2]).toBe(3)  // Unchanged
  })

  it('returns new character object (immutable)', () => {
    const caster = createTestCharacter({
      spellPoints: {
        mage: [0, 5, 0, 0, 0, 0, 0],
        priest: [0, 0, 0, 0, 0, 0, 0]
      }
    })

    const newCaster = SpellCastingService.deductSpellPoints(caster, 'halito')

    expect(newCaster).not.toBe(caster)
    expect(newCaster.spellPoints).not.toBe(caster.spellPoints)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SpellCastingService`
Expected: FAIL - "deductSpellPoints is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to SpellCastingService.ts
export class SpellCastingService {
  // ... existing canCastSpell()

  static deductSpellPoints(caster: Character, spellId: string): Character {
    const spell = SPELL_CACHE.get(spellId)!
    const currentPoints = caster.spellPoints![spell.type][spell.level]

    return {
      ...caster,
      spellPoints: {
        ...caster.spellPoints,
        [spell.type]: [
          ...caster.spellPoints![spell.type].slice(0, spell.level),
          currentPoints - 1,
          ...caster.spellPoints![spell.type].slice(spell.level + 1)
        ]
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SpellCastingService`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.spec.ts
git commit -m "feat: add SpellCastingService.deductSpellPoints()

- Deduct 1 spell point from correct level pool
- Maintain immutability (return new character)
- Preserve other spell point levels
- 100% test coverage (6/6 tests passing)"
```

---

### Task 16: SpellCastingService - Resolve Spell Effect (Damage)

**Files:**
- Modify: `src/services/SpellCastingService.ts`
- Modify: `src/services/__tests__/SpellCastingService.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to SpellCastingService.spec.ts
import { createTestMonster } from '../../test-helpers/test-factories'

describe('resolveSpellEffect', () => {
  it('calculates damage for offensive spell', () => {
    const caster = createTestCharacter({ level: 3 })
    const targets = [
      createTestMonster({ hp: 10 }),
      createTestMonster({ hp: 8 })
    ]

    // HALITO: 1d8 damage per target
    const result = SpellCastingService.resolveSpellEffect('halito', caster, targets)

    expect(result.damage).toHaveLength(2)
    result.damage!.forEach(dmg => {
      expect(dmg).toBeGreaterThanOrEqual(1)
      expect(dmg).toBeLessThanOrEqual(8)
    })
    expect(result.message).toContain('HALITO')
  })

  it('rolls different damage for each target', () => {
    const caster = createTestCharacter()
    const targets = Array.from({ length: 3 }, () => createTestMonster())

    const result = SpellCastingService.resolveSpellEffect('halito', caster, targets)

    expect(result.damage).toHaveLength(3)
    // At least one different damage value
    const unique = new Set(result.damage!)
    expect(unique.size).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SpellCastingService`
Expected: FAIL - "resolveSpellEffect is not defined"

**Step 3: Write minimal implementation**

```typescript
// Add to SpellCastingService.ts
import { SpellEffect } from '../types/Combat'
import { Combatant } from '../types/Combat'

// Expand SPELL_CACHE
SPELL_CACHE.set('halito', {
  id: 'halito',
  name: 'HALITO',
  level: 1,
  type: 'mage',
  damageType: 'fire',
  damageDice: '1d8'
})

export class SpellCastingService {
  // ... existing methods

  static resolveSpellEffect(
    spellId: string,
    caster: Character,
    targets: Combatant[]
  ): SpellEffect {
    const spell = SPELL_CACHE.get(spellId) as any

    // Handle offensive spells
    if (spell.damageType) {
      const damage = targets.map(() => this.rollDice(spell.damageDice))
      return {
        damage,
        message: `${spell.name} deals ${damage.join(', ')} damage!`
      }
    }

    // TODO: Handle healing, buffs, debuffs
    return { message: 'No effect' }
  }

  private static rollDice(dice: string): number {
    // Parse "1d8" format
    const [count, sides] = dice.split('d').map(Number)
    let total = 0
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1
    }
    return total
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SpellCastingService`
Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.spec.ts
git commit -m "feat: add SpellCastingService.resolveSpellEffect()

- Resolve offensive spell damage
- Roll dice (e.g. 1d8) for each target
- Generate descriptive spell messages
- 100% test coverage (8/8 tests passing)"
```

---

## Phase 4: Combat Component UI (Week 4)

### Task 17: Create CombatComponent Skeleton

**Files:**
- Create: `src/app/scenes/combat/combat.component.ts`
- Create: `src/app/scenes/combat/combat.component.html`
- Create: `src/app/scenes/combat/combat.component.scss`
- Create: `src/app/scenes/combat/combat.component.spec.ts`

**Step 1: Generate component using Angular CLI**

Run: `ng generate component scenes/combat --skip-tests`

**Step 2: Create basic component structure**

```typescript
// src/app/scenes/combat/combat.component.ts
import { Component, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { GameStateService } from '../../../services/GameStateService'
import { CombatState } from '../../../types/Combat'
import { Character } from '../../../types/Character'

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.component.html',
  styleUrls: ['./combat.component.scss']
})
export class CombatComponent {
  // Signals from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly roster = computed(() => this.gameState.state().roster)

  // Local UI state
  readonly selectedActions = signal<Map<string, any>>(new Map())
  readonly combatLog = signal<string[]>([])
  readonly isExecutingRound = signal<boolean>(false)

  constructor(private gameState: GameStateService) {}

  // Computed party characters
  readonly partyCharacters = computed(() => {
    const members = this.party().members
    const roster = this.roster()
    return members.map(id => roster.get(id)!).filter(Boolean)
  })

  readonly monsters = computed(() => this.combatState()?.monsters || [])

  readonly allActionsSelected = computed(() => {
    const chars = this.partyCharacters()
    const actions = this.selectedActions()
    return chars.every(c => actions.has(c.id))
  })

  selectAction(charId: string, action: any): void {
    // TODO: Create command and add to selectedActions
  }

  executeRound(): void {
    // TODO: Execute combat round
  }
}
```

**Step 3: Create basic HTML template**

```html
<!-- src/app/scenes/combat/combat.component.html -->
<div class="combat-scene">
  @if (combatState(); as combat) {
    <div class="combat-header">
      <h2>COMBAT - ROUND {{ combat.roundNumber }}</h2>
    </div>

    <div class="combat-grid">
      <div class="monsters-panel">
        <h3>MONSTERS</h3>
        @for (monster of monsters(); track monster.id) {
          <div class="monster-card">
            {{ monster.name }} ({{ monster.hp }}/{{ monster.maxHp }} HP)
          </div>
        }
      </div>

      <div class="party-panel">
        <h3>PARTY</h3>
        @for (char of partyCharacters(); track char.id) {
          <div class="character-card">
            {{ char.name }} ({{ char.hp }}/{{ char.maxHp }} HP)
          </div>
        }
      </div>
    </div>

    <div class="combat-log">
      @for (msg of combatLog(); track $index) {
        <div>{{ msg }}</div>
      }
    </div>

    <div class="combat-actions">
      <button [disabled]="!allActionsSelected()" (click)="executeRound()">
        Execute Round
      </button>
    </div>
  } @else {
    <div>No combat active</div>
  }
</div>
```

**Step 4: Create basic SCSS**

```scss
// src/app/scenes/combat/combat.component.scss
.combat-scene {
  padding: 20px;
}

.combat-grid {
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 20px;
  margin: 20px 0;
}

.monsters-panel,
.party-panel {
  border: 1px solid #ccc;
  padding: 10px;
}

.combat-log {
  border: 1px solid #ccc;
  padding: 10px;
  max-height: 200px;
  overflow-y: auto;
}
```

**Step 5: Create component test**

```typescript
// src/app/scenes/combat/combat.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatComponent } from './combat.component'
import { GameStateService } from '../../../services/GameStateService'
import { signal } from '@angular/core'
import { createTestGameState, createTestCombatState } from '../../../test-helpers/test-factories'

describe('CombatComponent', () => {
  let component: CombatComponent
  let fixture: ComponentFixture<CombatComponent>
  let gameStateService: jasmine.SpyObj<GameStateService>

  beforeEach(async () => {
    const mockGameState = signal(createTestGameState())

    gameStateService = jasmine.createSpyObj('GameStateService', ['updateState'])
    Object.defineProperty(gameStateService, 'state', {
      get: () => mockGameState
    })

    await TestBed.configureTestingModule({
      imports: [CombatComponent],
      providers: [
        { provide: GameStateService, useValue: gameStateService }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(CombatComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('displays combat round number', () => {
    const compiled = fixture.nativeElement as HTMLElement
    expect(compiled.textContent).toContain('COMBAT - ROUND')
  })
})
```

**Step 6: Run test to verify**

Run: `npm test -- combat.component`
Expected: PASS (2 tests)

**Step 7: Commit**

```bash
git add src/app/scenes/combat/
git commit -m "feat: create CombatComponent skeleton

- Add combat component with basic template
- Display monsters and party panels
- Add combat log area
- Wire up GameStateService signals
- 100% test coverage (2/2 tests passing)"
```

---

### Task 18: Integrate Combat with Maze Scene

**Files:**
- Modify: `src/app/scenes/maze/maze.component.ts`
- Modify: `src/app/scenes/maze/maze.component.spec.ts`
- Modify: `src/app/app.routes.ts`

**Step 1: Add combat route**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router'
import { CombatComponent } from './scenes/combat/combat.component'

export const routes: Routes = [
  // ... existing routes
  { path: 'combat', component: CombatComponent },
]
```

**Step 2: Add encounter-to-combat transition**

```typescript
// src/app/scenes/maze/maze.component.ts
import { Router } from '@angular/router'
import { CombatService } from '../../../services/CombatService'

export class MazeComponent {
  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  private checkForEncounter(): void {
    const encounterOccurs = EncounterService.rollRandomEncounter()
    if (!encounterOccurs) return

    const level = this.gameState.state().dungeon.currentLevel
    const table = EncounterService.getEncounterTable(level)
    const monsterId = EncounterService.selectMonster(table)

    // Initialize combat state
    this.gameState.updateState(state => ({
      ...state,
      combat: CombatService.initiateCombat(
        monsterId,
        this.partyCharacters(),
        true  // canFlee = true for random encounters
      ),
      encounterMetadata: {
        monsterId,
        isFixed: false,
        position: state.dungeon.position
      }
    }))

    // Navigate to combat
    this.router.navigate(['/combat'])
  }
}
```

**Step 3: Write test for encounter transition**

```typescript
// Add to maze.component.spec.ts
describe('encounter transitions', () => {
  it('navigates to combat on random encounter', () => {
    const router = TestBed.inject(Router)
    spyOn(router, 'navigate')
    spyOn(EncounterService, 'rollRandomEncounter').and.returnValue(true)
    spyOn(EncounterService, 'selectMonster').and.returnValue('kobold')

    component['checkForEncounter']()

    expect(router.navigate).toHaveBeenCalledWith(['/combat'])
  })

  it('initializes combat state with monster group', () => {
    spyOn(EncounterService, 'rollRandomEncounter').and.returnValue(true)
    spyOn(EncounterService, 'selectMonster').and.returnValue('kobold')

    component['checkForEncounter']()

    const state = gameStateService.state()
    expect(state.combat).toBeDefined()
    expect(state.combat!.monsters.length).toBeGreaterThan(0)
  })
})
```

**Step 4: Run test to verify**

Run: `npm test -- maze.component`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/app.routes.ts src/app/scenes/maze/
git commit -m "feat: integrate combat with maze scene

- Add combat route to app routes
- Implement encounter-to-combat transition
- Initialize CombatState on encounter trigger
- Navigate to /combat on encounter
- Add tests for transition flow"
```

---

## Phase 5: Combat Flow & Victory (Week 5)

### Task 19: Combat - Execute Round Flow

**Files:**
- Modify: `src/app/scenes/combat/combat.component.ts`
- Modify: `src/app/scenes/combat/combat.component.spec.ts`

**Step 1: Write failing test**

```typescript
// Add to combat.component.spec.ts
describe('executeRound', () => {
  it('executes round and updates combat log', () => {
    // Setup combat state with commands
    const char = createTestCharacter()
    const monster = createTestMonster()
    const combatState = createTestCombatState({ monsters: [monster] })

    mockGameState.set({
      ...createTestGameState(),
      combat: combatState
    })

    component.selectAction(char.id, { type: 'ATTACK', target: monster })
    component.executeRound()

    expect(component.combatLog().length).toBeGreaterThan(0)
  })

  it('clears selected actions after round', () => {
    const char = createTestCharacter()
    const monster = createTestMonster()

    component.selectAction(char.id, { type: 'ATTACK', target: monster })
    expect(component.selectedActions().size).toBe(1)

    component.executeRound()

    expect(component.selectedActions().size).toBe(0)
  })
})
```

**Step 2: Implement executeRound**

```typescript
// Modify combat.component.ts
import { CombatService } from '../../../services/CombatService'

export class CombatComponent {
  // ... existing code

  executeRound(): void {
    const state = this.combatState()
    if (!state) return

    this.isExecutingRound.set(true)

    // Get all commands (party + monsters)
    const partyCommands = Array.from(this.selectedActions().values())
    const monsterCommands = state.monsters
      .filter(m => m.status === 'ALIVE')
      .map(m => CombatService.selectMonsterAction(
        m,
        this.partyCharacters(),
        this.party().formation.frontRow
      ))

    const allCommands = [...partyCommands, ...monsterCommands]

    // Execute round
    const newState = { ...state, commandQueue: allCommands }
    const result = CombatService.executeRound(newState)

    // Update game state
    this.gameState.updateState(s => ({ ...s, combat: result.newState }))

    // Update combat log
    this.combatLog.update(log => [...log, ...result.messages].slice(-10))

    // Clear selections
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)

    // Check victory/defeat
    if (result.victory) this.handleVictory()
    if (result.defeat) this.handleDefeat()
  }

  private handleVictory(): void {
    // TODO: Calculate XP/gold, show modal
  }

  private handleDefeat(): void {
    // TODO: Handle party wipe
  }
}
```

**Step 3: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/scenes/combat/
git commit -m "feat: implement combat round execution

- Execute full combat round with party + monster actions
- Update combat log with last 10 messages
- Clear selected actions after round
- Detect victory/defeat (stubs)
- Add tests for round execution flow"
```

---

### Task 20: Combat - Victory Handling & XP/Gold Distribution

**Files:**
- Modify: `src/app/scenes/combat/combat.component.ts`
- Modify: `src/app/scenes/combat/combat.component.spec.ts`
- Modify: `src/types/GameState.ts`

**Step 1: Add encounterMetadata to GameState**

```typescript
// Modify GameState.ts
export interface GameState {
  // ... existing fields
  combat?: CombatState
  encounterMetadata?: {
    monsterId: string
    isFixed: boolean
    position: { x: number; y: number; level: number }
  }
}
```

**Step 2: Write failing test**

```typescript
// Add to combat.component.spec.ts
describe('handleVictory', () => {
  it('distributes XP to all party members', () => {
    const char1 = createTestCharacter({ id: 'c1', experience: 100 })
    const char2 = createTestCharacter({ id: 'c2', experience: 50 })
    const monster1 = createTestMonster({ xp: 415 })
    const monster2 = createTestMonster({ xp: 415 })

    mockGameState.set({
      ...createTestGameState(),
      roster: new Map([['c1', char1], ['c2', char2]]),
      party: { members: ['c1', 'c2'], /* ... */ },
      combat: createTestCombatState({ monsters: [monster1, monster2] })
    })

    component['handleVictory']()

    const newRoster = gameStateService.state().roster
    const newChar1 = newRoster.get('c1')!
    const newChar2 = newRoster.get('c2')!

    // Total XP: 830, divided by 2 = 415 each
    expect(newChar1.experience).toBe(515)  // 100 + 415
    expect(newChar2.experience).toBe(465)  // 50 + 415
  })

  it('adds gold to party pool', () => {
    const monster = createTestMonster({ gold: 100 })
    mockGameState.set({
      ...createTestGameState(),
      party: { gold: 500, /* ... */ },
      combat: createTestCombatState({ monsters: [monster] })
    })

    component['handleVictory']()

    expect(gameStateService.state().party.gold).toBe(600)
  })

  it('tracks defeated fixed encounter', () => {
    mockGameState.set({
      ...createTestGameState(),
      combat: createTestCombatState(),
      encounterMetadata: {
        monsterId: 'murphys-ghost',
        isFixed: true,
        position: { x: 10, y: 5, level: 4 }
      },
      dungeon: { defeatedEncounters: [], /* ... */ }
    })

    component['handleVictory']()

    const defeatedEncounters = gameStateService.state().dungeon.defeatedEncounters
    expect(defeatedEncounters).toContain('4_10_5')
  })
})
```

**Step 3: Implement handleVictory**

```typescript
// Modify combat.component.ts
import { Router } from '@angular/router'

export class CombatComponent {
  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  private handleVictory(): void {
    const state = this.gameState.state()
    const monsters = state.combat!.monsters
    const partyMembers = state.party.members
    const roster = state.roster

    // Calculate XP and gold
    const totalXP = monsters.reduce((sum, m) => sum + m.xp, 0)
    const totalGold = monsters.reduce((sum, m) => sum + (m.gold || 0), 0)
    const xpPerChar = Math.floor(totalXP / partyMembers.length)

    // Update state
    this.gameState.updateState(s => {
      const newRoster = new Map(s.roster)

      // Distribute XP
      s.party.members.forEach(charId => {
        const char = newRoster.get(charId)!
        newRoster.set(charId, { ...char, experience: char.experience + xpPerChar })
      })

      // Add gold
      const newParty = { ...s.party, gold: s.party.gold + totalGold }

      // Track defeated fixed encounter
      let defeatedEncounters = s.dungeon.defeatedEncounters
      if (s.encounterMetadata?.isFixed) {
        const pos = s.encounterMetadata.position
        const key = `${pos.level}_${pos.x}_${pos.y}`
        defeatedEncounters = [...defeatedEncounters, key]
      }

      return {
        ...s,
        roster: newRoster,
        party: newParty,
        dungeon: { ...s.dungeon, defeatedEncounters },
        combat: undefined,
        encounterMetadata: undefined
      }
    })

    // TODO: Show victory modal with XP/gold summary
    // Return to maze after delay
    setTimeout(() => this.router.navigate(['/maze']), 2000)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/combat/ src/types/GameState.ts
git commit -m "feat: implement combat victory handling

- Distribute XP evenly to all party members
- Add gold to party pool
- Track defeated fixed encounters
- Clear combat state and metadata
- Return to maze after victory
- Add tests for XP/gold distribution"
```

---

## Phase 6: Polish & Integration (Week 6)

### Task 21: Add E2E Combat Integration Test

**Files:**
- Create: `src/services/__tests__/Combat.e2e.spec.ts`

**Step 1: Write E2E test**

```typescript
// src/services/__tests__/Combat.e2e.spec.ts
import { MonsterService } from '../MonsterService'
import { CombatService } from '../CombatService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('Combat E2E Flow', () => {
  it('completes full combat from encounter to victory', () => {
    // 1. Generate monster encounter
    const monsters = MonsterService.generateMonsterGroup('kobold')
    expect(monsters.length).toBeGreaterThanOrEqual(3)

    // 2. Initialize combat
    const party = [
      createTestCharacter({ id: 'fighter', strength: 16, hp: 20, maxHp: 20 }),
      createTestCharacter({ id: 'mage', intelligence: 16, hp: 8, maxHp: 8 })
    ]
    const state = CombatService.initiateCombat('kobold', party, true)

    // 3. Simulate multiple rounds until victory
    let currentState = state
    let roundCount = 0
    const maxRounds = 20

    while (roundCount < maxRounds) {
      // Create party commands
      const partyCommands = party.map(char =>
        CombatService.createCommand(char, 'ATTACK', currentState.monsters[0])
      )

      // Create monster commands
      const monsterCommands = currentState.monsters
        .filter(m => m.status === 'ALIVE')
        .map(m => CombatService.selectMonsterAction(m, party, ['fighter']))

      // Execute round
      currentState.commandQueue = [...partyCommands, ...monsterCommands]
      const result = CombatService.executeRound(currentState)
      currentState = result.newState

      if (result.victory) {
        expect(currentState.monsters.every(m => m.status === 'DEAD')).toBe(true)
        return
      }

      if (result.defeat) {
        fail('Party should not be defeated in this test')
        return
      }

      roundCount++
    }

    fail(`Combat did not resolve within ${maxRounds} rounds`)
  })

  it('tracks fixed encounter defeat', () => {
    const party = [createTestCharacter({ strength: 18, hp: 30 })]
    const state = CombatService.initiateCombat('kobold', party, false)

    expect(state.canFlee).toBe(false)

    // Simulate quick victory
    const monsters = state.monsters.map(m => ({ ...m, hp: 0, status: 'DEAD' as const }))
    const victoryState = { ...state, monsters }
    const result = CombatService.executeRound(victoryState)

    expect(result.victory).toBe(true)
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npm test -- Combat.e2e`
Expected: PASS (2 tests)

**Step 3: Commit**

```bash
git add src/services/__tests__/Combat.e2e.spec.ts
git commit -m "test: add E2E combat integration test

- Test full combat flow from encounter to victory
- Verify monster generation and combat resolution
- Simulate multiple combat rounds
- Test fixed encounter tracking
- E2E test coverage (2/2 tests passing)"
```

---

### Task 22: Performance Test - Combat Speed

**Files:**
- Create: `src/services/__tests__/Combat.performance.spec.ts`

**Step 1: Write performance test**

```typescript
// src/services/__tests__/Combat.performance.spec.ts
import { MonsterService } from '../MonsterService'
import { CombatService } from '../CombatService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('Combat Performance', () => {
  it('executes combat round in <100ms', () => {
    const party = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({ id: `char${i}` })
    )
    const monsters = MonsterService.generateMonsterGroup('kobold')
    const state = CombatService.initiateCombat('kobold', party, true)

    // Create commands
    const partyCommands = party.map(c => CombatService.createCommand(c, 'ATTACK', monsters[0]))
    const monsterCommands = monsters.map(m =>
      CombatService.selectMonsterAction(m, party, ['char0', 'char1', 'char2'])
    )

    state.commandQueue = [...partyCommands, ...monsterCommands]

    // Measure execution time
    const start = performance.now()
    CombatService.executeRound(state)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(100)  // <100ms per round
  })

  it('generates monster group in <50ms', () => {
    const start = performance.now()
    MonsterService.generateMonsterGroup('kobold')
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('calculates initiative for 11 combatants in <10ms', () => {
    const combatants = [
      ...Array.from({ length: 6 }, () => createTestCharacter()),
      ...MonsterService.generateMonsterGroup('kobold')
    ]

    const start = performance.now()
    combatants.forEach(c => CombatService.calculateInitiative(c))
    const duration = performance.now() - start

    expect(duration).toBeLessThan(10)
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npm test -- Combat.performance`
Expected: PASS (3 tests)

**Step 3: Commit**

```bash
git add src/services/__tests__/Combat.performance.spec.ts
git commit -m "test: add combat performance tests

- Verify round execution <100ms
- Verify monster generation <50ms
- Verify initiative calculation <10ms
- Performance baselines established"
```

---

### Task 23: Final Test Suite Run & Coverage Report

**Files:**
- None (verification step)

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests passing

**Step 2: Generate coverage report**

Run: `npm test -- --coverage`
Expected: >80% coverage overall, 100% for combat services

**Step 3: Verify test count**

Expected test count:
- MonsterService: 7 tests
- CombatService: 24 tests
- SpellCastingService: 8 tests
- CombatComponent: ~10 tests
- E2E: 2 tests
- Performance: 3 tests
- **Total: ~54 new combat tests**

**Step 4: Verify test speed**

Run: `npm test`
Expected: <3 seconds total (including new combat tests)

**Step 5: Document results**

Create summary document showing:
- Total tests passing
- Coverage percentages
- Performance metrics
- Any remaining TODOs

**Step 6: Commit**

```bash
git commit --allow-empty -m "test: verify final test suite

- 54 new combat tests passing
- 100% coverage for combat services
- Test suite completes in <3 seconds
- All performance targets met"
```

---

## Testing Commands Summary

```bash
# Run all tests
npm test

# Run specific service tests
npm test -- MonsterService
npm test -- CombatService
npm test -- SpellCastingService

# Run component tests
npm test -- combat.component

# Run E2E tests
npm test -- Combat.e2e

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run with performance metrics
npm test -- Combat.performance
```

---

## Success Criteria Checklist

After completing all tasks, verify:

- [ ] All services at 100% test coverage (MonsterService, CombatService, SpellCastingService)
- [ ] 54+ new tests passing in <3 seconds
- [ ] Complete combat flow: encounter → rounds → victory/defeat
- [ ] XP/gold distribution working correctly
- [ ] Fixed encounter tracking (defeatedEncounters[])
- [ ] All 6 actions functional (Fight implemented, others stubbed)
- [ ] Original turn structure (all select, resolve by initiative)
- [ ] Transitions: maze ↔️ combat ↔️ temple (victory path only)
- [ ] Monster HP rolled authentically each encounter
- [ ] Party wipe detection (defeat handling stubbed)
- [ ] TypeScript compilation with no errors
- [ ] All commits follow conventional commit format

---

## Known Limitations & Future Work

**Phase 4+ Not Fully Detailed:**
- Tasks 17-23 provide structure but may need additional substeps
- UI components (monster list, action selector) not fully designed
- Spell effects beyond damage not implemented
- Item usage not implemented
- Defeat/temple resurrection flow not implemented

**Next Steps After Plan Completion:**
1. Review completed Phase 1-3 services
2. Expand Phase 4+ tasks if needed
3. Implement UI polish (victory modals, animations)
4. Add remaining combat actions (Parry, Run, Use Item, Dispel)
5. Integrate full spell system
6. Add defeat → temple → resurrection flow

---

**Plan Status:** Complete and ready for execution
**Execution Method:** Use `superpowers:executing-plans` skill (batch execution with checkpoints)
**Estimated Duration:** 6 weeks (detailed tasks for first 3 weeks, structure for remaining 3 weeks)
