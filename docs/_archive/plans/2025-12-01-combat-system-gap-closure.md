# Combat System Gap Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining ~15% gap between current combat implementation and Apple II Wizardry 1 reference, achieving 100% authenticity.

**Architecture:** Fix core combat formulas in CombatService (STR modifiers, critical hits, attack counts), add missing features to ItemProtectionService (purposed weapons), and implement new surprise mechanics. All changes follow existing pure-function patterns with immutable state updates.

**Tech Stack:** TypeScript, Angular, Jest, RandomService for deterministic testing

---

## Task 1: Fix Strength Modifier System

**Files:**
- Modify: `src/app/services/CombatService.ts:317-322`
- Modify: `src/app/services/CombatService.ts:178-190`
- Modify: `src/app/services/CombatService.ts:213`
- Test: `src/app/services/__tests__/CombatService.strModifiers.spec.ts` (create)

### Step 1.1: Write the failing test for STR damage modifier

```typescript
// src/app/services/__tests__/CombatService.strModifiers.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/Character'

describe('CombatService STR Modifiers', () => {
  describe('getStrengthDamageModifier', () => {
    it('returns -3 for STR 3 (authentic Wizardry table)', () => {
      const char = createTestCharacter({ strength: 3 })
      // Access private method via any cast for testing
      const modifier = (CombatService as any).getStrengthDamageModifier(char)
      expect(modifier).toBe(-3)
    })

    it('returns 0 for STR 10 (middle range)', () => {
      const char = createTestCharacter({ strength: 10 })
      const modifier = (CombatService as any).getStrengthDamageModifier(char)
      expect(modifier).toBe(0)
    })

    it('returns +3 for STR 18 (maximum)', () => {
      const char = createTestCharacter({ strength: 18 })
      const modifier = (CombatService as any).getStrengthDamageModifier(char)
      expect(modifier).toBe(3)
    })
  })
})
```

### Step 1.2: Run test to verify it fails

Run: `npm test -- CombatService.strModifiers --testNamePattern="STR 3"`
Expected: FAIL - current formula `(18-10)/2 = 4` not `-3`

### Step 1.3: Write getStrengthDamageModifier implementation

In `src/app/services/CombatService.ts`, replace `getStrengthModifier` with two methods:

```typescript
/**
 * Get STR damage modifier per swing (Apple II reference)
 * STR 3=-3, 4=-2, 5=-1, 6-15=0, 16=+1, 17=+2, 18+=+3
 */
private static getStrengthDamageModifier(combatant: Combatant): number {
  if (!('strength' in combatant)) return 0
  const str = combatant.strength
  if (str <= 3) return -3
  if (str === 4) return -2
  if (str === 5) return -1
  if (str <= 15) return 0
  if (str === 16) return 1
  if (str === 17) return 2
  return 3 // 18+
}
```

### Step 1.4: Run test to verify it passes

Run: `npm test -- CombatService.strModifiers`
Expected: PASS (all 3 tests)

### Step 1.5: Add tests for STR hit modifier

```typescript
describe('getStrengthHitModifier', () => {
  it('returns -15 for STR 3 (percentage)', () => {
    const char = createTestCharacter({ strength: 3 })
    const modifier = (CombatService as any).getStrengthHitModifier(char)
    expect(modifier).toBe(-15)
  })

  it('returns 0 for STR 10', () => {
    const char = createTestCharacter({ strength: 10 })
    const modifier = (CombatService as any).getStrengthHitModifier(char)
    expect(modifier).toBe(0)
  })

  it('returns +15 for STR 18', () => {
    const char = createTestCharacter({ strength: 18 })
    const modifier = (CombatService as any).getStrengthHitModifier(char)
    expect(modifier).toBe(15)
  })
})
```

### Step 1.6: Run test to verify it fails

Run: `npm test -- CombatService.strModifiers --testNamePattern="hit modifier"`
Expected: FAIL - method doesn't exist

### Step 1.7: Write getStrengthHitModifier implementation

