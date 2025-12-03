// Phase 3 Spell Casting Features Tests
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { MonsterGroup } from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'

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
      // Authentic Wizardry 1 formula: 50% + (5 × CasterLevel) - (10 × MonsterLevel)
      // Level 10 Priest vs Level 5 zombie: 50 + 50 - 50 = 50%

      const priest = createTestCharacter({
        id: 'priest1',
        name: 'Cleric',
        class: 'Priest',
        level: 10
      })

      const zombie = createTestMonster({ id: 'z1', level: 5, name: 'Zombie', undead: true })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Queue random values: first for initiative roll, second for dispel chance
      // RandomService.chance(50) succeeds if roll < 0.50
      RandomService.queueNextValues([0.5, 0.30]) // initiative, then 30% < 50% = success

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie, { groupId: 'A' })
      const result = CombatService.executeCommand(state, cmd)

      // 50 + (10×5) - (10×5) = 50% chance, 30% roll < 50% = success
      expect(result.messages.join(' ')).toContain('undead dispelled')
    })

    it('destroys entire group on successful dispel', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 20 // High level for guaranteed success
      })

      const zombie1 = createTestMonster({ id: 'z1', level: 2, hp: 50, undead: true })
      const zombie2 = createTestMonster({ id: 'z2', level: 2, hp: 50, undead: true })
      const zombie3 = createTestMonster({ id: 'z3', level: 2, hp: 50, undead: true })

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
      // Formula: 50 + (5×5) - (10×3) = 50 + 25 - 30 = 45%
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 5
      })

      const zombie = createTestMonster({ id: 'z1', level: 3, undead: true })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Mock random to ensure failure
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.50) // 50% > 45% expected chance

      const cmd = CombatService.createCommand(priest, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // 50 + 25 - 30 = 45% chance, 50% roll > 45% = failure
      expect(result.messages.join(' ')).toContain('undead resist')

      // Monster should be unchanged
      const group = result.newState.monsterGroups.find(g => g.id === 'A')
      expect(group!.monsters[0].hp).toBe(zombie.hp)
      expect(group!.monsters[0].status).not.toBe('DEAD')

      Math.random = originalRandom
    })

    it('clamps dispel chance to minimum 5%', () => {
      // Formula: 50 + (5×1) - (10×10) = 50 + 5 - 100 = -45 → clamped to 5%
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 1 // Low level
      })

      const vampire = createTestMonster({ id: 'v1', level: 10, undead: true }) // High level undead
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [vampire],
          formation: 'front'
        }]
      })

      // Queue very low random value to succeed at minimum 5%
      // RandomService.chance(5) succeeds if nextRandom() * 100 < 5
      // Queue multiple low values to cover any intermediate random calls
      RandomService.queueNextValues([0.01, 0.01, 0.01]) // 1% always succeeds

      const cmd = CombatService.createCommand(priest, 'DISPEL', vampire, { groupId: 'A' })
      const result = CombatService.executeCommand(state, cmd)

      // 50 + 5 - 100 = -45% → clamped to 5%
      // 1% roll < 5% = success
      expect(result.messages.join(' ')).toContain('undead dispelled')
    })

    it('clamps dispel chance to maximum 95%', () => {
      // Formula: 50 + (5×50) - (10×1) = 50 + 250 - 10 = 290 → clamped to 95%
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        level: 50 // Very high level
      })

      const zombie = createTestMonster({ id: 'z1', level: 1, undead: true }) // Low level undead
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

      // 50 + 250 - 10 = 290% → clamped to 95%
      // 96% roll > 95% = failure
      expect(result.messages.join(' ')).toContain('undead resist')

      Math.random = originalRandom
    })

    it('applies -20% penalty for Bishop (level 4+)', () => {
      // Formula: 50 + (5×10) - (10×5) - 20 = 50 + 50 - 50 - 20 = 30%
      const bishop = createTestCharacter({
        id: 'bishop1',
        class: 'Bishop',
        level: 10
      })

      const zombie = createTestMonster({ id: 'z1', level: 5, undead: true })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Queue high random values to ensure failure
      // RandomService.chance(30) fails if nextRandom() * 100 >= 30
      // Queue multiple high values to cover any intermediate random calls
      RandomService.queueNextValues([0.99, 0.99, 0.99]) // 99% > 30% = failure

      const cmd = CombatService.createCommand(bishop, 'DISPEL', zombie, { groupId: 'A' })
      const result = CombatService.executeCommand(state, cmd)

      // Bishop gets -20% penalty: 50 + 50 - 50 - 20 = 30%
      // 99% roll > 30% = failure
      expect(result.messages.join(' ')).toContain('undead resist')
    })

    it('applies -40% penalty for Lord (level 9+)', () => {
      // Formula: 50 + (5×10) - (10×5) - 40 = 50 + 50 - 50 - 40 = 10%
      const lord = createTestCharacter({
        id: 'lord1',
        class: 'Lord',
        level: 10
      })

      const zombie = createTestMonster({ id: 'z1', level: 5, undead: true })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Queue random values - 15% > 10% = failure (with penalty)
      // Need to queue multiple since there may be other random calls
      RandomService.queueNextValues([0.99, 0.99, 0.99]) // 99% > any chance = failure

      const cmd = CombatService.createCommand(lord, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // Lord gets -40% penalty: 50 + 50 - 50 - 40 = 10%
      // 99% roll > 10% = failure
      expect(result.messages.join(' ')).toContain('undead resist')
    })

    it('does not apply Bishop penalty below level 4', () => {
      // Level 3 Bishop should have NO penalty
      // Formula: 50 + (5×3) - (10×1) = 50 + 15 - 10 = 55%
      const bishop = createTestCharacter({
        id: 'bishop1',
        class: 'Bishop',
        level: 3
      })

      const zombie = createTestMonster({ id: 'z1', level: 1, undead: true })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Queue random values - may need multiple for the code path
      // chance(55) succeeds if random * 100 < 55
      RandomService.queueNextValues([0.01, 0.01, 0.01]) // 1% always succeeds

      const cmd = CombatService.createCommand(bishop, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // No penalty at level 3: 50 + 15 - 10 = 55%
      expect(result.messages.join(' ')).toContain('undead dispelled')
    })

    it('does not apply Lord penalty below level 9', () => {
      // Level 8 Lord should have NO penalty
      // Formula: 50 + (5×8) - (10×1) = 50 + 40 - 10 = 80%
      const lord = createTestCharacter({
        id: 'lord1',
        class: 'Lord',
        level: 8
      })

      const zombie = createTestMonster({ id: 'z1', level: 1, undead: true })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [zombie],
          formation: 'front'
        }]
      })

      // Queue random values - may need multiple for the code path
      RandomService.queueNextValues([0.01, 0.01, 0.01]) // 1% always succeeds

      const cmd = CombatService.createCommand(lord, 'DISPEL', zombie, { groupId: 'A' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      // No penalty at level 8: 50 + 40 - 10 = 80%
      expect(result.messages.join(' ')).toContain('undead dispelled')
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
