// Test for monster spell level degradation mechanics (Apple II reference Section 10)
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { MonsterGroup, MonsterInstance, CombatState } from '@models/Combat'
import { createTestCharacter } from '@testing/test-factories'

describe('CombatService - Monster Spell Degradation', () => {
  /**
   * Apple II Reference (Section 10):
   * After a monster casts a mage spell, there is a 1/(groupSize+2) chance
   * the group's mage level permanently decreases by 1.
   * Priest spells do NOT degrade.
   */

  describe('initiateCombat initializes currentMageLevel', () => {
    it('sets currentMageLevel based on highest mage level in group', () => {
      // We need to test initiateCombat, which generates monsters
      // For now, verify the group structure includes currentMageLevel
      const state = CombatService.initiateCombat(1, [createTestCharacter()], true)

      // All groups should have currentMageLevel defined
      for (const group of state.monsterGroups) {
        expect(group.currentMageLevel).toBeDefined()
        // Should be 0 or a positive number based on monsters in group
        expect(typeof group.currentMageLevel).toBe('number')
      }
    })
  })

  describe('selectMonsterAction uses group mage level', () => {
    it('uses group.currentMageLevel instead of monster.mageLevel for spell selection', () => {
      // Create a monster with mageLevel 3
      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_mage',
        name: 'Test Mage',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 3,
        mageLevel: 3
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false,
        currentMageLevel: 1  // Group level is degraded to 1
      }

      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      // Queue values: 75% check passes (0.5 < 0.75), then spell selection (0.5)
      RandomService.queueNextValues([0.5, 0.5])

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow, group, [group])

      // Should cast a spell (75% chance with 0.5)
      expect(cmd.type).toBe('CAST_SPELL')
      expect(cmd.data?.spellType).toBe('mage')
      expect(cmd.data?.groupId).toBe('A')
    })

    it('does not attempt spell if group.currentMageLevel is 0', () => {
      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_mage',
        name: 'Test Mage',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 3,
        mageLevel: 3  // Monster has level, but group is depleted
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false,
        currentMageLevel: 0  // Group has exhausted spell ability
      }

      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow, group, [group])

      // Should fall through to ATTACK since mage level is 0
      expect(cmd.type).toBe('ATTACK')
    })
  })

  describe('mage spell casting triggers degradation roll', () => {
    it('includes mage spellType in command data for degradation tracking', () => {
      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_mage',
        name: 'Test Mage',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 1,
        mageLevel: 1
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false,
        currentMageLevel: 1
      }

      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      // Queue: 75% check passes, spell selection
      RandomService.queueNextValues([0.5, 0.5])

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow, group, [group])

      expect(cmd.data?.spellType).toBe('mage')
      expect(cmd.data?.groupId).toBe('A')
    })

    it('includes priest spellType for non-degrading priest spells', () => {
      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_priest',
        name: 'Test Priest',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 1,
        priestLevel: 1  // Only priest, no mage
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false,
        currentMageLevel: 0  // No mage level
      }

      const party = [createTestCharacter()]
      const frontRow = [party[0].id]

      // Queue: 75% priest check passes, spell selection
      RandomService.queueNextValues([0.5, 0.5])

      const cmd = CombatService.selectMonsterAction(monster, party, frontRow, group, [group])

      expect(cmd.type).toBe('CAST_SPELL')
      expect(cmd.data?.spellType).toBe('priest')
    })
  })

  describe('degradation probability', () => {
    it('degrades with probability 1/(aliveInGroup+2) after mage spell', () => {
      // With 1 alive monster: 1/(1+2) = 33.3% degradation chance
      // With 3 alive monsters: 1/(3+2) = 20% degradation chance
      // This test verifies the formula is correctly implemented

      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_mage',
        name: 'Test Mage',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 3,
        mageLevel: 3
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],  // 1 alive = 33.3% chance
        formation: 'front',
        identified: false,
        currentMageLevel: 3
      }

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map()
      }

      const caster = createTestCharacter({
        id: 'caster',
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      // Create a monster CAST_SPELL command with mage spellType
      const cmd = CombatService.createCommand(
        monster,
        'CAST_SPELL',
        [caster],
        { spellId: 'halito', spellType: 'mage', groupId: 'A' }
      )

      // Queue values for HALITO (fire-type spell):
      // 1. Damage roll: 0.5 → floor(0.5 * 8) + 1 = 5 damage
      // 2. Breath resistance check: 0.99 → character doesn't resist
      // 3. Degradation roll: 0.1 → 10% < 33.33% = triggers degradation
      RandomService.queueNextValues([0.5, 0.99, 0.1])

      const result = CombatService.executeCommand(state, cmd, new Set())

      // Group's mage level should be degraded
      const updatedGroup = result.newState.monsterGroups.find(g => g.id === 'A')
      expect(updatedGroup?.currentMageLevel).toBe(2)  // 3 -> 2
    })

    it('does not degrade when roll exceeds probability', () => {
      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_mage',
        name: 'Test Mage',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 3,
        mageLevel: 3
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],  // 1 alive = 33.3% chance
        formation: 'front',
        identified: false,
        currentMageLevel: 3
      }

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map()
      }

      const caster = createTestCharacter()

      const cmd = CombatService.createCommand(
        monster,
        'CAST_SPELL',
        [caster],
        { spellId: 'halito', spellType: 'mage', groupId: 'A' }
      )

      // Queue values for HALITO (fire-type spell):
      // 1. Damage roll: 0.5 → floor(0.5 * 8) + 1 = 5 damage
      // 2. Breath resistance check: 0.99 → character doesn't resist
      // 3. Degradation roll: 0.5 → 50% > 33.33% = no degradation
      RandomService.queueNextValues([0.5, 0.99, 0.5])

      const result = CombatService.executeCommand(state, cmd, new Set())

      // Group's mage level should NOT be degraded
      const updatedGroup = result.newState.monsterGroups.find(g => g.id === 'A')
      expect(updatedGroup?.currentMageLevel).toBe(3)  // Still 3
    })

    it('does not degrade priest spells', () => {
      const monster: MonsterInstance = {
        id: 'm1',
        monsterId: 'test_priest',
        name: 'Test Priest',
        hp: 20,
        maxHp: 20,
        ac: 8,
        damage: [{ dice: '1d4', min: 1, max: 4 }],
        xp: 100,
        status: 'ALIVE',
        level: 3,
        priestLevel: 3
      }

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false,
        currentMageLevel: 3  // Has mage level too
      }

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map()
      }

      const caster = createTestCharacter()

      // Priest spell - should NOT trigger degradation
      const cmd = CombatService.createCommand(
        monster,
        'CAST_SPELL',
        [caster],
        { spellId: 'badios', spellType: 'priest', groupId: 'A' }
      )

      // BADIOS (divine-type): only damage roll needed, no breath resistance check
      // Queue: [0.5] damage + [0.1] would trigger if degradation wrongly runs
      // If degradation correctly skips (priest spell), only first value consumed
      RandomService.queueNextValues([0.5, 0.1])

      const result = CombatService.executeCommand(state, cmd, new Set())

      // Group's mage level should NOT be degraded (priest spells don't degrade)
      const updatedGroup = result.newState.monsterGroups.find(g => g.id === 'A')
      expect(updatedGroup?.currentMageLevel).toBe(3)  // Still 3
    })
  })
})