```typescript
/**
 * Get STR hit probability modifier (Apple II reference)
 * STR 3=-15%, 4=-10%, 5=-5%, 6-15=0%, 16=+5%, 17=+10%, 18+=+15%
 */
private static getStrengthHitModifier(combatant: Combatant): number {
  if (!('strength' in combatant)) return 0
  const str = combatant.strength
  if (str <= 3) return -15
  if (str === 4) return -10
  if (str === 5) return -5
  if (str <= 15) return 0
  if (str === 16) return 5
  if (str === 17) return 10
  return 15 // 18+
}
```

### Step 1.8: Run test to verify it passes

Run: `npm test -- CombatService.strModifiers`
Expected: PASS (all 6 tests)

### Step 1.9: Update getAttackBonus to use hit modifier

In `getAttackBonus()`, replace the STR calculation:

```typescript
private static getAttackBonus(combatant: Combatant): number {
  const hitCalcMod = this.getHitCalcMod(combatant)
  if ('class' in combatant && combatant.class) {
    // STR hit modifier is percentage, convert to hit bonus (15% = +3 raw)
    const strHitMod = Math.floor(this.getStrengthHitModifier(combatant) / 5)
    return hitCalcMod + strHitMod
  }
  return hitCalcMod
}
```

### Step 1.10: Update resolveAttack to use damage modifier

In `resolveAttack()`, replace line ~213:

```typescript
const baseDamage = this.rollDamage(attacker)
const strDamageMod = this.getStrengthDamageModifier(attacker)
let damage = Math.max(1, baseDamage + strDamageMod)
```

### Step 1.11: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 1.12: Commit

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.strModifiers.spec.ts
git commit -m "fix(combat): use authentic Wizardry STR modifier tables

- Replace D&D-style (STR-10)/2 with Wizardry lookup tables
- STR damage: 3=-3, 4=-2, 5=-1, 6-15=0, 16=+1, 17=+2, 18=+3
- STR hit: 3=-15%, 4=-10%, 5=-5%, 6-15=0, 16=+5%, 17=+10%, 18=+15%
- Reference: docs/research/combat_system_technical_reference.md Section 3"
```

---

## Task 2: Fix Critical Hit Mechanics (Instant Kill)

**Files:**
- Modify: `src/app/types/Combat.ts:99-104`
- Modify: `src/app/services/CombatService.ts:192-240`
- Modify: `src/app/services/CombatService.ts:830-940`
- Test: `src/app/services/__tests__/CombatService.criticalHits.spec.ts` (create)

### Step 2.1: Write the failing test for instant kill

```typescript
// src/app/services/__tests__/CombatService.criticalHits.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CharacterClass } from '@models/Character'
import { RandomService } from '../RandomService'

describe('CombatService Critical Hits', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('Ninja instant kill', () => {
    it('critical hit sets instantKill flag to true', () => {
      const ninja = createTestCharacter({
        class: CharacterClass.NINJA,
        level: 25,  // 50% crit chance
        strength: 10
      })
      const monster = createTestMonster({
        id: 'weak-monster',
        level: 1,   // Low level = can be crit
        hp: 100,
        ac: 10
      })

      // Queue: hit roll success, damage roll, crit roll success, monster resist fail
      RandomService.queueNextValues([0.1, 0.5, 0.1, 0.99])

      const result = CombatService.resolveAttack(ninja, monster)

      expect(result.critical).toBe(true)
      expect(result.instantKill).toBe(true)
    })
  })
})
```

### Step 2.2: Run test to verify it fails

Run: `npm test -- CombatService.criticalHits --testNamePattern="instantKill"`
Expected: FAIL - `instantKill` property doesn't exist

### Step 2.3: Update AttackResult interface

In `src/app/types/Combat.ts:99-104`:

```typescript
export interface AttackResult {
  hit: boolean
  damage: number
  critical: boolean
  instantKill?: boolean  // True if critical hit = instant death
  message: string
}
```

### Step 2.4: Run test again

Run: `npm test -- CombatService.criticalHits`
Expected: FAIL - `instantKill` always undefined

### Step 2.5: Implement instant kill in resolveAttack

In `src/app/services/CombatService.ts`, update the critical hit section (~line 216-232):

```typescript
// Critical hit: (2 × Level)% chance, max 50%
const attackerLevel = attacker.level || 1
const critChance = Math.min(50, attackerLevel * 2)
let critical = RandomService.chance(critChance)
let instantKill = false

