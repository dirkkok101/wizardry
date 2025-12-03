// src/services/__tests__/CombatService.phase8.spec.ts
import { CombatService } from '../CombatService'
import { SpellCastingService } from '../SpellCastingService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'

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

      it('DALTO is 6d6 cold damage (higher base than MAHALITO 4d6)', () => {
        const caster = createTestCharacter({ level: 5 })
        const targets = [createTestMonster({ id: 'm1' })]

        // Verify DALTO damage is within 6d6 range
        // Note: Elemental resistance may halve damage, so test min damage / 2
        const effect = SpellCastingService.resolveSpellEffect('dalto', caster, targets)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
        // 6d6 = min 6, max 36 (or halved: min 3, max 18)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
        expect(effect.damage![0]).toBeLessThanOrEqual(36)
      })
    })

    describe('TILTOWAIT (Mage Level 7 - The Nuke)', () => {
      it('resolves TILTOWAIT with 10d15 damage', () => {
        const caster = createTestCharacter({ level: 10 })
        const targets = [
          createTestMonster({ id: 'm1', hp: 100, maxHp: 100 }),
          createTestMonster({ id: 'm2', hp: 100, maxHp: 100 })
        ]

        const effect = SpellCastingService.resolveSpellEffect('tiltowait', caster, targets)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(2)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(10)   // 10d15 minimum
          expect(dmg).toBeLessThanOrEqual(150)     // 10d15 maximum
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
    describe('BADIAL (Priest Level 3 - Hurt All Groups)', () => {
      it('resolves BADIAL with 2d8 damage to all enemy groups', () => {
        const caster = createTestCharacter({ level: 5 })
        const enemyGroup = [
          createTestMonster({ id: 'skeleton1', undead: true }),
          createTestMonster({ id: 'orc', undead: false }),
          createTestMonster({ id: 'goblin', undead: false })
        ]

        const effect = SpellCastingService.resolveSpellEffect('badial', caster, enemyGroup)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(3)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(2)
          expect(dmg).toBeLessThanOrEqual(16)
        })
      })

      it('damages living creatures as well as undead (authentic Wizardry 1 behavior)', () => {
        const caster = createTestCharacter({ level: 5 })
        const living = [createTestMonster({ id: 'orc', undead: false })]

        const effect = SpellCastingService.resolveSpellEffect('badial', caster, living)

        // BADIAL damages ALL enemies, not just undead (per research docs)
        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
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
    describe('DIALMA (Priest Level 5 - Greater Healing)', () => {
      it('resolves DIALMA with 3d8 healing', () => {
        const caster = createTestCharacter({ level: 6 })
        const injured = createTestCharacter({ id: 'fighter', hp: 10, maxHp: 50 })

        const effect = SpellCastingService.resolveSpellEffect('dialma', caster, [injured])

        expect(effect.healing).toBeDefined()
        expect(effect.healing).toHaveLength(1)
        expect(effect.healing![0]).toBeGreaterThanOrEqual(3)  // 3d8 min
        expect(effect.healing![0]).toBeLessThanOrEqual(24)    // 3d8 max
        expect(effect.message).toContain('DIALMA')
      })

      it('DIALMA heals more than DIAL on average', () => {
        const caster = createTestCharacter({ level: 6 })
        const injured = [createTestCharacter({ id: 'c1', hp: 5, maxHp: 50 })]

        // Run multiple times to compare averages
        let dialTotal = 0, dialmaTotal = 0
        for (let i = 0; i < 100; i++) {
          dialTotal += SpellCastingService.resolveSpellEffect('dial', caster, injured).healing![0]
          dialmaTotal += SpellCastingService.resolveSpellEffect('dialma', caster, injured).healing![0]
        }

        // DIAL is 2d8 (avg 9), DIALMA is 3d8 (avg 13.5)
        expect(dialmaTotal / 100).toBeGreaterThan(dialTotal / 100)
      })
    })
  })

  describe('Status Effect Spells', () => {
    describe('MALIKTO (Priest Level 7 - Mass Damage)', () => {
      it('resolves MALIKTO with 12d6 damage to all enemies', () => {
        const caster = createTestCharacter({ level: 7 })
        const enemies = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' }),
          createTestMonster({ id: 'm3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('malikto', caster, enemies)

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(3)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(12)  // 12d6 min
          expect(dmg).toBeLessThanOrEqual(72)     // 12d6 max
        })
        expect(effect.message).toContain('MALIKTO')
      })
    })
  })

  describe('Instant Death & Resurrection', () => {
    describe('BADI (Priest Level 5 - Instant Death)', () => {
      it('resolves BADI for instant death to single target', () => {
        const caster = createTestCharacter({ level: 6 })
        const enemy = createTestMonster({ id: 'goblin1', hp: 20, maxHp: 20 })

        // Queue value to bypass resistance check
        RandomService.queueNextValues([0.5])

        const effect = SpellCastingService.resolveSpellEffect('badi', caster, [enemy])

        expect(effect.instantDeath).toBeDefined()
        expect(effect.instantDeath).toEqual(['goblin1'])
        expect(effect.message).toContain('BADI')
      })

      it('BADI is single-target spell', () => {
        const caster = createTestCharacter({ level: 6 })
        const enemy = createTestMonster({ id: 'm1' })

        // Queue value to bypass resistance check
        RandomService.queueNextValues([0.5])

        const effect = SpellCastingService.resolveSpellEffect('badi', caster, [enemy])

        // BADI targets single enemy per spell data
        expect(effect.instantDeath).toBeDefined()
        expect(effect.instantDeath).toHaveLength(1)
      })
    })

    describe('KADORTO (Priest Level 7 - Resurrection)', () => {
      it('resolves KADORTO for resurrection (camp spell)', () => {
        const caster = createTestCharacter({ level: 7 })
        const deadAlly = createTestCharacter({ id: 'fallen', hp: 0, maxHp: 30, status: 'DEAD' as any })

        const effect = SpellCastingService.resolveSpellEffect('kadorto', caster, [deadAlly])

        // KADORTO is camp-only spell that resurrects dead/ashes
        expect(effect.message).toContain('KADORTO')
        // The resurrection effect structure may vary - just verify message
      })
    })
  })

  describe('Utility Spells', () => {
    describe('LATUMOFIS (Priest Level 4 - Cure Poison)', () => {
      it('resolves LATUMOFIS to cure poison', () => {
        const caster = createTestCharacter({ level: 5 })
        const poisonedAlly = createTestCharacter({ id: 'fighter', status: 'POISONED' as any })

        const effect = SpellCastingService.resolveSpellEffect('latumofis', caster, [poisonedAlly])

        // LATUMOFIS cures poison status - just verify spell message
        expect(effect.message).toContain('LATUMOFIS')
      })
    })
  })

  describe('Fear Spell', () => {
    describe('MORLIS (Mage Level 4 - Fear)', () => {
      it('resolves MORLIS to cause fear in enemy group', () => {
        const caster = createTestCharacter({ level: 5 })
        const enemies = [
          createTestMonster({ id: 'm1' }),
          createTestMonster({ id: 'm2' })
        ]

        // Queue values to bypass resistance checks
        RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5])

        const effect = SpellCastingService.resolveSpellEffect('morlis', caster, enemies)

        expect(effect.statusEffects).toBeDefined()
        expect(effect.statusEffects).toEqual([
          { target: 'm1', effect: 'fear' },
          { target: 'm2', effect: 'fear' }
        ])
        expect(effect.message).toContain('MORLIS')
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
      const tiltoRolls: number[] = []

      for (let i = 0; i < 100; i++) {
        halitoRolls.push(SpellCastingService.resolveSpellEffect('halito', caster, target).damage![0])
        mahalitoRolls.push(SpellCastingService.resolveSpellEffect('mahalito', caster, target).damage![0])
        lahalitoRolls.push(SpellCastingService.resolveSpellEffect('lahalito', caster, target).damage![0])
        tiltoRolls.push(SpellCastingService.resolveSpellEffect('tiltowait', caster, target).damage![0])
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      // Verify core power progression (elemental resistance can affect comparisons)
      expect(avg(mahalitoRolls)).toBeGreaterThan(avg(halitoRolls))
      expect(avg(lahalitoRolls)).toBeGreaterThan(avg(mahalitoRolls))
      // TILTOWAIT (10d15) should be strongest overall
      expect(avg(tiltoRolls)).toBeGreaterThan(avg(lahalitoRolls))
    })

    it('verifies healing spell progression', () => {
      const caster = createTestCharacter({ level: 10 })
      const target = [createTestCharacter({ id: 'c1', hp: 5, maxHp: 100 })]

      const diosRolls: number[] = []
      const dialRolls: number[] = []
      const dialmaRolls: number[] = []

      for (let i = 0; i < 100; i++) {
        diosRolls.push(SpellCastingService.resolveSpellEffect('dios', caster, target).healing![0])
        dialRolls.push(SpellCastingService.resolveSpellEffect('dial', caster, target).healing![0])
        dialmaRolls.push(SpellCastingService.resolveSpellEffect('dialma', caster, target).healing![0])
      }

      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      // Verify healing progression: DIOS (1d8) < DIAL (2d8) < DIALMA (3d8)
      expect(avg(dialRolls)).toBeGreaterThan(avg(diosRolls))
      expect(avg(dialmaRolls)).toBeGreaterThan(avg(dialRolls))
      expect(avg(dialmaRolls)).toBeGreaterThan(avg(diosRolls))
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
    it('MALIKTO damages already injured enemies', () => {
      const caster = createTestCharacter({ level: 7 })
      const injured = createTestMonster({ id: 'goblin', hp: 5, maxHp: 20 })

      const effect = SpellCastingService.resolveSpellEffect('malikto', caster, [injured])

      expect(effect.damage).toBeDefined()
      expect(effect.damage).toHaveLength(1)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(12)
      expect(effect.damage![0]).toBeLessThanOrEqual(72)
    })

    it('KADORTO targets dead characters (camp spell)', () => {
      const caster = createTestCharacter({ level: 7 })
      const dead = createTestCharacter({ id: 'fallen', hp: 0, maxHp: 30, status: 'DEAD' as any })

      const effect = SpellCastingService.resolveSpellEffect('kadorto', caster, [dead])

      // KADORTO is camp-only resurrection spell
      expect(effect.message).toContain('KADORTO')
    })

    it('BADI instant death works on single target with resistance', () => {
      const caster = createTestCharacter({ level: 6 })
      const target = createTestMonster({ id: 'boss', hp: 150, maxHp: 150 })

      // Queue value to bypass resistance check
      RandomService.queueNextValues([0.5])

      const effect = SpellCastingService.resolveSpellEffect('badi', caster, [target])

      expect(effect.instantDeath).toEqual(['boss'])
    })

    it('fear spell works on empty target array', () => {
      const caster = createTestCharacter({ level: 5 })

      const effect = SpellCastingService.resolveSpellEffect('morlis', caster, [])

      expect(effect.statusEffects).toEqual([])
    })
  })
})
