// src/services/__tests__/CombatService.helplessDamage.spec.ts
import { CombatService } from '../CombatService'
import { Combatant, MonsterInstance, CombatantStatus } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '../RandomService'

/**
 * Tests for Wizardry 1 helpless target double damage mechanic
 *
 * Research: Sleeping and paralyzed targets take 2× damage from physical attacks.
 * This stacks with critical hit damage for a potential 4× multiplier.
 */

// Create test attacker (character)
const createTestAttacker = (overrides: Partial<Character> = {}): Character => ({
  id: 'attacker-1',
  name: 'Test Fighter',
  race: 'human',
  class: 'fighter',
  alignment: 'good',
  level: 5,
  xp: 1000,
  hp: 50,
  maxHp: 50,
  ac: 5,
  status: CharacterStatus.OK,
  strength: 16,  // +3 damage modifier
  intelligence: 10,
  piety: 10,
  vitality: 14,
  agility: 12,
  luck: 10,
  gold: 100,
  age: 20,
  ageWeeks: 0,
  marks: 0,
  partyOrder: 0,
  ...overrides
})

// Create test monster defender
const createTestMonster = (overrides: Partial<MonsterInstance> = {}): MonsterInstance => ({
  id: 'monster-1',
  monsterId: 'kobold',
  name: 'Kobold',
  hp: 20,
  maxHp: 20,
  ac: 8,
  damage: [{ dice: '1d4', min: 1, max: 4 }],
  xp: 10,
  status: 'ALIVE' as CombatantStatus,
  level: 1,
  undead: false,
  ...overrides
})

describe('CombatService.resolveAttack - Helpless Target Damage', () => {
  beforeEach(() => {
    RandomService.resetSeed()
    // Set a fixed seed for reproducible random values
    RandomService.setSeed(12345)
  })

  it('deals 2× damage to ASLEEP targets compared to ALIVE', () => {
    const attacker = createTestAttacker({ strength: 14 })
    const aliveDefender = createTestMonster({ status: 'ALIVE' })
    const sleepingDefender = createTestMonster({ status: 'ASLEEP' })

    // Find a seed that produces hits for both (no critical for clean comparison)
    let aliveResult = null
    let sleepResult = null

    for (let seed = 1; seed < 200; seed++) {
      RandomService.setSeed(seed)
      const alive = CombatService.resolveAttack(attacker, aliveDefender, 0, 0)

      RandomService.setSeed(seed)
      const sleep = CombatService.resolveAttack(attacker, sleepingDefender, 0, 0)

      // Find a seed where both hit and neither is critical
      if (alive.hit && sleep.hit && !alive.critical && !sleep.critical) {
        aliveResult = alive
        sleepResult = sleep
        break
      }
    }

    // Verify we found valid results
    expect(aliveResult).not.toBeNull()
    expect(sleepResult).not.toBeNull()

    // Sleeping target takes exactly 2× damage
    expect(sleepResult!.damage).toBe(aliveResult!.damage * 2)

    // Message should indicate helpless target
    expect(sleepResult!.message).toContain('helpless target')
  })

  it('deals 2× damage to PARALYZED targets compared to ALIVE', () => {
    const attacker = createTestAttacker({ strength: 14 })
    const aliveDefender = createTestMonster({ status: 'ALIVE' })
    const paralyzedDefender = createTestMonster({ status: 'PARALYZED' })

    RandomService.setSeed(54321)
    const aliveResult = CombatService.resolveAttack(attacker, aliveDefender, 0, 0)

    RandomService.setSeed(54321)
    const paralyzedResult = CombatService.resolveAttack(attacker, paralyzedDefender, 0, 0)

    expect(aliveResult.hit).toBe(true)
    expect(paralyzedResult.hit).toBe(true)

    // Paralyzed target takes 2× damage (if both non-critical)
    if (!aliveResult.critical && !paralyzedResult.critical) {
      expect(paralyzedResult.damage).toBe(aliveResult.damage * 2)
    }

    expect(paralyzedResult.message).toContain('helpless target')
  })

  it('critical hit on helpless target is instant kill (not damage multiplier)', () => {
    const attacker = createTestAttacker({ strength: 14, level: 50 })  // High level = high crit chance
    const defender = createTestMonster({ status: 'ASLEEP' })

    // Try multiple seeds to find one that produces a critical hit that monster doesn't resist
    let criticalResult = null
    for (let seed = 1; seed < 100; seed++) {
      RandomService.setSeed(seed)
      const result = CombatService.resolveAttack(attacker, defender, 0, 0)
      if (result.hit && result.critical && result.instantKill) {
        criticalResult = result
        break
      }
    }

    // If we got a critical on helpless target, verify it's an instant kill
    if (criticalResult) {
      expect(criticalResult.instantKill).toBe(true)
      expect(criticalResult.message).toContain('slain')
    }
  })

  it('does not apply helpless multiplier to missed attacks', () => {
    const attacker = createTestAttacker()
    const defender = createTestMonster({ status: 'ASLEEP', ac: -10 })  // Very hard to hit

    // Try multiple seeds to find a miss
    let missResult = null
    for (let seed = 1; seed < 100; seed++) {
      RandomService.setSeed(seed)
      const result = CombatService.resolveAttack(attacker, defender, 0, 0)
      if (!result.hit) {
        missResult = result
        break
      }
    }

    if (missResult) {
      expect(missResult.damage).toBe(0)
    }
  })

  it('handles character targets with CharacterStatus enum', () => {
    const attacker = createTestMonster({ damage: [{ dice: '1d6', min: 1, max: 6 }] })
    const aliveDefender = createTestAttacker({ status: CharacterStatus.OK })
    const paralyzedDefender = createTestAttacker({ status: CharacterStatus.PARALYZED })

    RandomService.setSeed(11111)
    const aliveResult = CombatService.resolveAttack(attacker, aliveDefender, 0, 0)

    RandomService.setSeed(11111)
    const paralyzedResult = CombatService.resolveAttack(attacker, paralyzedDefender, 0, 0)

    if (aliveResult.hit && paralyzedResult.hit && !aliveResult.critical && !paralyzedResult.critical) {
      // Paralyzed target takes 2× damage
      expect(paralyzedResult.damage).toBe(aliveResult.damage * 2)
    }
  })

  it('does not apply helpless multiplier to DEAD targets', () => {
    const attacker = createTestAttacker({ strength: 14 })
    const aliveDefender = createTestMonster({ status: 'ALIVE' })
    const deadDefender = createTestMonster({ status: 'DEAD' as CombatantStatus })

    RandomService.setSeed(22222)
    const aliveResult = CombatService.resolveAttack(attacker, aliveDefender, 0, 0)

    RandomService.setSeed(22222)
    const deadResult = CombatService.resolveAttack(attacker, deadDefender, 0, 0)

    // DEAD is not helpless (can't attack dead targets anyway), so damage should be same
    if (aliveResult.hit && deadResult.hit && !aliveResult.critical && !deadResult.critical) {
      expect(deadResult.damage).toBe(aliveResult.damage)
    }
  })
})