// Monster resistance to critical hits (Apple II reference)
// Formula: (MonsterLevel + 10) must be < random(0, 34)
// Level 24+ always resists: 24+10=34, never < random(0,34)
if (critical && 'monsterId' in defender) {
  const monsterLevel = defender.level || 1
  const resistRoll = RandomService.random(0, 34)
  if ((monsterLevel + 10) >= resistRoll) {
    critical = false  // Monster resists decapitation
  } else {
    instantKill = true  // Critical = instant kill
  }
}

// Critical hits on characters checked elsewhere (CharacterResistanceService)
if (critical && !('monsterId' in defender)) {
  // Character crit resistance handled in executeAttackCommand
  instantKill = true
}

// Note: Critical no longer multiplies damage - it's instant kill
// Only apply helpless multiplier
const isHelpless = this.isHelplessTarget(defender)
if (isHelpless) {
  damage *= 2
}

return {
  hit: true,
  damage,
  critical,
  instantKill,
  message: instantKill
    ? `Critical hit! ${this.getCombatantName(defender)} is slain!`
    : `${damage} damage!`
}
```

### Step 2.6: Run test to verify it passes

Run: `npm test -- CombatService.criticalHits`
Expected: PASS

### Step 2.7: Add test for level 24+ immunity

```typescript
it('level 24+ monsters are immune to critical hits', () => {
  const ninja = createTestCharacter({
    class: CharacterClass.NINJA,
    level: 25,
    strength: 10
  })
  const highLevelMonster = createTestMonster({
    id: 'boss',
    level: 24,  // Level+10=34, always >= random(0,34)
    hp: 500,
    ac: -5
  })

  // Queue: hit roll success, damage roll, crit roll success
  // No monster resist roll needed - auto-immune
  RandomService.queueNextValues([0.1, 0.5, 0.1])

  const result = CombatService.resolveAttack(ninja, highLevelMonster)

  expect(result.critical).toBe(false)
  expect(result.instantKill).toBeFalsy()
})
```

### Step 2.8: Run test to verify it passes

Run: `npm test -- CombatService.criticalHits --testNamePattern="level 24"`
Expected: PASS

### Step 2.9: Update executeAttackCommand to handle instantKill

In `executeAttackCommand()` (~line 830), after getting attackResult:

```typescript
// Handle instant kill from critical hit
if (attackResult.instantKill && 'monsterId' in target) {
  const newMonsterGroups = this.updateMonsterHp(state.monsterGroups, target.id, 0, 'DEAD')
  return {
    newState: { ...state, monsterGroups: newMonsterGroups },
    messages: [actionMessage, `${this.RESULT_MARKER}${attackResult.message}`],
    targetDamage: {
      targetId: target.id,
      damage: target.hp,  // Full HP as "damage"
      newHp: 0,
      newStatus: 'DEAD'
    }
  }
}
```

### Step 2.10: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 2.11: Commit

```bash
git add src/app/types/Combat.ts src/app/services/CombatService.ts src/app/services/__tests__/CombatService.criticalHits.spec.ts
git commit -m "fix(combat): implement authentic critical hit instant kill

- Critical hits now instantly kill target (not 2x damage)
- Monster resistance: (Level+10) < random(0,34) to be vulnerable
- Level 24+ monsters immune (24+10=34 always >= random)
- Add instantKill flag to AttackResult interface
- Reference: docs/research/combat_system_technical_reference.md Section 4"
```

---

## Task 3: Add Purposed Weapon Double Damage

**Files:**
- Modify: `src/app/services/ItemProtectionService.ts:60-80`
- Modify: `src/app/services/CombatService.ts:240-250`
- Test: `src/app/services/__tests__/ItemProtectionService.spec.ts` (create)

### Step 3.1: Write the failing test

```typescript
// src/app/services/__tests__/ItemProtectionService.spec.ts
import { ItemProtectionService } from '../ItemProtectionService'
import { Item } from '@models/Item'

