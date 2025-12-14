/**
 * Breath Action Tests
 *
 * Tests for breath weapon execution including damageResults population
 * for cinematic arena visualization.
 */

import { RandomService } from '@services/RandomService'
import { StatModifierService } from '@services/StatModifierService'
import { MonsterDataLoader } from '@services/MonsterDataLoader'
import { ClassDataLoader } from '@services/ClassDataLoader'
import { RaceService } from '@services/RaceService'
import { BreathAction } from '../BreathAction'
import { CombatContext } from '../../CombatContext'
import { ActionExecutionContext } from '../CombatAction'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { CombatCommand, MonsterGroup } from '@models/Combat'
import { Character } from '@models/Character'

describe('BreathAction', () => {
  let breathAction: BreathAction

  beforeAll(async () => {
    await Promise.all([
      StatModifierService.initialize(),
      MonsterDataLoader.loadAllMonsters(),
      ClassDataLoader.loadAllClasses(),
      RaceService.initialize()
    ])
  })

  beforeEach(() => {
    RandomService.resetSeed()
    breathAction = new BreathAction()
  })

  /**
   * Create a test context with multiple party members for breath attack testing.
   */
  function createBreathContext(partySize: number = 3): ActionExecutionContext {
    const party: Character[] = []
    const frontRow: string[] = []

    for (let i = 0; i < partySize; i++) {
      const char = createTestCharacter({
        id: `char-${i + 1}`,
        name: `Warrior ${i + 1}`,
        level: 5,
        hp: 30,
        maxHp: 30
      })
      party.push(char)
      if (i < 3) frontRow.push(char.id)
    }

    // Dragon with fire breath
    const dragon = createTestMonster({
      id: 'dragon-1',
      monsterId: 'fire-dragon',
      name: 'Fire Dragon',
      ac: 2,
      level: 10,
      hp: 50,  // Breath damage = 50 / 2 = 25
      maxHp: 50
    })

    const monsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [dragon],
      formation: 'front',
      identified: true
    }]

    const combatState = createTestCombatState({ monsterGroups })
    const context = CombatContext.create(combatState, party, frontRow)

    const command: CombatCommand = {
      type: 'BREATH',
      actor: dragon,
      target: party,  // Breath targets all party members
      initiative: 5,
      data: {
        breathType: 'fire',
        damage: 25  // Explicit damage for predictable testing
      }
    }

    return {
      state: combatState,
      command,
      parryingCombatants: new Set(),
      context
    }
  }

  describe('damageResults for cinematic display', () => {
    it('populates damageResults array with one entry per party member', () => {
      const ctx = createBreathContext(3)

      // Queue: 3 save rolls (all fail = 0.95 each)
      RandomService.queueNextValues([0.95, 0.95, 0.95])

      const result = breathAction.execute(ctx)

      expect(result.damageResults).toBeDefined()
      expect(result.damageResults).toHaveLength(3)
    })

    it('includes correct fields in each damageResult entry', () => {
      const ctx = createBreathContext(2)

      // Queue: 2 save rolls (both fail)
      RandomService.queueNextValues([0.95, 0.95])

      const result = breathAction.execute(ctx)

      expect(result.damageResults).toBeDefined()
      expect(result.damageResults![0]).toMatchObject({
        targetId: 'char-1',
        targetName: 'Warrior 1',
        value: expect.any(Number),
        type: 'damage',
        category: expect.stringMatching(/^(normal|resisted)$/)
      })
    })

    it('sets category to "normal" when no resistance or save', () => {
      const ctx = createBreathContext(1)

      // Queue: save roll fails (0.95 > resist chance)
      RandomService.queueNextValues([0.95])

      const result = breathAction.execute(ctx)

      expect(result.damageResults![0].category).toBe('normal')
    })

    it('sets category to "resisted" when character makes save', () => {
      const ctx = createBreathContext(1)

      // Queue: save roll succeeds (0.01 < resist chance)
      RandomService.queueNextValues([0.01])

      const result = breathAction.execute(ctx)

      expect(result.damageResults![0].category).toBe('resisted')
    })

    it('halves damage when character makes save', () => {
      const ctx = createBreathContext(1)

      // Queue: save roll succeeds (0.01)
      RandomService.queueNextValues([0.01])

      const result = breathAction.execute(ctx)

      // Base damage is 25, halved to 13 (ceil)
      expect(result.damageResults![0].value).toBe(13)
    })

    it('processes all 6 party members for full party breath attack', () => {
      const ctx = createBreathContext(6)

      // Queue: 6 save rolls (all fail)
      RandomService.queueNextValues([0.95, 0.95, 0.95, 0.95, 0.95, 0.95])

      const result = breathAction.execute(ctx)

      expect(result.damageResults).toHaveLength(6)

      // Verify each party member got their own entry
      const targetIds = result.damageResults!.map(r => r.targetId)
      expect(targetIds).toContain('char-1')
      expect(targetIds).toContain('char-2')
      expect(targetIds).toContain('char-3')
      expect(targetIds).toContain('char-4')
      expect(targetIds).toContain('char-5')
      expect(targetIds).toContain('char-6')
    })

    it('includes entries for characters that die from breath damage', () => {
      // Create party with low HP characters that will die
      const party: Character[] = []
      for (let i = 0; i < 2; i++) {
        party.push(createTestCharacter({
          id: `char-${i + 1}`,
          name: `Warrior ${i + 1}`,
          level: 3,
          hp: 10,  // Will die from 25 damage
          maxHp: 30
        }))
      }

      const dragon = createTestMonster({
        id: 'dragon-1',
        monsterId: 'fire-dragon',
        name: 'Fire Dragon',
        hp: 50,
        maxHp: 50
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [dragon],
        formation: 'front',
        identified: true
      }]

      const combatState = createTestCombatState({ monsterGroups })
      const context = CombatContext.create(combatState, party, ['char-1', 'char-2'])

      const command: CombatCommand = {
        type: 'BREATH',
        actor: dragon,
        target: party,
        initiative: 5,
        data: { breathType: 'fire', damage: 25 }
      }

      const ctx: ActionExecutionContext = {
        state: combatState,
        command,
        parryingCombatants: new Set(),
        context
      }

      // Queue: 2 save rolls (both fail)
      RandomService.queueNextValues([0.95, 0.95])

      const result = breathAction.execute(ctx)

      // Both characters should have damage results even though they died
      expect(result.damageResults).toHaveLength(2)
      expect(result.damageResults![0].value).toBe(25)
      expect(result.damageResults![1].value).toBe(25)
    })

    it('handles mixed save results across party members', () => {
      const ctx = createBreathContext(3)

      // Queue: char-1 fails (0.95), char-2 saves (0.01), char-3 fails (0.95)
      RandomService.queueNextValues([0.95, 0.01, 0.95])

      const result = breathAction.execute(ctx)

      expect(result.damageResults).toHaveLength(3)

      // char-1: full damage, normal category
      expect(result.damageResults![0].value).toBe(25)
      expect(result.damageResults![0].category).toBe('normal')

      // char-2: halved damage, resisted category
      expect(result.damageResults![1].value).toBe(13)
      expect(result.damageResults![1].category).toBe('resisted')

      // char-3: full damage, normal category
      expect(result.damageResults![2].value).toBe(25)
      expect(result.damageResults![2].category).toBe('normal')
    })
  })

  describe('breath damage calculation', () => {
    it('uses monster HP / 2 as base damage', () => {
      const party = [createTestCharacter({ id: 'char-1', name: 'Warrior', hp: 100, maxHp: 100 })]

      const dragon = createTestMonster({
        id: 'dragon-1',
        hp: 80,  // Breath damage = 80 / 2 = 40
        maxHp: 80
      })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [dragon],
        formation: 'front',
        identified: true
      }]

      const combatState = createTestCombatState({ monsterGroups })
      const context = CombatContext.create(combatState, party, ['char-1'])

      const command: CombatCommand = {
        type: 'BREATH',
        actor: dragon,
        target: party,
        initiative: 5,
        data: { breathType: 'fire' }  // No explicit damage - should use HP/2
      }

      const ctx: ActionExecutionContext = {
        state: combatState,
        command,
        parryingCombatants: new Set(),
        context
      }

      // Queue: save fails
      RandomService.queueNextValues([0.95])

      const result = breathAction.execute(ctx)

      // Damage should be 40 (80 / 2)
      expect(result.damageResults![0].value).toBe(40)
    })
  })
})
