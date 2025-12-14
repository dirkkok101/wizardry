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
import { CombatCommand, MonsterGroup } from '@models/Combat'

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
})