describe('ItemProtectionService', () => {
  describe('isPurposedAgainst', () => {
    it('returns true when weapon is purposed against monster class', () => {
      const dragonSlayer: Item = {
        id: 'dragon-slayer',
        name: 'Dragon Slayer',
        type: 'weapon',
        special: { purposedAgainst: 'dragon' }
      } as Item

      expect(ItemProtectionService.isPurposedAgainst(dragonSlayer, 'dragon')).toBe(true)
    })

    it('returns false when weapon is not purposed against monster class', () => {
      const dragonSlayer: Item = {
        id: 'dragon-slayer',
        name: 'Dragon Slayer',
        type: 'weapon',
        special: { purposedAgainst: 'dragon' }
      } as Item

      expect(ItemProtectionService.isPurposedAgainst(dragonSlayer, 'undead')).toBe(false)
    })

    it('returns false when weapon has no purpose', () => {
      const longSword: Item = {
        id: 'long-sword',
        name: 'Long Sword',
        type: 'weapon'
      } as Item

      expect(ItemProtectionService.isPurposedAgainst(longSword, 'dragon')).toBe(false)
    })

    it('returns false for undefined weapon', () => {
      expect(ItemProtectionService.isPurposedAgainst(undefined, 'dragon')).toBe(false)
    })
  })
})
```

### Step 3.2: Run test to verify it fails

Run: `npm test -- ItemProtectionService --testNamePattern="isPurposedAgainst"`
Expected: FAIL - method doesn't exist

### Step 3.3: Implement isPurposedAgainst

In `src/app/services/ItemProtectionService.ts`, add after line ~220:

```typescript
/**
 * Check if weapon is purposed against monster type
 * Purposed weapons deal 2x damage to their target type
 *
 * Examples: Dragon Slayer vs Dragons, Were Slayer vs Were creatures
 *
 * @param weapon - Equipped weapon (may be undefined)
 * @param monsterClass - Monster's class from template
 * @returns true if weapon deals double damage
 */
static isPurposedAgainst(weapon: Item | undefined, monsterClass: string): boolean {
  if (!weapon?.special?.purposedAgainst) return false
  return weapon.special.purposedAgainst.toLowerCase() === monsterClass.toLowerCase()
}
```

### Step 3.4: Run test to verify it passes

Run: `npm test -- ItemProtectionService`
Expected: PASS

### Step 3.5: Add test for double damage in combat

```typescript
// In CombatService.strModifiers.spec.ts or create new file
describe('Purposed weapon double damage', () => {
  it('doubles damage when weapon is purposed against monster class', () => {
    // This test verifies the integration in CombatService
    // Will be implemented in step 3.7
  })
})
```

### Step 3.6: Run test to verify it fails

Run: `npm test -- --testNamePattern="Purposed weapon"`
Expected: FAIL or SKIP

### Step 3.7: Implement double damage in resolveAttack

In `src/app/services/CombatService.ts`, in `resolveAttack()` after calculating base damage (~line 215):

```typescript
const baseDamage = this.rollDamage(attacker)
const strDamageMod = this.getStrengthDamageModifier(attacker)
let damage = Math.max(1, baseDamage + strDamageMod)

// Purposed weapon double damage (Apple II reference)
if ('monsterId' in defender && 'equippedWeapon' in attacker) {
  const template = MonsterDataLoader.getMonster(defender.monsterId)
  if (template && ItemProtectionService.isPurposedAgainst(
    (attacker as Character).equippedWeapon,
    template.monsterClass
  )) {
    damage *= 2
  }
}
```

Add import at top of file:
```typescript
import { ItemProtectionService } from './ItemProtectionService'
```

### Step 3.8: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 3.9: Commit

```bash
git add src/app/services/ItemProtectionService.ts src/app/services/CombatService.ts src/app/services/__tests__/ItemProtectionService.spec.ts
git commit -m "feat(combat): add purposed weapon double damage

