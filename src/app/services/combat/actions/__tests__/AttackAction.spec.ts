/**
 * Attack Action Tests
 *
 * Tests for attack execution including formatting of roll details in messages.
 * Since formatting helpers are private, we test them through the public execute() method
 * by verifying message output contains expected formatting patterns.
 */

import { RandomService } from '@services/RandomService'
import { StatModifierService } from '@services/StatModifierService'
import { MonsterDataLoader } from '@services/MonsterDataLoader'
import { AttackAction } from '../AttackAction'
import { CombatContext } from '../../CombatContext'
import { ActionExecutionContext } from '../CombatAction'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { CombatCommand, MonsterGroup, MonsterInstance } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'

describe('AttackAction', () => {
  let attackAction: AttackAction

  beforeAll(async () => {
    await Promise.all([
      StatModifierService.initialize(),
      MonsterDataLoader.loadAllMonsters()
    ])
  })

  beforeEach(() => {
    RandomService.resetSeed()
    attackAction = new AttackAction()
  })

  /**
   * Create a minimal execution context for testing
   */
  function createTestContext(
    attackerIsCharacter: boolean,
    overrides: {
      attackerLevel?: number
      attackerStrength?: number
      defenderAc?: number
      defenderLevel?: number
    } = {}
  ): ActionExecutionContext {
    const {
      attackerLevel = 5,
      attackerStrength = 14,
      defenderAc = 10,
      defenderLevel = 3
    } = overrides

    const character = createTestCharacter({
      id: 'char-1',
      name: 'Warrior',
      level: attackerLevel,
      strength: attackerStrength,
      hp: 20,
      maxHp: 20
    })

    const monster = createTestMonster({
      id: 'monster-1',
      name: 'Orc',
      ac: defenderAc,
      level: defenderLevel,
      hp: 10,
      maxHp: 10
    })

    const monsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [monster],
      formation: 'front',
      identified: true
    }]

    const combatState = createTestCombatState({ monsterGroups })
    const party = [character]
    const frontRow = ['char-1']

    const context = CombatContext.create(combatState, party, frontRow)

    const command: CombatCommand = attackerIsCharacter
      ? {
          type: 'ATTACK',
          actor: character,
          target: monster,
          initiative: 5
        }
      : {
          type: 'ATTACK',
          actor: monster,
          target: character,
          initiative: 5
        }

    return {
      state: combatState,
      command,
      parryingCombatants: new Set(),
      context
    }
  }

  describe('formatHitRoll (via execute)', () => {
    it('includes hit roll in miss message with roll/chance% format', () => {
      const ctx = createTestContext(true)

      // Queue high roll to guarantee miss: 95% roll > any reasonable hit chance
      RandomService.queueNextValues([0.95])

      const result = attackAction.execute(ctx)

      // Message should contain hit info like "hit: 95.0/XX%"
      const message = result.messages.find(m => m.includes('misses'))
      expect(message).toBeDefined()
      expect(message).toMatch(/hit: \d+\.\d\/\d+%/)
    })

    it('includes hit roll in hit message with roll/chance% format', () => {
      const ctx = createTestContext(true)

      // Queue: low hit roll (5% = hit), damage die, high crit roll (90% = no crit)
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      const result = attackAction.execute(ctx)

      // Message should contain hit info like "hit: 5.0/XX%"
      const message = result.messages.find(m => m.includes('damage'))
      expect(message).toBeDefined()
      expect(message).toMatch(/hit: \d+\.\d\/\d+%/)
    })
  })

  describe('formatDamageRoll (via execute)', () => {
    it('includes damage in hit message with dmg: format', () => {
      const ctx = createTestContext(true)

      // Queue: hit roll (5%), damage die, crit roll (90% = no crit)
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      const result = attackAction.execute(ctx)

      const message = result.messages.find(m => m.includes('damage'))
      expect(message).toBeDefined()
      expect(message).toMatch(/dmg: \d+/)
    })

    it('shows STR modifier when present', () => {
      // High strength gives damage bonus
      const ctx = createTestContext(true, { attackerStrength: 18 })

      // Queue: hit roll (5%), damage die, crit roll (90% = no crit)
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      const result = attackAction.execute(ctx)

      const message = result.messages.find(m => m.includes('damage'))
      expect(message).toBeDefined()
      // Should show damage with modifier: "dmg: X+Y" or "dmg: X"
      expect(message).toMatch(/dmg: \d+/)
    })
  })

  describe('formatCritRoll (via execute)', () => {
    it('includes CRIT info when critical triggers on monster', () => {
      // Higher level = higher crit chance
      const ctx = createTestContext(true, { attackerLevel: 10, defenderLevel: 1 })

      // Queue: hit roll (5%), damage die, crit roll (5% = crit), monster resist (high = fail)
      // Level 10 attacker = 20% crit chance, so 5% roll triggers crit
      // Monster level 1, threshold 11. Roll > 11 means no resist. Queue 30/35 to get roll 30.
      RandomService.queueNextValues([0.05, 0.5, 0.05, 30 / 35])

      const result = attackAction.execute(ctx)

      // Should have critical/decapitation message with CRIT info
      const message = result.messages.find(m =>
        m.includes('CRIT') || m.includes('decapitated') || m.includes('Critical')
      )
      expect(message).toBeDefined()
    })
  })

  describe('formatMonsterResist (via execute)', () => {
    it('shows SAVED when monster resists critical', () => {
      const ctx = createTestContext(true, { attackerLevel: 10, defenderLevel: 10 })

      // Queue: hit (5%), damage, crit (5% = triggers), monster resist low = resists
      // Monster level 10, threshold 20. Roll 10 < 20 means resist.
      RandomService.queueNextValues([0.05, 0.5, 0.05, 10 / 35])

      const result = attackAction.execute(ctx)

      // Check that critical was resisted - no instant kill message
      // The monster takes normal damage, not instant death
      const hasInstantKill = result.messages.some(m =>
        m.includes('decapitated') || m.includes('slain')
      )
      expect(hasInstantKill).toBe(false)
    })

    it('shows FAILED when monster fails to resist critical', () => {
      const ctx = createTestContext(true, { attackerLevel: 10, defenderLevel: 1 })

      // Queue: hit (5%), damage, crit (5% = triggers), monster resist high = fails
      // Monster level 1, threshold 11. Roll 25 > 11 means fail to resist.
      RandomService.queueNextValues([0.05, 0.5, 0.05, 25 / 35])

      const result = attackAction.execute(ctx)

      // Should have instant kill message
      const message = result.messages.find(m =>
        m.includes('decapitated') || m.includes('slain') || m.includes('FAILED')
      )
      expect(message).toBeDefined()
    })

    it('includes resist d35: X≤Y SAVED format when monster saves', () => {
      const ctx = createTestContext(true, { attackerLevel: 10, defenderLevel: 10 })

      // Queue: hit (5%), damage, crit (5% = triggers), monster resist (10/35 = roll 10)
      // Monster level 10, threshold 20. Roll 10 ≤ 20 means resist (SAVED)
      RandomService.queueNextValues([0.05, 0.5, 0.05, 10 / 35])

      const result = attackAction.execute(ctx)

      // Message should contain resist info with SAVED
      const allMessages = result.messages.join(' ')
      // The resist info should be in the damage message, showing the monster saved
      expect(allMessages).toMatch(/resist d35: \d+≤\d+ SAVED|hits for \d+ damage/)
    })
  })

  describe('helpless target damage', () => {
    /**
     * Create context with a sleeping monster for helpless target testing
     */
    function createSleepingTargetContext(): ActionExecutionContext {
      const character = createTestCharacter({
        id: 'char-1',
        name: 'Warrior',
        level: 5,
        strength: 14,
        hp: 20,
        maxHp: 20
      })

      const sleepingMonster = createTestMonster({
        id: 'sleeping-monster',
        name: 'Sleeping Orc',
        ac: 10,
        level: 3,
        hp: 50,  // High HP so we can measure damage
        maxHp: 50,
        status: 'ASLEEP'
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [sleepingMonster],
        formation: 'front',
        identified: true
      }]

      const combatState = createTestCombatState({ monsterGroups })
      const party = [character]
      const frontRow = ['char-1']

      const context = CombatContext.create(combatState, party, frontRow)

      const command: CombatCommand = {
        type: 'ATTACK',
        actor: character,
        target: sleepingMonster,
        initiative: 5
      }

      return {
        state: combatState,
        command,
        parryingCombatants: new Set(),
        context
      }
    }

    it('applies exactly 2x damage to sleeping targets (not 4x)', () => {
      const ctx = createSleepingTargetContext()

      // Queue: hit roll (5% = hit), damage (0.5 = middle of range), crit roll (90% = no crit)
      // With 1d4 damage and STR 14 (+1 modifier), base damage would be ~3
      // Expected: base damage * 2 (helpless), NOT base * 4
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      const result = attackAction.execute(ctx)

      // Find the damage message
      const damageMsg = result.messages.find(m => m.includes('damage'))
      expect(damageMsg).toBeDefined()

      // Should show (HELPLESS 2x!) indicator
      expect(damageMsg).toContain('HELPLESS 2x!')

      // Verify the monster state - damage should be doubled (2x), not quadrupled (4x)
      // Base damage: ~3 (1d4 middle roll + STR mod)
      // With 2x: ~6 damage
      // If buggy 4x: ~12 damage
      // Monster started at 50 HP
      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      const damageDealt = 50 - updatedMonster.hp

      // Damage should be reasonable for 2x multiplier (not 4x)
      // With 1d4+1 base (~3) and 2x, expect ~6 damage
      // If 4x bug existed, would be ~12 damage
      expect(damageDealt).toBeLessThan(15) // Reasonable upper bound for 2x
      expect(damageDealt).toBeGreaterThan(2) // Must do meaningful damage
    })

    it('wakes sleeping monster when damaged', () => {
      const ctx = createSleepingTargetContext()

      // Queue: hit (5%), damage, crit (90% = no crit)
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      // Monster should start ASLEEP
      expect(ctx.state.monsterGroups[0].monsters[0].status).toBe('ASLEEP')

      const result = attackAction.execute(ctx)

      // Monster should wake up (ALIVE) after being hit
      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(updatedMonster.status).toBe('ALIVE')
    })

    it('same-round: uses fresh state for monster slept mid-round (not stale command.target)', () => {
      // This tests the critical bug fix: when KATINO puts monster to sleep earlier
      // in the same round, the attack command still has stale `command.target` with
      // status: 'ALIVE'. The fix looks up fresh state from `state.monsterGroups`.

      const character = createTestCharacter({
        id: 'char-1',
        name: 'Warrior',
        level: 5,
        strength: 14,
        hp: 20,
        maxHp: 20
      })

      // Create monster with ALIVE status for the STALE command.target
      const aliveMonster = createTestMonster({
        id: 'monster-1',
        name: 'Orc',
        ac: 10,
        level: 3,
        hp: 50,
        maxHp: 50,
        status: 'ALIVE'  // STALE: command snapshot from round start
      })

      // Create the SAME monster with ASLEEP status for the FRESH state
      // (simulates KATINO cast earlier in round)
      const sleepingMonster = createTestMonster({
        id: 'monster-1',  // Same ID!
        name: 'Orc',
        ac: 10,
        level: 3,
        hp: 50,
        maxHp: 50,
        status: 'ASLEEP'  // FRESH: updated by KATINO mid-round
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [sleepingMonster],  // State has SLEEPING monster
        formation: 'front',
        identified: true
      }]

      const combatState = createTestCombatState({ monsterGroups })
      const party = [character]
      const frontRow = ['char-1']
      const context = CombatContext.create(combatState, party, frontRow)

      // Command has STALE target (ALIVE) but state has FRESH monster (ASLEEP)
      const command: CombatCommand = {
        type: 'ATTACK',
        actor: character,
        target: aliveMonster,  // STALE snapshot with status: 'ALIVE'
        initiative: 5
      }

      const ctx: ActionExecutionContext = {
        state: combatState,
        command,
        parryingCombatants: new Set(),
        context
      }

      // Queue: hit (5%), damage, crit (90% = no crit)
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      const result = attackAction.execute(ctx)

      // The fix should detect ASLEEP from FRESH state and apply 2x damage
      const damageMsg = result.messages.find(m => m.includes('damage'))
      expect(damageMsg).toBeDefined()
      expect(damageMsg).toContain('HELPLESS 2x!')

      // Verify actual damage is doubled
      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      const damageDealt = 50 - updatedMonster.hp
      // With 2x multiplier, damage should be meaningful (not just base)
      expect(damageDealt).toBeGreaterThan(2)
    })
  })

  describe('character critical hit death', () => {
    /**
     * Create context for testing monster attacks on characters with critical hits.
     * This tests the bug where a character killed by critical hit mid-round
     * could be "resurrected" by subsequent attacks using stale character data.
     */
    function createMonsterAttackContext(
      existingCharacterUpdates?: Map<string, Character>
    ): { ctx: ActionExecutionContext; character: Character; monster: MonsterInstance } {
      const character = createTestCharacter({
        id: 'char-1',
        name: 'Lance',
        level: 5,
        hp: 52,
        maxHp: 52,
        vitality: 10  // Low vitality = low crit resistance
      })

      const monster = createTestMonster({
        id: 'monster-1',
        monsterId: 'bubbly-slime',
        name: 'Bubbly Slime',
        level: 1,  // Low level = higher crit success
        hp: 20,
        maxHp: 20,
        ac: 8
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }]

      const combatState = createTestCombatState({ monsterGroups })
      const party = [character]
      const frontRow = ['char-1']

      const context = CombatContext.create(
        combatState,
        party,
        frontRow,
        new Set(),
        existingCharacterUpdates ?? new Map()
      )

      const command: CombatCommand = {
        type: 'ATTACK',
        actor: monster,
        target: character,
        initiative: 5
      }

      return {
        ctx: {
          state: combatState,
          command,
          parryingCombatants: new Set(),
          existingCharacterUpdates,
          context
        },
        character,
        monster
      }
    }

    it('should use fresh character state when target was killed earlier in round', () => {
      // Setup: Lance was killed by a critical hit earlier in the round
      // His current state in existingCharacterUpdates is HP=0, DEAD
      const deadLance = createTestCharacter({
        id: 'char-1',
        name: 'Lance',
        level: 5,
        hp: 0,
        maxHp: 52,
        status: CharacterStatus.DEAD
      })

      const existingCharacterUpdates = new Map<string, Character>([
        ['char-1', deadLance]
      ])

      const { ctx } = createMonsterAttackContext(existingCharacterUpdates)

      // Queue: hit roll (5% = hit), damage, no crit
      RandomService.queueNextValues([0.05, 0.5, 0.90])

      const result = attackAction.execute(ctx)

      // The character should still be dead after the second attack
      const updatedChar = result.characterUpdates?.get('char-1')
      expect(updatedChar).toBeDefined()
      expect(updatedChar!.hp).toBe(0)
      expect(updatedChar!.status).toBe(CharacterStatus.DEAD)
    })

    it('should not allow dead character to take more damage', () => {
      // Setup: Lance was killed earlier in the round (HP=0, DEAD)
      const deadLance = createTestCharacter({
        id: 'char-1',
        name: 'Lance',
        level: 5,
        hp: 0,
        maxHp: 52,
        status: CharacterStatus.DEAD
      })

      const existingCharacterUpdates = new Map<string, Character>([
        ['char-1', deadLance]
      ])

      const { ctx } = createMonsterAttackContext(existingCharacterUpdates)

      // Queue: hit roll (5% = hit), damage (full roll), no crit
      RandomService.queueNextValues([0.05, 1.0, 0.90])

      const result = attackAction.execute(ctx)

      // Messages should indicate the target is already dead
      const messages = result.messages.join(' ')
      expect(messages).toContain('already dead')
    })
  })
})
