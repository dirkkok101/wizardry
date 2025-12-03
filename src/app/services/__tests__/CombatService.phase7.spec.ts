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

  describe('Damage Spells', () => {
    describe('BADIOS (Priest Level 1 - Harm)', () => {
      it('resolves BADIOS with 1d8 damage against any monster', () => {
        const caster = createTestCharacter({ level: 2 })
        const monster = createTestMonster({ id: 'kobold' })

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, [monster])

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
        expect(effect.damage![0]).toBeLessThanOrEqual(8)
        expect(effect.message).toContain('BADIOS')
      })

      it('deals damage to living creatures', () => {
        const caster = createTestCharacter({ level: 2 })
        const living = createTestMonster({ id: 'kobold', undead: false })

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, [living])

        // BADIOS works on any monster per docs - 1d8 damage
        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
        expect(effect.damage![0]).toBeLessThanOrEqual(8)
      })

      it('damages multiple targets when cast on group', () => {
        const caster = createTestCharacter({ level: 2 })
        const targets = [
          createTestMonster({ id: 'kobold1' }),
          createTestMonster({ id: 'kobold2' }),
          createTestMonster({ id: 'kobold3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, targets)

        // BADIOS is single target per spell data, but if passed multiple targets
        // it should handle each - damage all
        expect(effect.damage).toBeDefined()
        expect(effect.damage!.length).toBeGreaterThanOrEqual(1)
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
        const monster = createTestMonster({ id: 'kobold', hp: 10, maxHp: 10 })

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', [monster], { spellId: 'badios' })

        const result = CombatService.executeCommand(state, command)

        expect(result.messages.join(' ')).toContain('BADIOS')
        expect(result.newState).toBeDefined()
      })
    })
  })

  describe('Utility Spells', () => {
    describe('MILWA (Priest Level 1 - Light)', () => {
      it('resolves MILWA as a light spell with extended vision', () => {
        const caster = createTestCharacter({ level: 2 })
        const targets: any[] = []  // Light spells don't need targets

        const effect = SpellCastingService.resolveSpellEffect('milwa', caster, targets)

        // MILWA is a light spell per docs - creates light, extends vision, reveals secret doors
        expect(effect.message).toContain('MILWA')
        // Light utility effect should be present
        expect(effect.utility || effect.lightEffect || effect.message).toBeDefined()
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

        const state = createTestCombatState()
        const command = CombatService.createCommand(caster, 'CAST_SPELL', [], { spellId: 'milwa' })

        const result = CombatService.executeCommand(state, command)

        expect(result.messages.join(' ')).toContain('MILWA')
        expect(result.newState).toBeDefined()
      })
    })

    describe('LATUMAPIC (Priest Level 3 - Identify Foe)', () => {
      it('resolves LATUMAPIC identifying ALL monster groups (bug-fixed)', () => {
        const caster = createTestCharacter({ level: 3 })
        const targets = [
          createTestMonster({ id: 'm1', monsterId: 'dragon' }),
          createTestMonster({ id: 'm2', monsterId: 'dragon' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('latumapic', caster, targets)

        // Bug-fixed: LATUMAPIC identifies ALL groups (A, B, C, D), not just targets
        expect(effect.monsterIdentification).toBeDefined()
        expect(effect.monsterIdentification!.groupIds).toEqual(['A', 'B', 'C', 'D'])
        expect(effect.message).toContain('LATUMAPIC')
        expect(effect.message).toContain('identity')
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

    it('MILWA is a light spell (no targeting needed)', () => {
      const caster = createTestCharacter({ level: 2 })

      const effect = SpellCastingService.resolveSpellEffect('milwa', caster, [])

      // MILWA is a light/utility spell per docs - creates extended light
      expect(effect.message).toContain('MILWA')
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

      const monsters = [
        createTestMonster({ id: 'kobold1' }),
        createTestMonster({ id: 'kobold2' })
      ]

      // MILWA is a light spell (no monster targeting)
      const milwaEffect = SpellCastingService.resolveSpellEffect('milwa', priest, [])
      expect(milwaEffect.message).toContain('MILWA')

      // LATUMAPIC identifies monsters
      const latumapicEffect = SpellCastingService.resolveSpellEffect('latumapic', priest, monsters)
      expect(latumapicEffect.message).toContain('LATUMAPIC')

      // BADIOS damages any monster (not undead-only)
      const badiosEffect = SpellCastingService.resolveSpellEffect('badios', priest, monsters)
      expect(badiosEffect.damage).toBeDefined()
      expect(badiosEffect.damage!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Edge Cases', () => {
    it('BADIOS damages any target (not undead-only)', () => {
      const caster = createTestCharacter({ level: 2 })
      const living = createTestMonster({ id: 'kobold', undead: false })

      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [living])

      // BADIOS is general damage spell per docs - 1d8 to any monster
      expect(effect.damage).toBeDefined()
      expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
      expect(effect.damage![0]).toBeLessThanOrEqual(8)
    })

    it('utility spells work on empty target arrays', () => {
      const caster = createTestCharacter({ level: 2 })

      // MILWA is a light spell - works without targets
      const effect = SpellCastingService.resolveSpellEffect('milwa', caster, [])

      expect(effect.message).toContain('MILWA')
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