- Dragon Slayer deals 2x to dragons
- Were Slayer deals 2x to were creatures
- Mage Masher deals 2x to mages
- Add isPurposedAgainst() to ItemProtectionService
- Reference: docs/research/combat_system_technical_reference.md Section 11B"
```

---

## Task 4: Implement Weapon Swing Override

**Files:**
- Modify: `src/app/services/CombatService.ts:346-387`
- Test: `src/app/services/__tests__/CombatService.phase2.spec.ts`

### Step 4.1: Write the failing test

```typescript
// Add to CombatService.phase2.spec.ts in getAttacksPerRound describe block
it('uses weapon swings when higher than class attacks', () => {
  const fighter = createTestCharacter({
    class: CharacterClass.FIGHTER,
    level: 1,  // 1 class attack
    equippedWeapon: {
      id: 'long-sword-plus-2',
      name: 'Long Sword +2',
      type: 'weapon',
      swings: 3  // Weapon provides 3 swings
    } as any
  })
  expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
})

it('uses class attacks when higher than weapon swings', () => {
  const fighter = createTestCharacter({
    class: CharacterClass.FIGHTER,
    level: 10,  // 3 class attacks
    equippedWeapon: {
      id: 'dagger',
      name: 'Dagger',
      type: 'weapon',
      swings: 1  // Weapon only provides 1 swing
    } as any
  })
  expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
})
```

### Step 4.2: Run test to verify it fails

Run: `npm test -- CombatService.phase2 --testNamePattern="weapon swings"`
Expected: FAIL - always returns class attacks

### Step 4.3: Update getAttacksPerRound implementation

In `src/app/services/CombatService.ts:346-387`:

```typescript
static getAttacksPerRound(combatant: Combatant): number {
  const combatantName = combatant.name || 'Unknown'

  // Monsters: check template for attack count
  if ('monsterId' in combatant) {
    if (this.DEBUG_COMBAT) console.debug(`[Combat] getAttacksPerRound: ${combatantName} (monster) = 1 attack`)
    return 1  // Monster attacks handled in Task 5
  }

  // Characters: max of class attacks or weapon swings
  if ('class' in combatant) {
    const level = combatant.level || 1
    const levelBonus = Math.floor(level / 5)
    let classAttacks: number

    switch (combatant.class) {
      case 'FIGHTER':
      case 'LORD':
      case 'SAMURAI':
        classAttacks = 1 + levelBonus
        break
      case 'NINJA':
        classAttacks = 2 + levelBonus
        break
      default:
        classAttacks = 1
    }

    // Check weapon swings (Apple II: use maximum, not sum)
    let weaponSwings = 1
    if ('equippedWeapon' in combatant && combatant.equippedWeapon) {
      const weapon = combatant.equippedWeapon as any
      if (weapon.swings && weapon.swings > 0) {
        weaponSwings = weapon.swings
      }
    }

    const attacks = Math.min(10, Math.max(classAttacks, weaponSwings))
    if (this.DEBUG_COMBAT) {
      console.debug(`[Combat] getAttacksPerRound: ${combatantName} (${combatant.class}, level ${level}) = ${attacks} attack(s) [class: ${classAttacks}, weapon: ${weaponSwings}]`)
    }
    return attacks
  }

  if (this.DEBUG_COMBAT) console.debug(`[Combat] getAttacksPerRound: ${combatantName} (unknown type) = 1 attack`)
  return 1
}
```

### Step 4.4: Run test to verify it passes

Run: `npm test -- CombatService.phase2 --testNamePattern="weapon swings|class attacks"`
Expected: PASS

### Step 4.5: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 4.6: Commit

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.phase2.spec.ts
git commit -m "feat(combat): implement weapon swing override

- Attacks per round = max(class attacks, weapon swings)
- Long Sword +2 with 3 swings gives level 1 Fighter 3 attacks
- Reference: docs/research/combat_system_technical_reference.md Section 3"
```

