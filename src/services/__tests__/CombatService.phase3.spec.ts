// Phase 3 Spell Casting Features Tests
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'
import { MonsterGroup } from '../../types/Combat'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('CombatService - Phase 3: Spell Casting', () => {
  describe('CAST_SPELL Action', () => {
    it('executes cast spell command successfully', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        name: 'Gandalf',
        class: 'Mage',
        level: 3,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 1, max: 1 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster = createTestMonster({ hp: 100 })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(result.messages.join(' ')).toContain('Gandalf')
      expect(result.messages.join(' ')).toContain('HALITO')
    })

    it('fails when character has no spell points', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        name: 'Gandalf',
        class: 'Mage',
        level: 3,
        spellPoints: {
          mage: {
            level1: { current: 0, max: 3 },  // No points!
            level2: { current: 0, max: 2 },
            level3: { current: 0, max: 1 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster = createTestMonster()
      const state = createTestCombatState()

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(result.messages.join(' ')).toContain('cannot cast spell')
    })

    it('applies damage to target monster', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        level: 3,
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

      const monster = createTestMonster({ id: 'm1', hp: 100 })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // Mock spell effect to return fixed damage
      jest.spyOn(SpellCastingService, 'resolveSpellEffect').mockReturnValue({
        damage: [10],
        message: 'deals 10 damage!'
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(updatedMonster.hp).toBe(90) // 100 - 10

      jest.restoreAllMocks()
    })

    it('tracks spell casters in executeRound', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        level: 3,
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

      const monster = createTestMonster({ hp: 100 })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      const castSpellCmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      state.commandQueue = [castSpellCmd]

      const result = CombatService.executeRound(state, [mage])

      expect(result.spellCasters.has('mage1')).toBe(true)
      expect(result.spellCasters.get('mage1')?.spellId).toBe('halito')
    })
  })

  describe('DISPEL (Turn Undead) Action', () => {
    it('calculates correct dispel chance based on level difference', () => {
      // Test formula: (CasterLevel - UndeadLevel) × 10, clamped to 5-95%

      const priest = createTestCharacter({
        id: 'priest1',
        name: 'Cleric',
        class: 'Priest',
        level: 10
      })

      const zombie = createTestMonster({ id: 'z1', level: 5, name: 'Zombie' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Mock random to always succeed
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.3) // 30% < 50% expected chance

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // (10 - 5) × 10 = 50% chance, 30% roll < 50% = success
      expect(result.messages.join(' ')).toContain('undead destroyed')

      Math.random = originalRandom
    })

    it('destroys entire group on successful dispel', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 20 // High level for guaranteed success
      })

      const zombie1 = createTestMonster({ id: 'z1', level: 2, hp: 50 })
      const zombie2 = createTestMonster({ id: 'z2', level: 2, hp: 50 })
      const zombie3 = createTestMonster({ id: 'z3', level: 2, hp: 50 })

      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie1, zombie2, zombie3],
          formation: 'front'
        }]
      })

      // Mock random to ensure success
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.01) // 1% < 95% (capped chance)

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie1, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // All monsters in group should be dead
      const group = result.newState.monsterGroups.find(g => g.id === 'A')
      expect(group).toBeDefined()
      expect(group!.monsters.every(m => m.hp === 0 && m.status === 'DEAD')).toBe(true)

      Math.random = originalRandom
    })

    it('fails when roll exceeds dispel chance', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 5
      })

      const zombie = createTestMonster({ id: 'z1', level: 3 })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Mock random to ensure failure
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.90) // 90% > 20% expected chance

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // (5 - 3) × 10 = 20% chance, 90% roll > 20% = failure
      expect(result.messages.join(' ')).toContain('undead resist')

      // Monster should be unchanged
      const group = result.newState.monsterGroups.find(g => g.id === 'A')
      expect(group!.monsters[0].hp).toBe(zombie.hp)
      expect(group!.monsters[0].status).not.toBe('DEAD')

      Math.random = originalRandom
    })

    it('clamps dispel chance to minimum 5%', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 1 // Low level
      })

      const vampire = createTestMonster({ id: 'v1', level: 10 }) // High level undead
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [vampire],
          formation: 'front'
        }]
      })

      // Mock random to succeed at 4% (below 5% minimum)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.04) // 4% < 5% minimum

      const cmd = CombatService.createCommand(priest, 'DISPEL', vampire, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // (1 - 10) × 10 = -90 → clamped to 5%
      // 4% roll < 5% = success
      expect(result.messages.join(' ')).toContain('undead destroyed')

      Math.random = originalRandom
    })

    it('clamps dispel chance to maximum 95%', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 50 // Very high level
      })

      const zombie = createTestMonster({ id: 'z1', level: 1 }) // Low level undead
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Mock random to fail at 96% (above 95% maximum)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.96) // 96% > 95% maximum

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // (50 - 1) × 10 = 490 → clamped to 95%
      // 96% roll > 95% = failure
      expect(result.messages.join(' ')).toContain('undead resist')

      Math.random = originalRandom
    })

    it('requires groupId in command data', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 10
      })

      const zombie = createTestMonster()
      const state = createTestCombatState()

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie) // No groupId!
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(result.messages.join(' ')).toContain('no group targeted')
    })
  })

  describe('Spell Point Deduction', () => {
    it('deducts spell points correctly', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        spellPoints: {
          mage: {
            level1: { current: 5, max: 5 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const updatedMage = SpellCastingService.deductSpellPoints(mage, 'halito')

      expect(updatedMage.spellPoints?.mage?.level1.current).toBe(4)
      expect(updatedMage.spellPoints?.mage?.level1.max).toBe(5)
    })
  })
})
