// src/services/__tests__/CombatService.phase7.spec.ts
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'

describe('CombatService - Phase 7: Core Combat Spells', () => {
  describe('Area-of-Effect Damage Spells', () => {
    describe('MAHALITO (Mage Level 3 - Fireball)', () => {
      it('resolves MAHALITO with 4d6 damage', () => {
        const caster = createTestCharacter({ level: 4 })
        const targets = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' }),
          createTestMonster({ id: 'm3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(3)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(4)  // 4d6 minimum
          expect(dmg).toBeLessThanOrEqual(24)    // 4d6 maximum
        })
        expect(effect.message).toContain('MAHALITO')
        expect(effect.message).toContain('damage')
      })

      it('targets entire monster group', () => {
        const caster = createTestCharacter({
          id: 'mage',
          level: 4,
          spellPoints: {
            mage: {
              level1: { current: 3, max: 3 },
              level2: { current: 2, max: 2 },
              level3: { current: 1, max: 1 }
            }
          }
        })

        const monsterGroup = [
          createTestMonster({ id: 'm1', hp: 20, maxHp: 20 }),
          createTestMonster({ id: 'm2', hp: 20, maxHp: 20 }),
          createTestMonster({ id: 'm3', hp: 20, maxHp: 20 })
        ]

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', monsterGroup, { spellId: 'mahalito' })

        const result = CombatService.executeCommand(state, command)

        expect(result.messages.join(' ')).toContain('MAHALITO')
        expect(result.newState).toBeDefined()
      })
    })

    describe('LAHALITO (Mage Level 3 - Flame Bolt)', () => {
      it('resolves LAHALITO with 6d6 damage for single target', () => {
        const caster = createTestCharacter({ level: 4 })
        const target = createTestMonster({ id: 'm1', hp: 40, maxHp: 40 })

        const effect = SpellCastingService.resolveSpellEffect('lahalito', caster, [target])

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(6)   // 6d6 minimum
        expect(effect.damage![0]).toBeLessThanOrEqual(36)     // 6d6 maximum
        expect(effect.message).toContain('LAHALITO')
      })

      it('deals more damage than HALITO on average', () => {
        const caster = createTestCharacter({ level: 4 })
        const target = createTestMonster({ id: 'm1' })

        // Run multiple trials to verify LAHALITO > HALITO
        const halitoRolls: number[] = []
        const lahalitoRolls: number[] = []

        for (let i = 0; i < 100; i++) {
          const halitoEffect = SpellCastingService.resolveSpellEffect('halito', caster, [target])
          const lahalitoEffect = SpellCastingService.resolveSpellEffect('lahalito', caster, [target])

          halitoRolls.push(halitoEffect.damage![0])
          lahalitoRolls.push(lahalitoEffect.damage![0])
        }

        const halitoAvg = halitoRolls.reduce((a, b) => a + b, 0) / halitoRolls.length
        const lahalitoAvg = lahalitoRolls.reduce((a, b) => a + b, 0) / lahalitoRolls.length

        expect(lahalitoAvg).toBeGreaterThan(halitoAvg)
      })
    })
  })

  describe('Anti-Undead Spells', () => {
    describe('BADIOS (Priest Level 1 - Hurt Undead)', () => {
      it('resolves BADIOS with 1d8 damage against undead', () => {
        const caster = createTestCharacter({ level: 2 })
        const undead = createTestMonster({ id: 'skeleton', undead: true })

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, [undead])

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
        expect(effect.damage![0]).toBeLessThanOrEqual(8)
        expect(effect.message).toContain('BADIOS')
      })

      it('has no effect on living creatures', () => {
        const caster = createTestCharacter({ level: 2 })
        const living = createTestMonster({ id: 'kobold', undead: false })

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, [living])

        expect(effect.damage).toBeUndefined()
        expect(effect.message).toBe('BADIOS has no effect on living creatures!')
      })

      it('has no effect when undead flag is missing', () => {
        const caster = createTestCharacter({ level: 2 })
        const monster = createTestMonster({ id: 'kobold' })  // undead flag not set

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, [monster])

        expect(effect.damage).toBeUndefined()
        expect(effect.message).toBe('BADIOS has no effect on living creatures!')
      })

      it('filters targets to only undead in mixed group', () => {
        const caster = createTestCharacter({ level: 2 })
        const targets = [
          createTestMonster({ id: 'skeleton', undead: true }),
          createTestMonster({ id: 'kobold', undead: false }),
          createTestMonster({ id: 'zombie', undead: true })
        ]

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, targets)

        // Should only damage the 2 undead
        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(2)
      })

      it('executes BADIOS spell command', () => {
        const caster = createTestCharacter({
          id: 'priest',
          level: 2,
          spellPoints: {
            priest: {
              level1: { current: 3, max: 3 }
            }
          }
        })
        const undead = createTestMonster({ id: 'skeleton', hp: 10, maxHp: 10, undead: true })

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', [undead], { spellId: 'badios' })

        const result = CombatService.executeCommand(state, command)

        expect(result.messages.join(' ')).toContain('BADIOS')
        expect(result.newState).toBeDefined()
      })
    })
  })

  describe('Utility Spells', () => {
    describe('MILWA (Priest Level 1 - Light/Reveal Stats)', () => {
      it('resolves MILWA revealing monster stats', () => {
        const caster = createTestCharacter({ level: 2 })
        const targets = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('milwa', caster, targets)

        expect(effect.revealedInfo).toBeDefined()
        expect(effect.revealedInfo!.type).toBe('stats')
        expect(effect.revealedInfo!.targetIds).toEqual(['m1', 'm2'])
        expect(effect.message).toBe('MILWA reveals the monsters\' vital signs!')
      })

      it('executes MILWA spell command', () => {
        const caster = createTestCharacter({
          id: 'priest',
          level: 2,
          spellPoints: {
            priest: {
              level1: { current: 3, max: 3 }
            }
          }
        })
        const monsters = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' })
        ]

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', monsters, { spellId: 'milwa' })

        const result = CombatService.executeCommand(state, command)

        expect(result.messages.join(' ')).toContain('MILWA')
        expect(result.newState).toBeDefined()
      })
    })

    describe('LATUMAPIC (Priest Level 2 - Identify Foe)', () => {
      it('resolves LATUMAPIC identifying monster type', () => {
        const caster = createTestCharacter({ level: 3 })
        const targets = [
          createTestMonster({ id: 'm1', monsterId: 'dragon' }),
          createTestMonster({ id: 'm2', monsterId: 'dragon' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('latumapic', caster, targets)

        expect(effect.revealedInfo).toBeDefined()
        expect(effect.revealedInfo!.type).toBe('identity')
        expect(effect.revealedInfo!.targetIds).toEqual(['m1', 'm2'])
        expect(effect.message).toBe('LATUMAPIC identifies the enemy!')
      })

      it('executes LATUMAPIC spell command', () => {
        const caster = createTestCharacter({
          id: 'priest',
          level: 3,
          spellPoints: {
            priest: {
              level1: { current: 3, max: 3 },
              level2: { current: 2, max: 2 },
              level3: { current: 1, max: 1 }
            }
          }
        })
        const monsters = [
          createTestMonster({ id: 'm1', monsterId: 'orc' })
        ]

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', monsters, { spellId: 'latumapic' })

        const result = CombatService.executeCommand(state, command)

        expect(result.messages.join(' ')).toContain('LATUMAPIC')
        expect(result.newState).toBeDefined()
      })
    })
  })

  describe('Spell Targeting', () => {
    it('MAHALITO targets group', () => {
      const caster = createTestCharacter({ level: 4 })
      const targets = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' }),
        createTestMonster({ id: 'm3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)

      expect(effect.damage).toHaveLength(3)
    })

    it('LAHALITO targets single enemy', () => {
      const caster = createTestCharacter({ level: 4 })
      const target = createTestMonster({ id: 'm1' })

      const effect = SpellCastingService.resolveSpellEffect('lahalito', caster, [target])

      expect(effect.damage).toHaveLength(1)
    })

    it('DIAL targets all allies', () => {
      const caster = createTestCharacter({ level: 3 })
      const allies = [
        createTestCharacter({ id: 'c1', hp: 5, maxHp: 20 }),
        createTestCharacter({ id: 'c2', hp: 8, maxHp: 25 }),
        createTestCharacter({ id: 'c3', hp: 12, maxHp: 30 })
      ]

      const effect = SpellCastingService.resolveSpellEffect('dial', caster, allies)

      expect(effect.healing).toHaveLength(3)
    })

    it('MILWA targets group for reveal', () => {
      const caster = createTestCharacter({ level: 2 })
      const targets = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('milwa', caster, targets)

      expect(effect.revealedInfo!.targetIds).toEqual(['m1', 'm2'])
    })
  })

  describe('Mixed Spell Combat', () => {
    it('combines damage spells with different power levels', () => {
      const mage = createTestCharacter({
        id: 'mage',
        level: 4,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 2, max: 2 }
          }
        }
      })

      const targets = [
        createTestMonster({ id: 'm1', hp: 50, maxHp: 50 }),
        createTestMonster({ id: 'm2', hp: 50, maxHp: 50 })
      ]

      // HALITO (weaker, group)
      const halitoEffect = SpellCastingService.resolveSpellEffect('halito', mage, targets)
      expect(halitoEffect.damage).toHaveLength(2)

      // MAHALITO (stronger, group)
      const mahalitoEffect = SpellCastingService.resolveSpellEffect('mahalito', mage, targets)
      expect(mahalitoEffect.damage).toHaveLength(2)

      // LAHALITO (strongest, single)
      const lahalitoEffect = SpellCastingService.resolveSpellEffect('lahalito', mage, [targets[0]])
      expect(lahalitoEffect.damage).toHaveLength(1)
    })

    it('combines utility spells with damage spells', () => {
      const priest = createTestCharacter({
        id: 'priest',
        level: 3,
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })

      const undeadTargets = [
        createTestMonster({ id: 'skeleton', undead: true }),
        createTestMonster({ id: 'zombie', undead: true })
      ]

      // MILWA reveals stats
      const milwaEffect = SpellCastingService.resolveSpellEffect('milwa', priest, undeadTargets)
      expect(milwaEffect.revealedInfo).toBeDefined()
      expect(milwaEffect.revealedInfo!.type).toBe('stats')

      // LATUMAPIC identifies
      const latumapicEffect = SpellCastingService.resolveSpellEffect('latumapic', priest, undeadTargets)
      expect(latumapicEffect.revealedInfo).toBeDefined()
      expect(latumapicEffect.revealedInfo!.type).toBe('identity')

      // BADIOS damages undead
      const badiosEffect = SpellCastingService.resolveSpellEffect('badios', priest, undeadTargets)
      expect(badiosEffect.damage).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('BADIOS on empty undead group has no effect', () => {
      const caster = createTestCharacter({ level: 2 })
      const living = createTestMonster({ id: 'kobold', undead: false })

      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [living])

      expect(effect.damage).toBeUndefined()
      expect(effect.message).toContain('no effect')
    })

    it('utility spells work on empty target arrays', () => {
      const caster = createTestCharacter({ level: 2 })

      const effect = SpellCastingService.resolveSpellEffect('milwa', caster, [])

      expect(effect.revealedInfo).toBeDefined()
      expect(effect.revealedInfo!.targetIds).toEqual([])
    })

    it('MAHALITO damages all targets in group equally (independent rolls)', () => {
      const caster = createTestCharacter({ level: 4 })
      const targets = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' }),
        createTestMonster({ id: 'm3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)

      // Each target gets independent damage roll
      expect(effect.damage).toHaveLength(3)
      // Verify they're not all the same (very unlikely with random rolls)
      const allSame = effect.damage!.every(d => d === effect.damage![0])
      // With 100 trials, probability of all same is negligible
      expect(allSame).toBe(false)
    })
  })
})