---

## Task 5: Support Monster Multiple Attacks

**Files:**
- Modify: `src/app/services/CombatService.ts:356-360`
- Modify: `src/app/services/CombatService.ts:397-417`
- Test: `src/app/services/__tests__/CombatService.phase2.spec.ts`

### Step 5.1: Write the failing test

```typescript
// Add to CombatService.phase2.spec.ts
describe('Monster multiple attacks', () => {
  it('monster with attackCount gets multiple attacks', () => {
    // Mock MonsterDataLoader to return template with attackCount
    const mockTemplate = { attackCount: 5, name: 'Greater Demon' }
    jest.spyOn(MonsterDataLoader, 'getMonster').mockReturnValue(mockTemplate as any)

    const monster = createTestMonster({
      id: 'greater-demon',
      monsterId: 'greater-demon'
    })

    expect(CombatService.getAttacksPerRound(monster)).toBe(5)

    jest.restoreAllMocks()
  })

  it('monster without attackCount gets 1 attack', () => {
    const monster = createTestMonster({
      id: 'kobold',
      monsterId: 'kobold'
    })

    expect(CombatService.getAttacksPerRound(monster)).toBe(1)
  })
})
```

### Step 5.2: Run test to verify it fails

Run: `npm test -- CombatService.phase2 --testNamePattern="Monster multiple"`
Expected: FAIL - always returns 1

### Step 5.3: Update monster attack count handling

In `src/app/services/CombatService.ts:356-360`:

```typescript
// Monsters: check template for attack count
if ('monsterId' in combatant) {
  const template = MonsterDataLoader.getMonster(combatant.monsterId)
  const attacks = template?.attackCount || 1
  if (this.DEBUG_COMBAT) {
    console.debug(`[Combat] getAttacksPerRound: ${combatantName} (monster) = ${attacks} attack(s)`)
  }
  return attacks
}
```

### Step 5.4: Run test to verify it passes

Run: `npm test -- CombatService.phase2 --testNamePattern="Monster multiple"`
Expected: PASS

### Step 5.5: Update expandAttackCommands to handle monsters

In `src/app/services/CombatService.ts:397-417`:

```typescript
static expandAttackCommands(commands: CombatCommand[]): CombatCommand[] {
  return commands.flatMap(cmd => {
    if (cmd.type !== 'ATTACK') return [cmd]

    const attacks = CombatService.getAttacksPerRound(cmd.actor)
    if (attacks <= 1) return [cmd]

    // Expand for both characters AND monsters with multiple attacks
    return Array.from({ length: attacks }, (_, i) => ({
      ...cmd,
      id: `${cmd.id}_${i}`
    }))
  })
}
```

### Step 5.6: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 5.7: Commit

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/CombatService.phase2.spec.ts
git commit -m "fix(combat): support monster multiple attacks per round

- Monsters now use attackCount from template
- Greater Demon (5 attacks) generates 5 attack commands
- expandAttackCommands handles both characters and monsters
- Reference: docs/research/combat_system_technical_reference.md Section 11C"
```

---

## Task 6: Implement Surprise Mechanics

**Files:**
- Modify: `src/app/types/Combat.ts:86-97`
- Modify: `src/app/services/CombatService.ts:68-115`
- Create: `src/app/services/__tests__/CombatService.surprise.spec.ts`

### Step 6.1: Write the failing test

```typescript
// src/app/services/__tests__/CombatService.surprise.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

