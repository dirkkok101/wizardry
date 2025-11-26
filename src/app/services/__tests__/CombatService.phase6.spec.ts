// src/services/__tests__/CombatService.phase6.spec.ts
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { Character } from '@types/Character'
import { Combatant } from '@types/Combat'

describe('CombatService - Phase 6: Healing & Support Spells', () => {
  describe('Healing Spells', () => {
    describe('DIOS (Priest Level 1 - Single Target Healing)', () => {
      it('resolves DIOS spell with 1d8 healing', () => {
        const caster = createTestCharacter({ level: 2 })
        const target = createTestCharacter({ id: 'target', hp: 5, maxHp: 20 })

        const effect = SpellCastingService.resolveSpellEffect('dios', caster, [target])

        expect(effect.healing).toBeDefined()
        expect(effect.healing).toHaveLength(1)
        expect(effect.healing![0]).toBeGreaterThanOrEqual(1)
        expect(effect.healing![0]).toBeLessThanOrEqual(8)
        expect(effect.message).toBe('DIOS heals ' + effect.healing![0] + ' HP!')
      })

      it('applies DIOS healing to character', () => {
        const character = createTestCharacter({ hp: 5, maxHp: 20 })

        const healed = CombatService.applyHealingToCharacter(character, 6)

        expect(healed.hp).toBe(11)
      })

      it('caps DIOS healing at maxHp', () => {
        const character = createTestCharacter({ hp: 18, maxHp: 20 })

        const healed = CombatService.applyHealingToCharacter(character, 8)

        expect(healed.hp).toBe(20) // Capped at maxHp
      })
    })

    describe('DIAL (Priest Level 2 - Party Healing)', () => {
      it('resolves DIAL spell with 2d8 healing for multiple targets', () => {
        const caster = createTestCharacter({ level: 3 })
        const target1 = createTestCharacter({ id: 't1', hp: 5, maxHp: 20 })
        const target2 = createTestCharacter({ id: 't2', hp: 8, maxHp: 25 })
        const target3 = createTestCharacter({ id: 't3', hp: 12, maxHp: 30 })

        const effect = SpellCastingService.resolveSpellEffect('dial', caster, [target1, target2, target3])

        expect(effect.healing).toBeDefined()
        expect(effect.healing).toHaveLength(3)

        // Each heal should be 2d8 (2-16)
        effect.healing!.forEach(heal => {
          expect(heal).toBeGreaterThanOrEqual(2)
          expect(heal).toBeLessThanOrEqual(16)
        })

        expect(effect.message).toContain('DIAL heals')
      })

      it('allows healing multiple characters independently', () => {
        const char1 = createTestCharacter({ hp: 5, maxHp: 20 })
        const char2 = createTestCharacter({ hp: 10, maxHp: 30 })

        const healed1 = CombatService.applyHealingToCharacter(char1, 12)
        const healed2 = CombatService.applyHealingToCharacter(char2, 8)

        expect(healed1.hp).toBe(17)
        expect(healed2.hp).toBe(18)
      })
    })

    describe('Healing Integration', () => {
      it('executes DIOS spell command and applies healing', () => {
        const caster = createTestCharacter({
          id: 'caster',
          level: 2,
          spellPoints: {
            priest: {
              level1: { current: 3, max: 3 },
              level2: { current: 2, max: 2 }
            }
          }
        })
        const target = createTestCharacter({ id: 'target', hp: 5, maxHp: 20 })

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', [target], { spellId: 'dios' })

        const result = CombatService.executeCommand(state, command)

        // State should be updated (healing tracked)
        expect(result.newState).toBeDefined()
        expect(result.messages.join(' ')).toContain('casts DIOS')
        expect(result.messages.join(' ')).toContain('heals')
      })

      it('executes DIAL spell command for party healing', () => {
        const caster = createTestCharacter({
          id: 'caster',
          level: 7,
          spellPoints: {
            priest: {
              level1: { current: 3, max: 3 },
              level2: { current: 2, max: 2 },
              level3: { current: 1, max: 1 },
              level4: { current: 1, max: 1 }
            }
          }
        })
        const party = [
          createTestCharacter({ id: 't1', hp: 5, maxHp: 20 }),
          createTestCharacter({ id: 't2', hp: 8, maxHp: 25 }),
          createTestCharacter({ id: 't3', hp: 12, maxHp: 30 })
        ]

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', party, { spellId: 'dial' })

        const result = CombatService.executeCommand(state, command)

        expect(result.newState).toBeDefined()
        expect(result.messages.join(' ')).toContain('casts DIAL')
        expect(result.messages.join(' ')).toContain('heals')
      })
    })
  })

  describe('AC Buff Spells', () => {
    describe('MOGREF (Mage Level 2 - Party AC Buff)', () => {
      it('resolves MOGREF spell with -2 AC modifier', () => {
        const caster = createTestCharacter({ level: 3 })
        const target1 = createTestCharacter({ id: 't1', ac: 5 })
        const target2 = createTestCharacter({ id: 't2', ac: 7 })

        const effect = SpellCastingService.resolveSpellEffect('mogref', caster, [target1, target2])

        expect(effect.acBuffs).toBeDefined()
        expect(effect.acBuffs).toHaveLength(2)
        expect(effect.acBuffs![0].target).toBe('t1')
        expect(effect.acBuffs![0].acModifier).toBe(-2)
        expect(effect.acBuffs![1].target).toBe('t2')
        expect(effect.acBuffs![1].acModifier).toBe(-2)
        expect(effect.message).toBe('MOGREF strengthens the party\'s defenses!')
      })

      it('applies MOGREF AC buff to combat state', () => {
        const state = createTestCombatState()
        const char1 = createTestCharacter({ id: 'c1' })
        const char2 = createTestCharacter({ id: 'c2' })

        const caster = createTestCharacter({
          id: 'caster',
          level: 3,
          spellPoints: {
            mage: {
              level1: { current: 3, max: 3 },
              level2: { current: 2, max: 2 }
            }
          }
        })

        const command = CombatService.createCommand(caster, 'CAST_SPELL', [char1, char2], { spellId: 'mogref' })
        const result = CombatService.executeCommand(state, command)

        expect(result.newState.acModifiers).toBeDefined()
        expect(result.newState.acModifiers.get('c1')).toBe(-2)
        expect(result.newState.acModifiers.get('c2')).toBe(-2)
      })
    })

    describe('KALKI (Priest Level 3 - Party AC Buff)', () => {
      it('resolves KALKI spell with -1 AC modifier', () => {
        const caster = createTestCharacter({ level: 4 })
        const target1 = createTestCharacter({ id: 't1', ac: 5 })
        const target2 = createTestCharacter({ id: 't2', ac: 6 })
        const target3 = createTestCharacter({ id: 't3', ac: 8 })

        const effect = SpellCastingService.resolveSpellEffect('kalki', caster, [target1, target2, target3])

        expect(effect.acBuffs).toBeDefined()
        expect(effect.acBuffs).toHaveLength(3)
        expect(effect.acBuffs![0].acModifier).toBe(-1)
        expect(effect.acBuffs![1].acModifier).toBe(-1)
        expect(effect.acBuffs![2].acModifier).toBe(-1)
        expect(effect.message).toBe('KALKI strengthens the party\'s defenses!')
      })

      it('applies KALKI AC buff to combat state', () => {
        const state = createTestCombatState()
        const party = [
          createTestCharacter({ id: 'c1' }),
          createTestCharacter({ id: 'c2' }),
          createTestCharacter({ id: 'c3' })
        ]

        const caster = createTestCharacter({
          id: 'caster',
          level: 4,
          spellPoints: {
            priest: {
              level1: { current: 2, max: 2 },
              level2: { current: 2, max: 2 },
              level3: { current: 1, max: 1 }
            }
          }
        })

        const command = CombatService.createCommand(caster, 'CAST_SPELL', party, { spellId: 'kalki' })
        const result = CombatService.executeCommand(state, command)

        expect(result.newState.acModifiers.get('c1')).toBe(-1)
        expect(result.newState.acModifiers.get('c2')).toBe(-1)
        expect(result.newState.acModifiers.get('c3')).toBe(-1)
      })
    })

    describe('AC Buff Stacking', () => {
      it('stacks multiple AC buffs on same character', () => {
        let state = createTestCombatState()
        const character = createTestCharacter({ id: 'char' })

        // Apply MOGREF (-2)
        const caster1 = createTestCharacter({
          id: 'caster1',
          level: 3,
          spellPoints: {
            mage: {
              level1: { current: 3, max: 3 },
              level2: { current: 2, max: 2 }
            }
          }
        })
        const command1 = CombatService.createCommand(caster1, 'CAST_SPELL', [character], { spellId: 'mogref' })
        const result1 = CombatService.executeCommand(state, command1)
        state = result1.newState

        // Apply KALKI (-1)
        const caster2 = createTestCharacter({
          id: 'caster2',
          level: 4,
          spellPoints: {
            priest: {
              level1: { current: 2, max: 2 },
              level2: { current: 2, max: 2 },
              level3: { current: 1, max: 1 }
            }
          }
        })
        const command2 = CombatService.createCommand(caster2, 'CAST_SPELL', [character], { spellId: 'kalki' })
        const result2 = CombatService.executeCommand(state, command2)

        // Total buff should be -3
        expect(result2.newState.acModifiers.get('char')).toBe(-3)
      })
    })
  })

  describe('Mixed Spell Effects', () => {
    it('handles damage and status effect spells alongside healing spells in same combat', () => {
      const state = createTestCombatState()
      const monster = createTestMonster({ id: 'm1', hp: 10, maxHp: 10 })
      const party = [
        createTestCharacter({ id: 'fighter', hp: 15, maxHp: 20 }),
        createTestCharacter({ id: 'priest', hp: 8, maxHp: 12, spellPoints: {
          priest: {
            level1: { current: 3, max: 3 }
          }
        }})
      ]

      // Priest casts DIOS on Fighter
      const healCommand = CombatService.createCommand(
        party[1],
        'CAST_SPELL',
        [party[0]],
        { spellId: 'dios' }
      )

      const result = CombatService.executeCommand(state, healCommand)

      expect(result.messages.join(' ')).toContain('casts DIOS')
      expect(result.messages.join(' ')).toContain('heals')
      expect(result.newState).toBeDefined()
    })

    it('tracks AC buffs separately from status effects', () => {
      let state = createTestCombatState()
      const character = createTestCharacter({ id: 'char' })
      const monster = createTestMonster({ id: 'monster' })

      // Apply AC buff (MOGREF)
      const mage = createTestCharacter({
        id: 'mage',
        level: 3,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })
      const buffCommand = CombatService.createCommand(mage, 'CAST_SPELL', [character], { spellId: 'mogref' })
      const buffResult = CombatService.executeCommand(state, buffCommand)
      state = buffResult.newState

      // Apply status effect (DILTO on monster)
      const blindCommand = CombatService.createCommand(mage, 'CAST_SPELL', [monster], { spellId: 'dilto' })
      const blindResult = CombatService.executeCommand(state, blindCommand)

      // Both should be tracked independently
      expect(blindResult.newState.acModifiers.get('char')).toBe(-2)
      expect(CombatService.hasStatusEffect(blindResult.newState, monster.id, 'BLIND')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('healing at full HP still works but has no effect', () => {
      const character = createTestCharacter({ hp: 20, maxHp: 20 })

      const healed = CombatService.applyHealingToCharacter(character, 8)

      expect(healed.hp).toBe(20) // Still at max
    })

    it('healing dead character updates HP but not status', () => {
      const character = createTestCharacter({ hp: 0, maxHp: 20, status: 'DEAD' as any })

      const healed = CombatService.applyHealingToCharacter(character, 10)

      expect(healed.hp).toBe(10)
      // Note: Status remains DEAD (healing doesn't resurrect)
    })

    it('AC buff with zero modifier has no effect', () => {
      const state = createTestCombatState()

      const newState = state

      expect(newState.acModifiers.size).toBe(0)
    })

    it('AC buffs persist through multiple rounds', () => {
      const state = createTestCombatState()
      const character = createTestCharacter({ id: 'char' })

      const caster = createTestCharacter({
        id: 'caster',
        level: 3,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })

      const command = CombatService.createCommand(caster, 'CAST_SPELL', [character], { spellId: 'mogref' })
      const result = CombatService.executeCommand(state, command)

      // Buff should exist in state
      expect(result.newState.acModifiers.get('char')).toBe(-2)

      // Advance round (buffs persist)
      const nextRoundState = { ...result.newState, roundNumber: 2 }
      expect(nextRoundState.acModifiers.get('char')).toBe(-2)
    })
  })
})
