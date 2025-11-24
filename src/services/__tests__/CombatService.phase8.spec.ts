// src/services/__tests__/CombatService.phase8.spec.ts
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'

describe('CombatService - Phase 8: Advanced Spells (Levels 4-7)', () => {
  describe('Advanced Damage Spells', () => {
    describe('DALTO (Mage Level 4 - Group Fire)', () => {
      it('resolves DALTO with 6d6 damage to group', () => {
        const caster = createTestCharacter({ level: 5 })
        const targets = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' }),
          createTestMonster({ id: 'm3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('dalto', caster, targets)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(3)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(6)   // 6d6 minimum
          expect(dmg).toBeLessThanOrEqual(36)     // 6d6 maximum
        })
        expect(effect.message).toContain('DALTO')
      })

      it('DALTO deals more damage than MAHALITO', () => {
        const caster = createTestCharacter({ level: 5 })
        const targets = [createTestMonster({ id: 'm1' })]

        // Run multiple trials to verify DALTO (6d6) > MAHALITO (4d6)
        const mahalitoRolls: number[] = []
        const daltoRolls: number[] = []

        for (let i = 0; i < 100; i++) {
          const mahalitoEffect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)
          const daltoEffect = SpellCastingService.resolveSpellEffect('dalto', caster, targets)

          mahalitoRolls.push(mahalitoEffect.damage![0])
          daltoRolls.push(daltoEffect.damage![0])
        }

        const mahalitoAvg = mahalitoRolls.reduce((a, b) => a + b, 0) / mahalitoRolls.length
        const daltoAvg = daltoRolls.reduce((a, b) => a + b, 0) / daltoRolls.length

        expect(daltoAvg).toBeGreaterThan(mahalitoAvg)
      })
    })

    describe('TILTOWAIT (Mage Level 7 - The Nuke)', () => {
      it('resolves TILTOWAIT with 10d10 damage', () => {
        const caster = createTestCharacter({ level: 10 })
        const targets = [
          createTestMonster({ id: 'm1', hp: 100, maxHp: 100 }),
          createTestMonster({ id: 'm2', hp: 100, maxHp: 100 })
        ]

        const effect = SpellCastingService.resolveSpellEffect('tiltowait', caster, targets)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(2)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(10)   // 10d10 minimum
          expect(dmg).toBeLessThanOrEqual(100)     // 10d10 maximum
        })
        expect(effect.message).toContain('TILTOWAIT')
      })

      it('TILTOWAIT is the most powerful damage spell', () => {
        const caster = createTestCharacter({ level: 10 })
        const target = [createTestMonster({ id: 'm1' })]

        const tiltoRolls: number[] = []
        const lahalitoRolls: number[] = []

        for (let i = 0; i < 100; i++) {
          const tiltoEffect = SpellCastingService.resolveSpellEffect('tiltowait', caster, target)
          const lahalitoEffect = SpellCastingService.resolveSpellEffect('lahalito', caster, target)

          tiltoRolls.push(tiltoEffect.damage![0])
          lahalitoRolls.push(lahalitoEffect.damage![0])
        }

        const tiltoAvg = tiltoRolls.reduce((a, b) => a + b, 0) / tiltoRolls.length
        const lahalitoAvg = lahalitoRolls.reduce((a, b) => a + b, 0) / lahalitoRolls.length

        expect(tiltoAvg).toBeGreaterThan(lahalitoAvg)
        expect(tiltoAvg).toBeGreaterThan(50)  // Should average ~55
      })
    })
  })

  describe('Anti-Undead Progression', () => {
    describe('BADIAL (Priest Level 4 - Hurt Undead Group)', () => {
      it('resolves BADIAL with 2d8 damage to undead group', () => {
        const caster = createTestCharacter({ level: 5 })
        const undeadGroup = [
          createTestMonster({ id: 'skeleton1', undead: true }),
          createTestMonster({ id: 'skeleton2', undead: true }),
          createTestMonster({ id: 'zombie', undead: true })
        ]

        const effect = SpellCastingService.resolveSpellEffect('badial', caster, undeadGroup)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(3)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(2)
          expect(dmg).toBeLessThanOrEqual(16)
        })
      })

      it('has no effect on living creatures', () => {
        const caster = createTestCharacter({ level: 5 })
        const living = [createTestMonster({ id: 'orc', undead: false })]

        const effect = SpellCastingService.resolveSpellEffect('badial', caster, living)

        expect(effect.damage).toBeUndefined()
        expect(effect.message).toBe('BADIAL has no effect on living creatures!')
      })
    })

    describe('BADIALMA (Priest Level 5 - Hurt All Undead)', () => {
      it('resolves BADIALMA with 4d8 damage to all undead', () => {
        const caster = createTestCharacter({ level: 6 })
        const undeadArmy = [
          createTestMonster({ id: 'skeleton1', undead: true }),
          createTestMonster({ id: 'skeleton2', undead: true }),
          createTestMonster({ id: 'zombie1', undead: true }),
          createTestMonster({ id: 'zombie2', undead: true })
        ]

        const effect = SpellCastingService.resolveSpellEffect('badialma', caster, undeadArmy)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(4)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(4)
          expect(dmg).toBeLessThanOrEqual(32)
        })
      })
    })

    it('BADIALMA deals more damage than BADIAL', () => {
      const caster = createTestCharacter({ level: 6 })
      const undead = [createTestMonster({ id: 'skeleton', undead: true })]

      const badialRolls: number[] = []
      const badialmaRolls: number[] = []

      for (let i = 0; i < 100; i++) {
        const badialEffect = SpellCastingService.resolveSpellEffect('badial', caster, undead)
        const badialmaEffect = SpellCastingService.resolveSpellEffect('badialma', caster, undead)

        badialRolls.push(badialEffect.damage![0])
        badialmaRolls.push(badialmaEffect.damage![0])
      }

      const badialAvg = badialRolls.reduce((a, b) => a + b, 0) / badialRolls.length
      const badialmaAvg = badialmaRolls.reduce((a, b) => a + b, 0) / badialmaRolls.length

      expect(badialmaAvg).toBeGreaterThan(badialAvg)
    })
  })

  describe('Advanced Healing Spells', () => {
    describe('DIALKO (Priest Level 5 - Critical Healing)', () => {
      it('resolves DIALKO with 4d8 healing', () => {
        const caster = createTestCharacter({ level: 6 })
        const injured = createTestCharacter({ id: 'fighter', hp: 10, maxHp: 50 })

        const effect = SpellCastingService.resolveSpellEffect('dialko', caster, [injured])

        expect(effect.healing).toBeDefined()
        expect(effect.healing).toHaveLength(1)
        expect(effect.healing![0]).toBeGreaterThanOrEqual(4)
        expect(effect.healing![0]).toBeLessThanOrEqual(32)
        expect(effect.message).toContain('DIALKO')
      })

      it('DIALKO heals more than DIAL', () => {
        const caster = createTestCharacter({ level: 6 })
        const injured = [createTestCharacter({ id: 'c1', hp: 5, maxHp: 50 })]

        const dialRolls: number[] = []
        const dialkoRolls: number[] = []

        for (let i = 0; i < 100; i++) {
          const dialEffect = SpellCastingService.resolveSpellEffect('dial', caster, injured)
          const dialkoEffect = SpellCastingService.resolveSpellEffect('dialko', caster, injured)

          dialRolls.push(dialEffect.healing![0])
          dialkoRolls.push(dialkoEffect.healing![0])
        }

        const dialAvg = dialRolls.reduce((a, b) => a + b, 0) / dialRolls.length
        const dialkoAvg = dialkoRolls.reduce((a, b) => a + b, 0) / dialkoRolls.length

        expect(dialkoAvg).toBeGreaterThan(dialAvg)
      })
    })

    describe('MADI (Priest Level 6 - Party Healing)', () => {
      it('resolves MADI healing entire party with 3d8 each', () => {
        const caster = createTestCharacter({ level: 7 })
        const party = [
          createTestCharacter({ id: 'c1', hp: 5, maxHp: 30 }),
          createTestCharacter({ id: 'c2', hp: 10, maxHp: 35 }),
          createTestCharacter({ id: 'c3', hp: 8, maxHp: 28 })
        ]

        const effect = SpellCastingService.resolveSpellEffect('madi', caster, party)

        expect(effect.healing).toBeDefined()
        expect(effect.healing).toHaveLength(3)
        effect.healing!.forEach(heal => {
          expect(heal).toBeGreaterThanOrEqual(3)
          expect(heal).toBeLessThanOrEqual(24)
        })
      })
    })

    describe('MALIKTO (Priest Level 7 - Full Party Restoration)', () => {
      it('resolves MALIKTO for full party heal', () => {
        const caster = createTestCharacter({ level: 8 })
        const party = [
          createTestCharacter({ id: 'c1', hp: 5, maxHp: 50 }),
          createTestCharacter({ id: 'c2', hp: 10, maxHp: 60 }),
          createTestCharacter({ id: 'c3', hp: 1, maxHp: 40 })
        ]

        const effect = SpellCastingService.resolveSpellEffect('malikto', caster, party)

        expect(effect.fullHeal).toBeDefined()
        expect(effect.fullHeal).toEqual(['c1', 'c2', 'c3'])
        expect(effect.message).toBe('MALIKTO fully restores the party!')
      })
    })
  })

  describe('Instant Death & Resurrection', () => {
    describe('MAKANITO (Mage Level 5 - Instant Death)', () => {
      it('resolves MAKANITO for instant death', () => {
        const caster = createTestCharacter({ level: 6 })
        const target = createTestMonster({ id: 'dragon', hp: 200, maxHp: 200 })

        const effect = SpellCastingService.resolveSpellEffect('makanito', caster, [target])

        expect(effect.instantDeath).toBeDefined()
        expect(effect.instantDeath).toEqual(['dragon'])
        expect(effect.message).toBe('MAKANITO invokes instant death!')
      })

      it('targets single enemy only', () => {
        const caster = createTestCharacter({ level: 6 })
        const target = createTestMonster({ id: 'boss' })

        const effect = SpellCastingService.resolveSpellEffect('makanito', caster, [target])

        expect(effect.instantDeath).toHaveLength(1)
      })
    })

    describe('KADORTO (Priest Level 7 - Resurrection)', () => {
      it('resolves KADORTO for resurrection', () => {
        const caster = createTestCharacter({ level: 8 })
        const deadAlly = createTestCharacter({ id: 'fallen', hp: 0, maxHp: 30, status: 'DEAD' as any })

        const effect = SpellCastingService.resolveSpellEffect('kadorto', caster, [deadAlly])

        expect(effect.resurrection).toBeDefined()
        expect(effect.resurrection).toEqual(['fallen'])
        expect(effect.message).toBe('KADORTO resurrects the fallen!')
      })
    })
  })

  describe('Status Cure Spells', () => {
    describe('LATUMOFIS (Priest Level 4 - Cure Paralysis)', () => {
      it('resolves LATUMOFIS to cure paralysis', () => {
        const caster = createTestCharacter({ level: 5 })
        const paralyzed = createTestCharacter({ id: 'fighter', status: 'PARALYZED' as any })

        const effect = SpellCastingService.resolveSpellEffect('latumofis', caster, [paralyzed])

        expect(effect.statusCures).toBeDefined()
        expect(effect.statusCures!.targetIds).toEqual(['fighter'])
        expect(effect.statusCures!.cureType).toBe('paralysis')
        expect(effect.message).toBe('LATUMOFIS cures paralysis!')
      })
    })

    describe('LITOKAN (Priest Level 5 - Cure All Ailments)', () => {
      it('resolves LITOKAN to cure all status ailments', () => {
        const caster = createTestCharacter({ level: 6 })
        const party = [
          createTestCharacter({ id: 'c1', status: 'POISONED' as any }),
          createTestCharacter({ id: 'c2', status: 'PARALYZED' as any }),
          createTestCharacter({ id: 'c3', status: 'ASLEEP' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('litokan', caster, party)

        expect(effect.statusCures).toBeDefined()
        expect(effect.statusCures!.targetIds).toEqual(['c1', 'c2', 'c3'])
        expect(effect.statusCures!.cureType).toBe('all')
        expect(effect.message).toBe('LITOKAN cures all ailments!')
      })
    })
  })

  describe('Paralysis Spell', () => {
    describe('MORLIS (Mage Level 4 - Paralyze)', () => {
      it('resolves MORLIS to paralyze enemy group', () => {
        const caster = createTestCharacter({ level: 5 })
        const enemies = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('morlis', caster, enemies)

        expect(effect.statusEffects).toBeDefined()
        expect(effect.statusEffects).toEqual([
          { target: 'm1', effect: 'PARALYZED' },
          { target: 'm2', effect: 'PARALYZED' }
        ])
        expect(effect.message).toContain('paralyze')
      })
    })
  })

  describe('Spell Power Progression', () => {
    it('verifies damage spell progression', () => {
      const caster = createTestCharacter({ level: 10 })
      const target = [createTestMonster({ id: 'm1' })]

      const halitoRolls: number[] = []
      const mahalitoRolls: number[] = []
      const lahalitoRolls: number[] = []
      const daltoRolls: number[] = []
      const tiltoRolls: number[] = []

      for (let i = 0; i < 100; i++) {
        halitoRolls.push(SpellCastingService.resolveSpellEffect('halito', caster, target).damage![0])
        mahalitoRolls.push(SpellCastingService.resolveSpellEffect('mahalito', caster, target).damage![0])
        lahalitoRolls.push(SpellCastingService.resolveSpellEffect('lahalito', caster, target).damage![0])
        daltoRolls.push(SpellCastingService.resolveSpellEffect('dalto', caster, target).damage![0])
        tiltoRolls.push(SpellCastingService.resolveSpellEffect('tiltowait', caster, target).damage![0])
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      // Verify power progression
      expect(avg(mahalitoRolls)).toBeGreaterThan(avg(halitoRolls))
      expect(avg(lahalitoRolls)).toBeGreaterThan(avg(mahalitoRolls))
      expect(avg(daltoRolls)).toBeGreaterThan(avg(mahalitoRolls))
      expect(avg(tiltoRolls)).toBeGreaterThan(avg(lahalitoRolls))
    })

    it('verifies healing spell progression', () => {
      const caster = createTestCharacter({ level: 10 })
      const target = [createTestCharacter({ id: 'c1', hp: 5, maxHp: 100 })]

      const diosRolls: number[] = []
      const dialRolls: number[] = []
      const dialkoRolls: number[] = []
      const madiRolls: number[] = []

      for (let i = 0; i < 100; i++) {
        diosRolls.push(SpellCastingService.resolveSpellEffect('dios', caster, target).healing![0])
        dialRolls.push(SpellCastingService.resolveSpellEffect('dial', caster, target).healing![0])
        dialkoRolls.push(SpellCastingService.resolveSpellEffect('dialko', caster, target).healing![0])
        madiRolls.push(SpellCastingService.resolveSpellEffect('madi', caster, target).healing![0])
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      // Verify healing progression
      expect(avg(dialRolls)).toBeGreaterThan(avg(diosRolls))
      expect(avg(dialkoRolls)).toBeGreaterThan(avg(dialRolls))
      expect(avg(madiRolls)).toBeGreaterThan(avg(diosRolls))
    })

    it('verifies anti-undead spell progression', () => {
      const caster = createTestCharacter({ level: 10 })
      const undead = [createTestMonster({ id: 'skeleton', undead: true })]

      const badiosRolls: number[] = []
      const badialRolls: number[] = []
      const badialmaRolls: number[] = []

      for (let i = 0; i < 100; i++) {
        badiosRolls.push(SpellCastingService.resolveSpellEffect('badios', caster, undead).damage![0])
        badialRolls.push(SpellCastingService.resolveSpellEffect('badial', caster, undead).damage![0])
        badialmaRolls.push(SpellCastingService.resolveSpellEffect('badialma', caster, undead).damage![0])
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      // Verify anti-undead progression
      expect(avg(badialRolls)).toBeGreaterThan(avg(badiosRolls))
      expect(avg(badialmaRolls)).toBeGreaterThan(avg(badialRolls))
    })
  })

  describe('Edge Cases', () => {
    it('MALIKTO works on already full HP characters', () => {
      const caster = createTestCharacter({ level: 8 })
      const fullHP = createTestCharacter({ id: 'c1', hp: 50, maxHp: 50 })

      const effect = SpellCastingService.resolveSpellEffect('malikto', caster, [fullHP])

      expect(effect.fullHeal).toEqual(['c1'])
    })

    it('KADORTO works on dead characters', () => {
      const caster = createTestCharacter({ level: 8 })
      const dead = createTestCharacter({ id: 'fallen', hp: 0, maxHp: 30, status: 'DEAD' as any })

      const effect = SpellCastingService.resolveSpellEffect('kadorto', caster, [dead])

      expect(effect.resurrection).toEqual(['fallen'])
    })

    it('LITOKAN works on characters with no ailments', () => {
      const caster = createTestCharacter({ level: 6 })
      const healthy = createTestCharacter({ id: 'c1', status: 'OK' })

      const effect = SpellCastingService.resolveSpellEffect('litokan', caster, [healthy])

      expect(effect.statusCures!.targetIds).toEqual(['c1'])
    })

    it('paralysis spell works on empty target array', () => {
      const caster = createTestCharacter({ level: 5 })

      const effect = SpellCastingService.resolveSpellEffect('morlis', caster, [])

      expect(effect.statusEffects).toEqual([])
    })
  })
})