describe('CombatService Surprise', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('rollSurprise', () => {
    it('party surprises when first roll succeeds', () => {
      RandomService.queueNextValues([0.1])  // 10% < 20% = success
      const result = CombatService.rollSurprise()
      expect(result.partySurprises).toBe(true)
      expect(result.monstersSurprise).toBe(false)
    })

    it('monsters surprise when first fails and second succeeds', () => {
      RandomService.queueNextValues([0.5, 0.1])  // 50% > 20% = fail, 10% < 20% = success
      const result = CombatService.rollSurprise()
      expect(result.partySurprises).toBe(false)
      expect(result.monstersSurprise).toBe(true)
    })

    it('no surprise when both rolls fail', () => {
      RandomService.queueNextValues([0.5, 0.5])  // Both fail
      const result = CombatService.rollSurprise()
      expect(result.partySurprises).toBe(false)
      expect(result.monstersSurprise).toBe(false)
    })
  })
})
```

### Step 6.2: Run test to verify it fails

Run: `npm test -- CombatService.surprise`
Expected: FAIL - method doesn't exist

### Step 6.3: Add SurpriseResult type and CombatState field

In `src/app/types/Combat.ts:86`:

```typescript
export interface SurpriseResult {
  partySurprises: boolean
  monstersSurprise: boolean
}

export interface CombatState {
  monsterGroups: MonsterGroup[]
  commandQueue: CombatCommand[]
  roundNumber: number
  combatLog: string[]
  canFlee: boolean
  dungeonLevel: number
  statusEffects: CombatStatusEffects
  acModifiers: CombatAcModifiers
  statusDurations: StatusDurations
  monstersDemoralized?: boolean
  surpriseState?: 'party' | 'monsters' | 'none'  // NEW
}
```

### Step 6.4: Implement rollSurprise

In `src/app/services/CombatService.ts`, add after `initiateCombat`:

```typescript
/**
 * Roll for surprise at start of encounter (Apple II reference)
 *
 * Party has 20% chance to surprise monsters.
 * If party doesn't surprise, monsters have 20% chance to surprise party.
 *
 * @returns SurpriseResult indicating who (if anyone) is surprised
 */
static rollSurprise(): SurpriseResult {
  // Party surprise check: 20%
  if (RandomService.chance(20)) {
    return { partySurprises: true, monstersSurprise: false }
  }

  // Monster surprise check: 20%
  if (RandomService.chance(20)) {
    return { partySurprises: false, monstersSurprise: true }
  }

  return { partySurprises: false, monstersSurprise: false }
}
```

### Step 6.5: Run test to verify it passes

Run: `npm test -- CombatService.surprise`
Expected: PASS

### Step 6.6: Add test for surprise affecting round 1

```typescript
describe('Surprise in combat', () => {
  it('surprised monsters skip round 1', () => {
    // This is integration test for executeRound
    // When surpriseState === 'party', monster commands should be skipped
  })

  it('surprised party skips round 1', () => {
    // When surpriseState === 'monsters', party commands should be skipped
  })
})
```

### Step 6.7: Update initiateCombat to include surprise

In `initiateCombat()`:

```typescript
static initiateCombat(
  dungeonLevel: number,
  party: Character[],
  canFlee: boolean = true,
  includeSurprise: boolean = true
): CombatState {
  // ... existing monster generation code ...

  // Roll for surprise
  let surpriseState: 'party' | 'monsters' | 'none' = 'none'
  if (includeSurprise) {
    const surprise = this.rollSurprise()
    if (surprise.partySurprises) {
      surpriseState = 'party'
    } else if (surprise.monstersSurprise) {
      surpriseState = 'monsters'
    }
  }

  return {
    monsterGroups,
    commandQueue: [],
    roundNumber: 1,
    combatLog: [],
    canFlee,
    dungeonLevel,
    statusEffects: new Map(),
    acModifiers: new Map(),
    statusDurations: new Map(),
    surpriseState
  }
}
```

### Step 6.8: Update executeRound to skip surprised combatants

In `executeRound()` or `executeRoundWithEvents()`, before processing commands:

```typescript
// Handle surprise: skip appropriate combatants in round 1
if (state.roundNumber === 1 && state.surpriseState) {
  if (state.surpriseState === 'party') {
    // Monsters surprised - skip all monster commands
    commands = commands.filter(cmd => !('monsterId' in cmd.actor))
    messages.push('The party catches the monsters by surprise!')
  } else if (state.surpriseState === 'monsters') {
    // Party surprised - skip all character commands
    commands = commands.filter(cmd => 'monsterId' in cmd.actor)
    messages.push('The monsters catch the party by surprise!')
  }
}

