// Phase 5 Status Effect Spells Tests
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'

describe('CombatService - Phase 5: Status Effect Spells', () => {
  describe('KATINO (Sleep) Spell', () => {
    it('puts target monster to sleep', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
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

      const monster = createTestMonster({ id: 'm1', hp: 50, status: 'ALIVE' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'katino' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(updatedMonster.status).toBe('ASLEEP')
      expect(result.message).toContain('KATINO')
      expect(result.message).toContain('sleep')
    })

    it('does not put dead monsters to sleep', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
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

      const deadMonster = createTestMonster({ id: 'm1', hp: 0, status: 'DEAD' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [deadMonster],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', deadMonster, { spellId: 'katino' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(updatedMonster.status).toBe('DEAD') // Still dead
    })

    it('puts multiple monsters to sleep when targeting group', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
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

      const monster1 = createTestMonster({ id: 'm1', status: 'ALIVE' })
      const monster2 = createTestMonster({ id: 'm2', status: 'ALIVE' })
      const monster3 = createTestMonster({ id: 'm3', status: 'ALIVE' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster1, monster2, monster3],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', [monster1, monster2, monster3], { spellId: 'katino' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      const updatedMonsters = result.newState.monsterGroups[0].monsters
      expect(updatedMonsters[0].status).toBe('ASLEEP')
      expect(updatedMonsters[1].status).toBe('ASLEEP')
      expect(updatedMonsters[2].status).toBe('ASLEEP')
    })
  })

  describe('DILTO (Blind) Spell', () => {
    it('blinds target monster', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        spellPoints: {
          mage: {
            level1: { current: 0, max: 0 },
            level2: { current: 3, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster = createTestMonster({ id: 'm1' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'dilto' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(CombatService.hasStatusEffect(result.newState, 'm1', 'BLIND')).toBe(true)
      expect(result.message).toContain('DILTO')
      expect(result.message).toContain('blind')
    })

    it('blinds multiple monsters when targeting group', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        spellPoints: {
          mage: {
            level1: { current: 0, max: 0 },
            level2: { current: 3, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster1 = createTestMonster({ id: 'm1' })
      const monster2 = createTestMonster({ id: 'm2' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster1, monster2],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', [monster1, monster2], { spellId: 'dilto' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(CombatService.hasStatusEffect(result.newState, 'm1', 'BLIND')).toBe(true)
      expect(CombatService.hasStatusEffect(result.newState, 'm2', 'BLIND')).toBe(true)
    })

    it('blinded monsters have -4 attack penalty', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        spellPoints: {
          mage: {
            level1: { current: 0, max: 0 },
            level2: { current: 3, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster = createTestMonster({ id: 'm1', strength: 18 })
      const target = createTestCharacter({ id: 'char1' })
      let state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // First, blind the monster
      const blindCmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'dilto' })
      const parryingCombatants = new Set<string>()
      const blindResult = CombatService.executeCommand(state, blindCmd, parryingCombatants)
      state = blindResult.newState

      // Now the blind monster attacks
      const attackCmd = CombatService.createCommand(monster, 'ATTACK', target)
      const calculateHitChanceSpy = jest.spyOn(CombatService as any, 'calculateHitChance')

      CombatService.executeCommand(state, attackCmd, parryingCombatants)

      // Verify -4 penalty was applied
      expect(calculateHitChanceSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        -4
      )

      calculateHitChanceSpy.mockRestore()
    })
  })

  describe('MONTINO (Silence) Spell', () => {
    it('silences target monster', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        spellPoints: {
          priest: {
            level1: { current: 0, max: 0 },
            level2: { current: 3, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster = createTestMonster({ id: 'm1' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(priest, 'CAST_SPELL', monster, { spellId: 'montino' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(CombatService.hasStatusEffect(result.newState, 'm1', 'SILENCED')).toBe(true)
      expect(result.message).toContain('MONTINO')
      expect(result.message).toContain('silence')
    })

    it('silences multiple monsters when targeting group', () => {
      const priest = createTestCharacter({
        id: 'priest1',
        class: 'Priest',
        spellPoints: {
          priest: {
            level1: { current: 0, max: 0 },
            level2: { current: 3, max: 3 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster1 = createTestMonster({ id: 'm1' })
      const monster2 = createTestMonster({ id: 'm2' })
      const monster3 = createTestMonster({ id: 'm3' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster1, monster2, monster3],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(priest, 'CAST_SPELL', [monster1, monster2, monster3], { spellId: 'montino' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(CombatService.hasStatusEffect(result.newState, 'm1', 'SILENCED')).toBe(true)
      expect(CombatService.hasStatusEffect(result.newState, 'm2', 'SILENCED')).toBe(true)
      expect(CombatService.hasStatusEffect(result.newState, 'm3', 'SILENCED')).toBe(true)
    })
  })

  describe('SpellCastingService Status Effect Integration', () => {
    it('resolveSpellEffect returns status effects for KATINO', () => {
      const caster = createTestCharacter()
      const targets = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('katino', caster, targets)

      expect(effect.statusEffects).toHaveLength(2)
      expect(effect.statusEffects![0]).toEqual({ target: 'm1', effect: 'ASLEEP' })
      expect(effect.statusEffects![1]).toEqual({ target: 'm2', effect: 'ASLEEP' })
      expect(effect.message).toContain('KATINO')
      expect(effect.message).toContain('sleep')
    })

    it('resolveSpellEffect returns status effects for DILTO', () => {
      const caster = createTestCharacter()
      const targets = [createTestMonster({ id: 'm1' })]

      const effect = SpellCastingService.resolveSpellEffect('dilto', caster, targets)

      expect(effect.statusEffects).toHaveLength(1)
      expect(effect.statusEffects![0]).toEqual({ target: 'm1', effect: 'BLIND' })
      expect(effect.message).toContain('DILTO')
      expect(effect.message).toContain('blind')
    })

    it('resolveSpellEffect returns status effects for MONTINO', () => {
      const caster = createTestCharacter()
      const targets = [createTestMonster({ id: 'm1' })]

      const effect = SpellCastingService.resolveSpellEffect('montino', caster, targets)

      expect(effect.statusEffects).toHaveLength(1)
      expect(effect.statusEffects![0]).toEqual({ target: 'm1', effect: 'SILENCED' })
      expect(effect.message).toContain('MONTINO')
      expect(effect.message).toContain('silence')
    })
  })

  describe('Status Effect Spell Integration', () => {
    it('tracks spell casters when casting status effect spells', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
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

      const monster = createTestMonster()
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'katino' })
      state.commandQueue = [cmd]

      const result = CombatService.executeRound(state, [mage])

      expect(result.spellCasters.has('mage1')).toBe(true)
      expect(result.spellCasters.get('mage1')?.spellId).toBe('katino')
    })

    it('sleeping monster wakes up when damaged', () => {
      const character = createTestCharacter({ id: 'char1', strength: 18 })
      const monster = createTestMonster({ id: 'm1', hp: 50, status: 'ASLEEP' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // Mock resolveAttack to return a guaranteed hit
      jest.spyOn(CombatService as any, 'resolveAttack').mockReturnValue({
        hit: true,
        damage: 10,
        critical: false,
        message: 'Hit for 10 damage'
      })

      const cmd = CombatService.createCommand(character, 'ATTACK', monster)
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      const updatedMonster = result.newState.monsterGroups[0].monsters[0]
      expect(updatedMonster.hp).toBe(40) // 50 - 10
      expect(updatedMonster.status).toBe('ALIVE') // Woke up!

      jest.restoreAllMocks()
    })

    it('combines status effects with damage spells', () => {
      const mage = createTestCharacter({
        id: 'mage1',
        class: 'Mage',
        spellPoints: {
          mage: {
            level1: { current: 5, max: 5 },
            level2: { current: 5, max: 5 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const monster = createTestMonster({ id: 'm1', hp: 100 })
      let state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // First cast HALITO (damage)
      const halitoCmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      const parryingCombatants = new Set<string>()
      let result = CombatService.executeCommand(state, halitoCmd, parryingCombatants)
      state = result.newState

      // Then cast DILTO (blind)
      const diltoCmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'dilto' })
      result = CombatService.executeCommand(state, diltoCmd, parryingCombatants)
      state = result.newState

      // Monster should be damaged and blind
      const updatedMonster = state.monsterGroups[0].monsters[0]
      expect(updatedMonster.hp).toBeLessThan(100) // Damaged by HALITO
      expect(CombatService.hasStatusEffect(state, 'm1', 'BLIND')).toBe(true)
    })
  })
})
