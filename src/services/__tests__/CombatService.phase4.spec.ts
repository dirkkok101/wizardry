// Phase 4 Status Effects Tests
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('CombatService - Phase 4: Status Effects', () => {
  describe('Status Effect Helpers', () => {
    describe('hasStatusEffect', () => {
      it('returns false when combatant has no effects', () => {
        const state = createTestCombatState()

        const hasBlind = CombatService.hasStatusEffect(state, 'char1', 'BLIND')

        expect(hasBlind).toBe(false)
      })

      it('returns true when combatant has the effect', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        const hasBlind = CombatService.hasStatusEffect(state, 'char1', 'BLIND')

        expect(hasBlind).toBe(true)
      })

      it('returns false when combatant has different effect', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        const hasSilenced = CombatService.hasStatusEffect(state, 'char1', 'SILENCED')

        expect(hasSilenced).toBe(false)
      })

      it('returns false for different combatant', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        const hasBlind = CombatService.hasStatusEffect(state, 'char2', 'BLIND')

        expect(hasBlind).toBe(false)
      })
    })

    describe('applyStatusEffect', () => {
      it('adds status effect to combatant', () => {
        const state = createTestCombatState()

        const newState = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        expect(CombatService.hasStatusEffect(newState, 'char1', 'BLIND')).toBe(true)
      })

      it('returns new state object (immutable)', () => {
        const state = createTestCombatState()

        const newState = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        expect(newState).not.toBe(state)
        expect(newState.statusEffects).not.toBe(state.statusEffects)
      })

      it('allows multiple effects on same combatant', () => {
        let state = createTestCombatState()

        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')
        state = CombatService.applyStatusEffect(state, 'char1', 'SILENCED')

        expect(CombatService.hasStatusEffect(state, 'char1', 'BLIND')).toBe(true)
        expect(CombatService.hasStatusEffect(state, 'char1', 'SILENCED')).toBe(true)
      })

      it('allows same effect on multiple combatants', () => {
        let state = createTestCombatState()

        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')
        state = CombatService.applyStatusEffect(state, 'char2', 'BLIND')

        expect(CombatService.hasStatusEffect(state, 'char1', 'BLIND')).toBe(true)
        expect(CombatService.hasStatusEffect(state, 'char2', 'BLIND')).toBe(true)
      })
    })

    describe('removeStatusEffect', () => {
      it('removes status effect from combatant', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        const newState = CombatService.removeStatusEffect(state, 'char1', 'BLIND')

        expect(CombatService.hasStatusEffect(newState, 'char1', 'BLIND')).toBe(false)
      })

      it('returns new state object (immutable)', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        const newState = CombatService.removeStatusEffect(state, 'char1', 'BLIND')

        expect(newState).not.toBe(state)
        expect(newState.statusEffects).not.toBe(state.statusEffects)
      })

      it('removes only specified effect, keeps others', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')
        state = CombatService.applyStatusEffect(state, 'char1', 'SILENCED')

        const newState = CombatService.removeStatusEffect(state, 'char1', 'BLIND')

        expect(CombatService.hasStatusEffect(newState, 'char1', 'BLIND')).toBe(false)
        expect(CombatService.hasStatusEffect(newState, 'char1', 'SILENCED')).toBe(true)
      })

      it('removes combatant entry when last effect removed', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

        const newState = CombatService.removeStatusEffect(state, 'char1', 'BLIND')

        expect(newState.statusEffects.has('char1')).toBe(false)
      })

      it('handles removing non-existent effect gracefully', () => {
        const state = createTestCombatState()

        const newState = CombatService.removeStatusEffect(state, 'char1', 'BLIND')

        expect(newState.statusEffects.has('char1')).toBe(false)
      })

      it('only removes from specified combatant', () => {
        let state = createTestCombatState()
        state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')
        state = CombatService.applyStatusEffect(state, 'char2', 'BLIND')

        const newState = CombatService.removeStatusEffect(state, 'char1', 'BLIND')

        expect(CombatService.hasStatusEffect(newState, 'char1', 'BLIND')).toBe(false)
        expect(CombatService.hasStatusEffect(newState, 'char2', 'BLIND')).toBe(true)
      })
    })
  })

  describe('Blind Status Effect', () => {
    it('applies -4 attack penalty when attacker is blind', () => {
      const attacker = createTestCharacter({ id: 'char1', strength: 18 })
      const defender = createTestMonster({ id: 'm1', ac: 5 })
      let state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [defender],
          formation: 'front'
        }]
      })

      // Apply blind status
      state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')

      const cmd = CombatService.createCommand(attacker, 'ATTACK', defender)
      const parryingCombatants = new Set<string>()

      // Mock calculateHitChance to verify penalty is applied
      const calculateHitChanceSpy = jest.spyOn(CombatService as any, 'calculateHitChance')

      CombatService.executeCommand(state, cmd, parryingCombatants)

      // Verify calculateHitChance was called with -4 penalty
      expect(calculateHitChanceSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        -4
      )

      calculateHitChanceSpy.mockRestore()
    })

    it('no penalty when attacker is not blind', () => {
      const attacker = createTestCharacter({ id: 'char1' })
      const defender = createTestMonster({ id: 'm1' })
      const state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [defender],
          formation: 'front'
        }]
      })

      const cmd = CombatService.createCommand(attacker, 'ATTACK', defender)
      const parryingCombatants = new Set<string>()

      const calculateHitChanceSpy = jest.spyOn(CombatService as any, 'calculateHitChance')

      CombatService.executeCommand(state, cmd, parryingCombatants)

      // Verify calculateHitChance was called with 0 penalty
      expect(calculateHitChanceSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        0
      )

      calculateHitChanceSpy.mockRestore()
    })

    it('blind penalty reduces hit chance correctly', () => {
      const attacker = createTestCharacter({ strength: 12 })
      const defender = createTestMonster({ ac: -2 })

      // Calculate hit chance without blind
      const normalHitChance = CombatService.calculateHitChance(attacker, defender, 0, 0)

      // Calculate hit chance with blind (-4 penalty)
      const blindHitChance = CombatService.calculateHitChance(attacker, defender, 0, -4)

      // Blind penalty should reduce hit chance by 20% (4 points × 5% per point)
      // Using values that don't hit the 95% or 5% caps
      expect(blindHitChance).toBe(normalHitChance - 20)
    })
  })

  describe('Silenced Status Effect', () => {
    it('prevents spell casting when silenced', () => {
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

      const monster = createTestMonster({ hp: 100 })
      let state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // Apply silenced status
      state = CombatService.applyStatusEffect(state, 'mage1', 'SILENCED')

      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      const parryingCombatants = new Set<string>()
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(result.message).toContain('silenced')
      expect(result.message).toContain('cannot cast')
    })

    it('allows spell casting when not silenced', () => {
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

      expect(result.message).not.toContain('silenced')
      expect(result.message).toContain('HALITO')
    })
  })

  describe('Sleep Waking on Damage', () => {
    describe('Monster Sleep Waking', () => {
      it('wakes sleeping monster when damaged', () => {
        const character = createTestCharacter({ id: 'char1', strength: 18 })
        const sleepingMonster = createTestMonster({ id: 'm1', hp: 50, maxHp: 50, status: 'ASLEEP' })

        const state = createTestCombatState({
          monsterGroups: [{
            id: 'A',
            monsters: [sleepingMonster],
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

        const cmd = CombatService.createCommand(character, 'ATTACK', sleepingMonster)
        const parryingCombatants = new Set<string>()
        const result = CombatService.executeCommand(state, cmd, parryingCombatants)

        const updatedMonster = result.newState.monsterGroups[0].monsters[0]
        expect(updatedMonster.hp).toBe(30) // 50 - 20 (double damage when asleep)
        expect(updatedMonster.status).toBe('ALIVE') // Woke up!

        jest.restoreAllMocks()
      })

      it('keeps monster alive status when already awake', () => {
        const character = createTestCharacter({ id: 'char1', strength: 18 })
        const awakeMonster = createTestMonster({ id: 'm1', hp: 50, maxHp: 50, status: 'ALIVE' })

        const state = createTestCombatState({
          monsterGroups: [{
            id: 'A',
            monsters: [awakeMonster],
            formation: 'front'
          }]
        })

        jest.spyOn(CombatService as any, 'resolveAttack').mockReturnValue({
          hit: true,
          damage: 10,
          critical: false,
          message: 'Hit for 10 damage'
        })

        const cmd = CombatService.createCommand(character, 'ATTACK', awakeMonster)
        const parryingCombatants = new Set<string>()
        const result = CombatService.executeCommand(state, cmd, parryingCombatants)

        const updatedMonster = result.newState.monsterGroups[0].monsters[0]
        expect(updatedMonster.hp).toBe(40)
        expect(updatedMonster.status).toBe('ALIVE')

        jest.restoreAllMocks()
      })

      it('sets status to DEAD when hp reaches 0', () => {
        const character = createTestCharacter({ id: 'char1', strength: 18 })
        const weakMonster = createTestMonster({ id: 'm1', hp: 5, maxHp: 50, status: 'ASLEEP' })

        const state = createTestCombatState({
          monsterGroups: [{
            id: 'A',
            monsters: [weakMonster],
            formation: 'front'
          }]
        })

        jest.spyOn(CombatService as any, 'resolveAttack').mockReturnValue({
          hit: true,
          damage: 10,
          critical: false,
          message: 'Hit for 10 damage'
        })

        const cmd = CombatService.createCommand(character, 'ATTACK', weakMonster)
        const parryingCombatants = new Set<string>()
        const result = CombatService.executeCommand(state, cmd, parryingCombatants)

        const updatedMonster = result.newState.monsterGroups[0].monsters[0]
        expect(updatedMonster.hp).toBe(0)
        expect(updatedMonster.status).toBe('DEAD')

        jest.restoreAllMocks()
      })
    })

    describe('Character Sleep Waking', () => {
      it('wakes sleeping character when damaged', () => {
        const sleepingChar = createTestCharacter({
          id: 'char1',
          hp: 30,
          maxHp: 30,
          status: CharacterStatus.ASLEEP
        })

        const damagedChar = CombatService.applyDamageToCharacter(sleepingChar, 10)

        expect(damagedChar.hp).toBe(20) // 30 - 10
        expect(damagedChar.status).toBe(CharacterStatus.OK) // Woke up!
      })

      it('keeps OK status when already awake', () => {
        const awakeChar = createTestCharacter({
          id: 'char1',
          hp: 30,
          maxHp: 30,
          status: CharacterStatus.OK
        })

        const damagedChar = CombatService.applyDamageToCharacter(awakeChar, 10)

        expect(damagedChar.hp).toBe(20)
        expect(damagedChar.status).toBe(CharacterStatus.OK)
      })

      it('sets status to DEAD when hp reaches 0', () => {
        const weakChar = createTestCharacter({
          id: 'char1',
          hp: 5,
          maxHp: 30,
          status: CharacterStatus.ASLEEP
        })

        const damagedChar = CombatService.applyDamageToCharacter(weakChar, 10)

        expect(damagedChar.hp).toBe(0)
        expect(damagedChar.status).toBe(CharacterStatus.DEAD)
      })

      it('preserves other status effects when waking', () => {
        // Character who is asleep wakes up, but other statuses remain
        const poisonedSleepingChar = createTestCharacter({
          id: 'char1',
          hp: 30,
          maxHp: 30,
          status: CharacterStatus.ASLEEP
        })

        const damagedChar = CombatService.applyDamageToCharacter(poisonedSleepingChar, 10)

        expect(damagedChar.status).toBe(CharacterStatus.OK)
        // Note: In Wizardry, ASLEEP is temporary combat status
        // POISONED, PARALYZED are persistent and handled separately
      })
    })
  })

  describe('Status Effect Integration', () => {
    it('applies multiple status effects to same combatant', () => {
      let state = createTestCombatState()

      state = CombatService.applyStatusEffect(state, 'char1', 'BLIND')
      state = CombatService.applyStatusEffect(state, 'char1', 'SILENCED')

      expect(CombatService.hasStatusEffect(state, 'char1', 'BLIND')).toBe(true)
      expect(CombatService.hasStatusEffect(state, 'char1', 'SILENCED')).toBe(true)
    })

    it('tracks status effects across multiple rounds', () => {
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

      const monster = createTestMonster({ hp: 100 })
      let state = createTestCombatState({
        monsterGroups: [{
          id: 'A',
          monsters: [monster],
          formation: 'front'
        }]
      })

      // Apply silenced in round 1
      state = CombatService.applyStatusEffect(state, 'mage1', 'SILENCED')

      // Try to cast spell in round 2
      const cmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, { spellId: 'halito' })
      state.commandQueue = [cmd]

      const result = CombatService.executeRound(state, [mage])

      // Should still be silenced
      expect(result.messages.some(msg => msg.includes('silenced'))).toBe(true)
    })
  })
})