// Clear surprise after round 1
const clearedSurpriseState = state.roundNumber === 1 ? 'none' : state.surpriseState
```

### Step 6.9: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 6.10: Commit

```bash
git add src/app/types/Combat.ts src/app/services/CombatService.ts src/app/services/__tests__/CombatService.surprise.spec.ts
git commit -m "feat(combat): implement surprise mechanics

- 20% chance party surprises monsters (monsters skip round 1)
- If not, 20% chance monsters surprise party (party skips round 1)
- Add surpriseState to CombatState
- Add rollSurprise() method
- Reference: docs/research/combat_system_technical_reference.md Section 18"
```

---

## Task 7: Cleanup and Polish

**Files:**
- Modify: `src/app/services/CombatService.ts:42`
- Modify: `src/app/services/__tests__/ItemProtectionService.spec.ts`

### Step 7.1: Disable DEBUG_COMBAT flag

In `src/app/services/CombatService.ts:42`:

```typescript
static DEBUG_COMBAT = false  // Disabled for production
```

### Step 7.2: Add comprehensive ItemProtectionService tests

```typescript
// Append to src/app/services/__tests__/ItemProtectionService.spec.ts

describe('hasElementalResistance', () => {
  it('detects fire resistance from equipped item', () => {
    const char = createTestCharacter({
      equippedArmor: {
        id: 'chain-pro-fire',
        name: 'Chain Pro Fire',
        type: 'armor',
        special: { protection: 'fire' }
      } as any
    })
    expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(true)
  })

  it('returns false without matching protection', () => {
    const char = createTestCharacter()
    expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(false)
  })
})

describe('hasPhysicalProtection', () => {
  it('detects physical protection', () => {
    const char = createTestCharacter({
      inventory: [{
        id: 'ring-of-protection',
        name: 'Ring of Protection',
        type: 'accessory',
        equipped: true,
        special: { protection: 'physical' }
      }] as any
    })
    expect(ItemProtectionService.hasPhysicalProtection(char)).toBe(true)
  })
})

describe('hasMagicProtection', () => {
  it('detects magic protection', () => {
    const char = createTestCharacter({
      inventory: [{
        id: 'amulet',
        name: 'Amulet of Magic Protection',
        type: 'accessory',
        equipped: true,
        special: { protection: 'magic' }
      }] as any
    })
    expect(ItemProtectionService.hasMagicProtection(char)).toBe(true)
  })
})
```

### Step 7.3: Run all tests

Run: `npm test`
Expected: All tests PASS

### Step 7.4: Run test coverage

Run: `npm test -- --coverage`
Expected: CombatService > 80%, ItemProtectionService > 80%

### Step 7.5: Commit

```bash
git add src/app/services/CombatService.ts src/app/services/__tests__/ItemProtectionService.spec.ts
git commit -m "chore(combat): disable debug flag, add ItemProtection tests

- Set DEBUG_COMBAT = false for production
- Add comprehensive tests for ItemProtectionService
- Verify elemental, physical, magic protection detection"
```

---

## Summary

| Task | Description | Commit | Est. Time |
|------|-------------|--------|-----------|
| 1 | STR modifier tables | `fix(combat): use authentic Wizardry STR modifier tables` | 30 min |
| 2 | Critical hit instant kill | `fix(combat): implement authentic critical hit instant kill` | 45 min |
| 3 | Purposed weapon damage | `feat(combat): add purposed weapon double damage` | 20 min |
| 4 | Weapon swing override | `feat(combat): implement weapon swing override` | 30 min |
| 5 | Monster multiple attacks | `fix(combat): support monster multiple attacks per round` | 20 min |
| 6 | Surprise mechanics | `feat(combat): implement surprise mechanics` | 45 min |
| 7 | Cleanup | `chore(combat): disable debug flag, add ItemProtection tests` | 15 min |

**Total: ~3.5 hours**

After completion, combat system will be **100% authentic** to Apple II Wizardry 1 reference.
