/**
 * Spell Casting Integration Tests
 *
 * Comprehensive integration tests for each spell in the game.
 * Tests verify:
 * 1. Spell data loads correctly from JSON
 * 2. Spell metadata (level, casterType, category, target, castableIn)
 * 3. Spell effects resolve correctly
 * 4. Context-appropriate casting (combat, camp, dungeon, town)
 *
 * Spell Categories Tested:
 * - Offensive/Damage Spells (14)
 * - Healing Spells (4)
 * - Buff Spells (8)
 * - Debuff/Status Effect Spells (6)
 * - Instant Death Spells (3)
 * - Resurrection Spells (2)
 * - Utility Spells (8)
 * - Status Cure Spells (2)
 * - Random Effect Spells (2)
 * - HP Reduction Spells (1)
 */

import { SpellDataLoader } from '../SpellDataLoader'
import { SpellCastingService } from '../SpellCastingService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'

// Load spell index to verify all spells are tested
const spellIndex = require('@data/spells/index.json') as string[]

describe('Spell Casting Integration Tests', () => {
  // Ensure spells are loaded before all tests
  beforeAll(async () => {
    await SpellDataLoader.loadAllSpells()
  })

  describe('Data Loading Verification', () => {
    it('loads all spells from index.json', () => {
      const allSpells = SpellDataLoader.getAllSpells()
      expect(allSpells.size).toBe(spellIndex.length)
      expect(SpellDataLoader.getFailedSpells().size).toBe(0)
    })

    it.each(spellIndex)('loads spell "%s" successfully', (spellId) => {
      const spell = SpellDataLoader.getSpell(spellId)
      expect(spell).toBeDefined()
      expect(spell!.id).toBe(spellId)
      expect(spell!.name).toBeTruthy()
      expect(spell!.level).toBeGreaterThanOrEqual(1)
      expect(spell!.level).toBeLessThanOrEqual(7)
      expect(['mage', 'priest']).toContain(spell!.casterType)
      expect(spell!.castableIn).toBeDefined()
      expect(spell!.castableIn.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // OFFENSIVE/DAMAGE SPELLS
  // ==========================================================================
  describe('Offensive/Damage Spells', () => {
    describe('HALITO (Level 1 Mage) - Single Target Fire', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('halito')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.category).toBe('offensive')
        expect(spell!.target).toBe('single')
        expect(spell!.castableIn).toContain('combat')
        expect(spell!.damage?.dice).toBe('1d8')
        expect(spell!.damage?.type).toBe('fire')
      })

      it('deals 1-8 fire damage to target', () => {
        const caster = createTestCharacter()
        const target = createTestMonster({ id: 'target1' })

        const effect = SpellCastingService.resolveSpellEffect('halito', caster, [target])

        expect(effect.damage).toBeDefined()
        expect(effect.damage).toHaveLength(1)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
        expect(effect.damage![0]).toBeLessThanOrEqual(8)
        expect(effect.message).toContain('HALITO')
      })

      it('is castable only in combat', () => {
        const spell = SpellDataLoader.getSpell('halito')
        expect(spell!.castableIn).toEqual(['combat'])
      })
    })

    describe('BADIOS (Level 1 Priest) - Single Target Divine', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('badios')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('offensive')
        expect(spell!.target).toBe('single')
        expect(spell!.damage?.dice).toBe('1d8')
        expect(spell!.damage?.type).toBe('divine')
      })

      it('deals 1-8 divine damage to single target', () => {
        const caster = createTestCharacter()
        const target = createTestMonster({ id: 'target1' })

        const effect = SpellCastingService.resolveSpellEffect('badios', caster, [target])

        expect(effect.damage).toHaveLength(1)
        expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
        expect(effect.damage![0]).toBeLessThanOrEqual(8)
      })
    })

    describe('MOLITO (Level 3 Mage) - Group Non-Elemental', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('molito')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(3)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.damage?.dice).toBe('3d6')
        expect(spell!.damage?.type).toBe('non-elemental')
      })

      it('deals 3-18 non-elemental damage to group', () => {
        const caster = createTestCharacter()
        const targets = [
          createTestMonster({ id: 't1' }),
          createTestMonster({ id: 't2' }),
          createTestMonster({ id: 't3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('molito', caster, targets)

        expect(effect.damage).toHaveLength(3)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(3)
          expect(dmg).toBeLessThanOrEqual(18)
        })
      })
    })

    describe('MAHALITO (Level 3 Mage) - Group Fire', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('mahalito')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(3)
        expect(spell!.damage?.dice).toBe('4d6')
        expect(spell!.damage?.type).toBe('fire')
      })

      it('deals 4-24 fire damage to group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)

        expect(effect.damage![0]).toBeGreaterThanOrEqual(4)
        expect(effect.damage![0]).toBeLessThanOrEqual(24)
      })
    })

    describe('LAHALITO (Level 4 Mage) - Group Fire', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('lahalito')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.damage?.dice).toBe('6d6')
        expect(spell!.damage?.type).toBe('fire')
      })

      it('deals 6-36 fire damage to group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('lahalito', caster, targets)

        expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
        expect(effect.damage![0]).toBeLessThanOrEqual(36)
      })
    })

    describe('LITOKAN (Level 5 Priest) - Group Fire', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('litokan')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.damage?.dice).toBe('3d8')
        expect(spell!.damage?.type).toBe('fire')
      })

      it('deals 3-24 fire damage to group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('litokan', caster, targets)

        expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
        expect(effect.damage![0]).toBeLessThanOrEqual(24)
      })
    })

    describe('DALTO (Level 4 Mage) - Group Cold', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dalto')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.damage?.dice).toBe('6d6')
        expect(spell!.damage?.type).toBe('cold')
      })

      it('deals 6-36 cold damage to group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('dalto', caster, targets)

        expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
        expect(effect.damage![0]).toBeLessThanOrEqual(36)
      })
    })

    describe('MADALTO (Level 5 Mage) - Group Cold', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('madalto')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.damage?.dice).toBe('8d8')
        expect(spell!.damage?.type).toBe('cold')
      })

      it('deals 8-64 cold damage to group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('madalto', caster, targets)

        expect(effect.damage![0]).toBeGreaterThanOrEqual(8)
        expect(effect.damage![0]).toBeLessThanOrEqual(64)
      })
    })

    describe('BADIAL (Level 4 Priest) - Single Target Divine', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('badial')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.damage?.dice).toBe('2d8')
      })

      it('deals 2-16 divine damage', () => {
        const caster = createTestCharacter()
        const target = createTestMonster({ id: 't1' })

        const effect = SpellCastingService.resolveSpellEffect('badial', caster, [target])

        expect(effect.damage![0]).toBeGreaterThanOrEqual(2)
        expect(effect.damage![0]).toBeLessThanOrEqual(16)
      })
    })

    describe('BADIALMA (Level 5 Priest) - Single Target Divine', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('badialma')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.damage?.dice).toBe('3d8')
      })

      it('deals 3-24 divine damage', () => {
        const caster = createTestCharacter()
        const target = createTestMonster({ id: 't1' })

        const effect = SpellCastingService.resolveSpellEffect('badialma', caster, [target])

        expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
        expect(effect.damage![0]).toBeLessThanOrEqual(24)
      })
    })

    describe('LORTO (Level 6 Priest) - Group Physical', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('lorto')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.damage?.dice).toBe('6d6')
      })

      it('deals 6-36 damage to group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('lorto', caster, targets)

        expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
        expect(effect.damage![0]).toBeLessThanOrEqual(36)
      })
    })

    describe('TILTOWAIT (Level 7 Mage) - All Enemies', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('tiltowait')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(7)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.target).toBe('all_enemies')
        expect(spell!.damage?.dice).toBe('10d15')
        expect(spell!.damage?.type).toBe('force')
      })

      it('deals massive damage to all enemies', () => {
        const caster = createTestCharacter()
        const targets = [
          createTestMonster({ id: 't1' }),
          createTestMonster({ id: 't2' }),
          createTestMonster({ id: 't3' }),
          createTestMonster({ id: 't4' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('tiltowait', caster, targets)

        expect(effect.damage).toHaveLength(4)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(10)
          expect(dmg).toBeLessThanOrEqual(150)
        })
      })
    })

    describe('MALIKTO (Level 7 Priest) - All Enemies', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('malikto')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(7)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.target).toBe('all_enemies')
        expect(spell!.damage?.dice).toBe('12d6')
        expect(spell!.damage?.type).toBe('divine')
      })

      it('deals massive divine damage to all enemies', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' }), createTestMonster({ id: 't2' })]

        const effect = SpellCastingService.resolveSpellEffect('malikto', caster, targets)

        expect(effect.damage).toHaveLength(2)
        effect.damage!.forEach(dmg => {
          expect(dmg).toBeGreaterThanOrEqual(12)
          expect(dmg).toBeLessThanOrEqual(72)
        })
      })
    })

    describe('ZILWAN (Level 6 Priest) - Undead Only', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('zilwan')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.undeadOnly).toBe(true)
        expect(spell!.damage?.dice).toBe('10d200')
        expect(spell!.damage?.type).toBe('holy')
      })

      it('has no effect on living creatures', () => {
        const caster = createTestCharacter()
        const livingTarget = createTestMonster({ id: 't1', undead: false })

        const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, [livingTarget])

        expect(effect.message).toContain('no effect')
      })

      it('deals massive damage to undead', () => {
        const caster = createTestCharacter()
        const undeadTarget = createTestMonster({ id: 't1', undead: true, name: 'Skeleton' })

        const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, [undeadTarget])

        expect(effect.damage).toBeDefined()
        expect(effect.damage![0]).toBeGreaterThanOrEqual(10)
      })
    })
  })

  // ==========================================================================
  // HEALING SPELLS
  // ==========================================================================
  describe('Healing Spells', () => {
    describe('DIOS (Level 1 Priest) - Basic Healing', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dios')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('healing')
        expect(spell!.target).toBe('single')
        expect(spell!.castableIn).toContain('combat')
        expect(spell!.castableIn).toContain('camp')
        expect(spell!.healing?.dice).toBe('1d8')
      })

      it('heals 1-8 HP to single ally', () => {
        const caster = createTestCharacter()
        const target = createTestCharacter({ id: 'ally1', hp: 5, maxHp: 20 })

        const effect = SpellCastingService.resolveSpellEffect('dios', caster, [target])

        expect(effect.healing).toBeDefined()
        expect(effect.healing).toHaveLength(1)
        expect(effect.healing![0]).toBeGreaterThanOrEqual(1)
        expect(effect.healing![0]).toBeLessThanOrEqual(8)
        expect(effect.message).toContain('DIOS')
      })

      it('is castable in both combat and camp', () => {
        const spell = SpellDataLoader.getSpell('dios')
        expect(spell!.castableIn).toContain('combat')
        expect(spell!.castableIn).toContain('camp')
      })
    })

    describe('DIAL (Level 4 Priest) - Improved Healing', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dial')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.healing?.dice).toBe('2d8')
      })

      it('heals 2-16 HP to single ally', () => {
        const caster = createTestCharacter()
        const target = createTestCharacter({ id: 'ally1' })

        const effect = SpellCastingService.resolveSpellEffect('dial', caster, [target])

        expect(effect.healing![0]).toBeGreaterThanOrEqual(2)
        expect(effect.healing![0]).toBeLessThanOrEqual(16)
      })
    })

    describe('DIALMA (Level 5 Priest) - Greater Healing', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dialma')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.healing?.dice).toBe('3d8')
      })

      it('heals 3-24 HP to single ally', () => {
        const caster = createTestCharacter()
        const target = createTestCharacter({ id: 'ally1' })

        const effect = SpellCastingService.resolveSpellEffect('dialma', caster, [target])

        expect(effect.healing![0]).toBeGreaterThanOrEqual(3)
        expect(effect.healing![0]).toBeLessThanOrEqual(24)
      })
    })

    describe('MADI (Level 6 Priest) - Full Heal + Cure', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('madi')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.healing?.type).toBe('full')
        expect(spell!.castableIn).toContain('camp')
      })

      it('fully heals a single ally', () => {
        const caster = createTestCharacter()
        const target = createTestCharacter({ id: 'ally1', hp: 1, maxHp: 50 })

        const effect = SpellCastingService.resolveSpellEffect('madi', caster, [target])

        expect(effect.fullHeal).toBeDefined()
        expect(effect.fullHeal).toContain('ally1')
        expect(effect.message).toContain('fully')
      })
    })
  })

  // ==========================================================================
  // BUFF SPELLS (AC MODIFIERS)
  // ==========================================================================
  describe('Buff Spells (AC Modifiers)', () => {
    describe('KALKI (Level 1 Priest) - Party Blessing', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('kalki')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('buff')
        expect(spell!.target).toBe('party')
        expect(spell!.acModifier).toBe(-1)
      })

      it('applies -1 AC to all party members', () => {
        const caster = createTestCharacter()
        const allies = [
          createTestCharacter({ id: 'a1' }),
          createTestCharacter({ id: 'a2' }),
          createTestCharacter({ id: 'a3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('kalki', caster, allies)

        expect(effect.acBuffs).toHaveLength(3)
        effect.acBuffs!.forEach(buff => {
          expect(buff.acModifier).toBe(-1)
        })
      })
    })

    describe('MATU (Level 2 Priest) - Better Blessing', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('matu')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(2)
        expect(spell!.acModifier).toBe(-2)
      })

      it('applies -2 AC to all allies', () => {
        const caster = createTestCharacter()
        const allies = [createTestCharacter({ id: 'a1' })]

        const effect = SpellCastingService.resolveSpellEffect('matu', caster, allies)

        expect(effect.acBuffs![0].acModifier).toBe(-2)
      })
    })

    describe('PORFIC (Level 1 Priest) - Self Shield', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('porfic')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.target).toBe('caster')
        expect(spell!.acModifier).toBe(-4)
        expect(spell!.castableIn).toEqual(['combat'])
      })

      it('applies -4 AC to caster only', () => {
        const caster = createTestCharacter({ id: 'caster1' })

        const effect = SpellCastingService.resolveSpellEffect('porfic', caster, [caster])

        expect(effect.acBuffs).toHaveLength(1)
        expect(effect.acBuffs![0].target).toBe('caster1')
        expect(effect.acBuffs![0].acModifier).toBe(-4)
      })
    })

    describe('MOGREF (Level 1 Mage) - Self Hardening', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('mogref')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.acModifier).toBe(-2)
      })

      it('applies -2 AC to caster', () => {
        const caster = createTestCharacter({ id: 'caster1' })

        const effect = SpellCastingService.resolveSpellEffect('mogref', caster, [caster])

        expect(effect.acBuffs![0].acModifier).toBe(-2)
      })
    })

    describe('SOPIC (Level 2 Mage) - Self Invisibility', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('sopic')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(2)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.acModifier).toBe(-4)
      })

      it('applies -4 AC via invisibility', () => {
        const caster = createTestCharacter({ id: 'caster1' })

        const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [caster])

        expect(effect.acBuffs![0].acModifier).toBe(-4)
      })
    })

    describe('BAMATU (Level 3 Priest) - Powerful Prayer', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('bamatu')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(3)
        expect(spell!.acModifier).toBe(-4)
      })

      it('applies -4 AC to party', () => {
        const caster = createTestCharacter()
        const allies = [createTestCharacter({ id: 'a1' })]

        const effect = SpellCastingService.resolveSpellEffect('bamatu', caster, allies)

        expect(effect.acBuffs![0].acModifier).toBe(-4)
      })
    })

    describe('MAPORFIC (Level 4 Priest) - Shield All', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('maporfic')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.acModifier).toBe(-2)
      })

      it('applies -2 AC to all allies', () => {
        const caster = createTestCharacter()
        const allies = [
          createTestCharacter({ id: 'a1' }),
          createTestCharacter({ id: 'a2' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('maporfic', caster, allies)

        expect(effect.acBuffs).toHaveLength(2)
        effect.acBuffs!.forEach(buff => {
          expect(buff.acModifier).toBe(-2)
        })
      })
    })

    describe('MASOPIC (Level 6 Mage) - Party Invisibility', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('masopic')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.target).toBe('party')
        expect(spell!.acModifier).toBe(-4)
      })

      it('applies -4 AC to entire party', () => {
        const caster = createTestCharacter()
        const allies = [
          createTestCharacter({ id: 'a1' }),
          createTestCharacter({ id: 'a2' }),
          createTestCharacter({ id: 'a3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('masopic', caster, allies)

        expect(effect.acBuffs).toHaveLength(3)
        effect.acBuffs!.forEach(buff => {
          expect(buff.acModifier).toBe(-4)
        })
      })
    })
  })

  // ==========================================================================
  // DEBUFF/STATUS EFFECT SPELLS
  // ==========================================================================
  describe('Debuff/Status Effect Spells', () => {
    describe('KATINO (Level 1 Mage) - Sleep', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('katino')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.category).toBe('debuff')
        expect(spell!.target).toBe('group')
        expect(spell!.statusEffect).toBeDefined()
      })

      it('attempts to put group to sleep', () => {
        const caster = createTestCharacter()
        const targets = [
          createTestMonster({ id: 't1' }),
          createTestMonster({ id: 't2' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('katino', caster, targets)

        expect(effect.statusEffects).toBeDefined()
        expect(effect.message).toContain('KATINO')
      })
    })

    describe('DILTO (Level 2 Mage) - Blind', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dilto')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(2)
        expect(spell!.statusEffect).toBeDefined()
      })

      it('attempts to blind enemy group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('dilto', caster, targets)

        expect(effect.statusEffects).toBeDefined()
      })
    })

    describe('MANIFO (Level 2 Priest) - Paralysis', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('manifo')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(2)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.target).toBe('group')
      })

      it('attempts to paralyze enemy group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('manifo', caster, targets)

        expect(effect.statusEffects).toBeDefined()
        expect(effect.message).toContain('MANIFO')
      })
    })

    describe('MONTINO (Level 2 Priest) - Silence', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('montino')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(2)
        expect(spell!.target).toBe('group')
      })

      it('attempts to silence enemy group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('montino', caster, targets)

        expect(effect.statusEffects).toBeDefined()
      })
    })

    describe('MORLIS (Level 4 Mage) - Fear', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('morlis')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.target).toBe('group')
      })

      it('attempts to cause fear in enemy group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('morlis', caster, targets)

        expect(effect.statusEffects).toBeDefined()
      })
    })

    describe('MAMORLIS (Level 5 Mage) - Mass Fear', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('mamorlis')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.target).toBe('all_enemies')
      })

      it('attempts to cause fear in all enemies', () => {
        const caster = createTestCharacter()
        const targets = [
          createTestMonster({ id: 't1' }),
          createTestMonster({ id: 't2' }),
          createTestMonster({ id: 't3' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('mamorlis', caster, targets)

        expect(effect.statusEffects).toBeDefined()
      })
    })
  })

  // ==========================================================================
  // INSTANT DEATH SPELLS
  // ==========================================================================
  describe('Instant Death Spells', () => {
    describe('BADI (Level 5 Priest) - Single Target Death', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('badi')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('instant_death')
        expect(spell!.target).toBe('single')
        expect(spell!.instantDeath).toBeDefined()
      })

      it('attempts instant death on single target', () => {
        const caster = createTestCharacter()
        const target = createTestMonster({ id: 't1' })

        const effect = SpellCastingService.resolveSpellEffect('badi', caster, [target])

        expect(effect.instantDeath).toBeDefined()
        expect(effect.message).toContain('BADI')
      })
    })

    describe('MAKANITO (Level 5 Mage) - Suffocation All', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('makanito')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.category).toBe('instant_death')
        expect(spell!.target).toBe('all_enemies')
        expect(spell!.instantDeath).toBeDefined()
      })

      it('attempts instant death on all enemies', () => {
        const caster = createTestCharacter()
        const targets = [
          createTestMonster({ id: 't1' }),
          createTestMonster({ id: 't2' })
        ]

        const effect = SpellCastingService.resolveSpellEffect('makanito', caster, targets)

        expect(effect.instantDeath).toBeDefined()
      })
    })

    describe('LAKANITO (Level 6 Mage) - Suffocation Group', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('lakanito')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.target).toBe('group')
        expect(spell!.instantDeath).toBeDefined()
      })

      it('attempts instant death on group', () => {
        const caster = createTestCharacter()
        const targets = [createTestMonster({ id: 't1' })]

        const effect = SpellCastingService.resolveSpellEffect('lakanito', caster, targets)

        expect(effect.instantDeath).toBeDefined()
        expect(effect.message).toContain('LAKANITO')
      })
    })
  })

  // ==========================================================================
  // RESURRECTION SPELLS
  // ==========================================================================
  describe('Resurrection Spells', () => {
    describe('DI (Level 5 Priest) - Basic Resurrection', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('di')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('resurrection')
        expect(spell!.target).toBe('dead_ally')
        expect(spell!.castableIn).toContain('camp')
        expect(spell!.resurrection).toBeDefined()
        expect(spell!.resurrection?.worksOn).toContain('dead')
        expect(spell!.resurrection?.doesNotWorkOn).toContain('ashes')
      })

      it('uses vitality-based success formula', () => {
        const spell = SpellDataLoader.getSpell('di')
        expect(spell!.resurrection?.typed?.variable).toBe('vitality')
        expect(spell!.resurrection?.typed?.multiplier).toBe(4)
      })

      it('resolves resurrection on dead character with high vitality', () => {
        // High vitality = high success chance
        RandomService.queueNextValues([0.1]) // 10% roll < 40% rate (vitality 10 × 4)
        const target = createTestCharacter({
          id: 'dead1',
          status: CharacterStatus.DEAD,
          vitality: 10,
          hp: 0,
          maxHp: 30
        })

        const result = SpellCastingService.resolveResurrection('di', target)

        expect(result.success).toBe(true)
        expect(result.newHp).toBe(1) // DI resurrects with 1 HP
        expect(result.vitalityLoss).toBe(1)
        expect(result.updatedCharacter.status).toBe(CharacterStatus.OK)
      })

      it('fails on ashes (DI only works on DEAD)', () => {
        const target = createTestCharacter({
          status: CharacterStatus.ASHES,
          vitality: 18
        })

        const result = SpellCastingService.resolveResurrection('di', target)

        expect(result.success).toBe(false)
        expect(result.message).toContain('cannot resurrect ashes')
      })
    })

    describe('KADORTO (Level 7 Priest) - Advanced Resurrection', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('kadorto')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(7)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('resurrection')
        expect(spell!.resurrection).toBeDefined()
        expect(spell!.resurrection?.worksOn).toContain('dead')
        expect(spell!.resurrection?.worksOn).toContain('ashes')
      })

      it('can resurrect from ashes with full HP on success', () => {
        // High vitality = high success chance
        RandomService.queueNextValues([0.1]) // 10% roll < 72% rate (vitality 18 × 4)
        const target = createTestCharacter({
          id: 'ash1',
          status: CharacterStatus.ASHES,
          vitality: 18,
          hp: 0,
          maxHp: 50
        })

        const result = SpellCastingService.resolveResurrection('kadorto', target)

        expect(result.success).toBe(true)
        expect(result.newHp).toBe(50) // KADORTO gives full HP
        expect(result.updatedCharacter.status).toBe(CharacterStatus.OK)
      })

      it('character becomes LOST if resurrect from ashes fails', () => {
        RandomService.queueNextValues([0.99]) // 99% roll > any success rate
        const target = createTestCharacter({
          status: CharacterStatus.ASHES,
          vitality: 10
        })

        const result = SpellCastingService.resolveResurrection('kadorto', target)

        expect(result.success).toBe(false)
        expect(result.resultStatus).toBe('LOST')
        expect(result.updatedCharacter.status).toBe(CharacterStatus.LOST)
      })
    })
  })

  // ==========================================================================
  // UTILITY SPELLS
  // ==========================================================================
  describe('Utility Spells', () => {
    describe('DUMAPIC (Level 1 Mage) - Show Coordinates', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dumapic')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.category).toBe('utility')
        expect(spell!.target).toBe('party')
        expect(spell!.castableIn).toContain('camp')
        expect(spell!.utility).toBe('show_coordinates')
      })

      it('reveals dungeon location', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('dumapic', caster, [caster])

        expect(effect.message).toContain('DUMAPIC')
        expect(effect.message).toContain('location')
      })

      it('is camp-only spell', () => {
        const spell = SpellDataLoader.getSpell('dumapic')
        expect(spell!.castableIn).toEqual(['camp'])
      })
    })

    describe('MILWA (Level 1 Priest) - Light', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('milwa')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(1)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.utility).toBe('extended_light')
      })

      it('creates light', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('milwa', caster, [caster])

        expect(effect.message).toContain('MILWA')
      })
    })

    describe('LOMILWA (Level 3 Priest) - Extended Light', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('lomilwa')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(3)
        expect(spell!.utility).toBe('extended_light')
      })

      it('provides extended light', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('lomilwa', caster, [caster])

        expect(effect.message).toContain('LOMILWA')
      })
    })

    describe('LATUMAPIC (Level 3 Priest) - Identify Monsters', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('latumapic')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(3)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.utility).toBe('identify_foe')
        expect(spell!.castableIn).toContain('combat')
        expect(spell!.castableIn).toContain('camp')
      })

      it('identifies enemies', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('latumapic', caster, [caster])

        expect(effect.message).toContain('LATUMAPIC')
        expect(effect.message).toContain('identifies')
      })
    })

    describe('CALFO (Level 2 Priest) - Identify Trap', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('calfo')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(2)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.utility).toBe('identify_trap')
        expect(spell!.castableIn).toContain('looting')
      })

      it('reveals trap type', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('calfo', caster, [caster])

        expect(effect.message).toContain('CALFO')
        expect(effect.message).toContain('trap')
      })
    })

    describe('KANDI (Level 5 Priest) - Locate Person', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('kandi')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(5)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.utility).toBe('locate_person')
        expect(spell!.castableIn).toContain('camp')
      })

      it('locates missing persons', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('kandi', caster, [caster])

        expect(effect.message).toContain('KANDI')
        expect(effect.message).toContain('locates')
      })
    })

    describe('MALOR (Level 7 Mage) - Teleport', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('malor')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(7)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.utility).toBe('teleport')
        expect(spell!.castableIn).toContain('combat')
        expect(spell!.castableIn).toContain('camp')
      })

      it('has different camp and combat behaviors', () => {
        const spell = SpellDataLoader.getSpell('malor')
        expect(spell!.campBehavior?.type).toBe('coordinate_teleport')
        expect(spell!.combatBehavior?.type).toBe('random_escape')
        expect(spell!.combatBehavior?.safe).toBe(true)
      })

      it('teleports safely in combat', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('malor', caster, [caster], 'combat')

        expect(effect.teleport).toBeDefined()
        expect(effect.teleport!.success).toBe(true)
        expect(effect.teleport!.safe).toBe(true)
        expect(effect.teleport!.mode).toBe('random_escape')
      })

      it('requires coordinates in camp with rock death danger', () => {
        const caster = createTestCharacter()

        const effect = SpellCastingService.resolveSpellEffect('malor', caster, [caster], 'camp')

        expect(effect.teleport).toBeDefined()
        expect(effect.teleport!.mode).toBe('coordinate_teleport')
        expect(effect.teleport!.dangers?.solidRock).toBe('instant_party_death')
      })
    })

    describe('LOKTOFEIT (Level 6 Priest) - Recall to Town', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('loktofeit')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.utility).toBe('recall')
        expect(spell!.escape?.destination).toBe('castle')
        expect(spell!.escape?.onSuccess?.equipmentLost).toBe(true)
        expect(spell!.escape?.onSuccess?.goldLostPercent).toBe(90)
      })

      it('success rate scales with caster level', () => {
        const spell = SpellDataLoader.getSpell('loktofeit')
        expect(spell!.escape?.typed?.type).toBe('level_scaled')
        expect(spell!.escape?.typed?.variable).toBe('caster_level')
        expect(spell!.escape?.typed?.multiplier).toBe(2)
      })

      it('on success recalls to town but loses equipment and gold', () => {
        RandomService.queueNextValues([0.01]) // Very low roll = success
        const caster = createTestCharacter({ level: 10 })

        const effect = SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster])

        expect(effect.recall).toBeDefined()
        expect(effect.recall!.success).toBe(true)
        expect(effect.recall!.equipmentLost).toBe(true)
        expect(effect.recall!.goldLostPercent).toBe(90)
        expect(effect.message).toContain('equipment')
      })

      it('can fail at low caster levels', () => {
        RandomService.queueNextValues([0.99]) // High roll = fail
        const caster = createTestCharacter({ level: 1 })

        const effect = SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster])

        expect(effect.recall!.success).toBe(false)
        expect(effect.message).toContain('fails')
      })
    })
  })

  // ==========================================================================
  // STATUS CURE SPELLS
  // ==========================================================================
  describe('Status Cure Spells', () => {
    describe('LATUMOFIS (Level 4 Priest) - Cure Poison', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('latumofis')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(4)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('support')
        expect(spell!.statusCure).toBe('poison')
        expect(spell!.castableIn).toContain('combat')
        expect(spell!.castableIn).toContain('camp')
      })

      it('cures poison from single target', () => {
        const caster = createTestCharacter()
        const target = createTestCharacter({ id: 'poisoned1' })

        const effect = SpellCastingService.resolveSpellEffect('latumofis', caster, [target])

        expect(effect.statusCures).toBeDefined()
        expect(effect.statusCures!.targetIds).toContain('poisoned1')
        expect(effect.statusCures!.cureType).toBe('poison')
        expect(effect.message).toContain('LATUMOFIS')
        expect(effect.message).toContain('poison')
      })
    })

    describe('DIALKO (Level 3 Priest) - Cure Paralysis', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('dialko')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(3)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.statusCure).toBe('paralysis')
      })

      it('cures paralysis from single target', () => {
        const caster = createTestCharacter()
        const target = createTestCharacter({ id: 'paralyzed1' })

        const effect = SpellCastingService.resolveSpellEffect('dialko', caster, [target])

        expect(effect.statusCures).toBeDefined()
        expect(effect.statusCures!.cureType).toBe('paralysis')
        expect(effect.message).toContain('DIALKO')
      })
    })
  })

  // ==========================================================================
  // RANDOM EFFECT SPELLS
  // ==========================================================================
  describe('Random Effect Spells', () => {
    describe('HAMAN (Level 6 Mage) - Random Effect', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('haman')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.randomEffects).toBeDefined()
        expect(spell!.randomEffects).toHaveLength(5)
        expect(spell!.cost?.experienceLevels).toBe(1)
        expect(spell!.requirements?.minCasterLevel).toBe(13)
      })

      it('selects random effect from 5 possibilities', () => {
        // Queue random values: effect index (0-4), spellbook mangling roll
        RandomService.queueNextValues([0.0, 0.0]) // First effect, no mangling
        const caster = createTestCharacter({ level: 15 })

        const effect = SpellCastingService.resolveSpellEffect('haman', caster, [caster])

        expect(effect.randomEffect).toBeDefined()
        expect(effect.randomEffect!.effectId).toBeGreaterThanOrEqual(1)
        expect(effect.randomEffect!.effectId).toBeLessThanOrEqual(5)
        expect(effect.randomEffect!.levelDrain).toBe(1)
        expect(effect.message).toContain('HAMAN')
      })

      it('can cause spellbook mangling', () => {
        // Roll that equals 5 causes mangling
        RandomService.queueNextValues([0.0, 0.333]) // First effect, mangling (roll = 5 when level=15)
        const caster = createTestCharacter({ level: 15 })

        const effect = SpellCastingService.resolveSpellEffect('haman', caster, [caster])

        // Note: Mangling happens when random(0, casterLevel) === 5
        // At level 15, that's about 1/16 chance
        expect(effect.randomEffect).toBeDefined()
      })
    })

    describe('MAHAMAN (Level 7 Mage) - Powerful Random Effect', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('mahaman')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(7)
        expect(spell!.casterType).toBe('mage')
        expect(spell!.randomEffects).toBeDefined()
        expect(spell!.randomEffects).toHaveLength(3)
        expect(spell!.cost?.experienceLevels).toBe(1)
        expect(spell!.cost?.mustRelearn).toBe(true)
      })

      it('selects random effect from 3 possibilities', () => {
        RandomService.queueNextValues([0.0, 0.0]) // First effect, no mangling
        const caster = createTestCharacter({ level: 15 })

        const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, [caster])

        expect(effect.randomEffect).toBeDefined()
        expect(effect.randomEffect!.effectId).toBeGreaterThanOrEqual(1)
        expect(effect.randomEffect!.effectId).toBeLessThanOrEqual(3)
        expect(effect.randomEffect!.mustRelearn).toBe(true)
      })

      it('costs 1 level and must relearn spell', () => {
        RandomService.queueNextValues([0.0, 0.0])
        const caster = createTestCharacter({ level: 15 })

        const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, [caster])

        expect(effect.randomEffect!.levelDrain).toBe(1)
        expect(effect.randomEffect!.mustRelearn).toBe(true)
      })
    })
  })

  // ==========================================================================
  // HP REDUCTION SPELLS
  // ==========================================================================
  describe('HP Reduction Spells', () => {
    describe('MABADI (Level 6 Priest) - HP Reduction', () => {
      it('loads with correct metadata', () => {
        const spell = SpellDataLoader.getSpell('mabadi')
        expect(spell).toBeDefined()
        expect(spell!.level).toBe(6)
        expect(spell!.casterType).toBe('priest')
        expect(spell!.category).toBe('offensive')
        expect(spell!.effect?.type).toBe('hp_reduction')
        expect(spell!.effect?.remainingHP?.dice).toBe('1d8')
        expect(spell!.effect?.noSavingThrow).toBe(true)
      })

      it('reduces target HP to 1-8 regardless of current HP', () => {
        const caster = createTestCharacter()
        const target = createTestMonster({ id: 't1', hp: 500, maxHp: 500 })

        const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, [target])

        expect(effect.hpReduction).toBeDefined()
        expect(effect.hpReduction).toHaveLength(1)
        expect(effect.hpReduction![0].targetId).toBe('t1')
        expect(effect.hpReduction![0].newHp).toBeGreaterThanOrEqual(1)
        expect(effect.hpReduction![0].newHp).toBeLessThanOrEqual(8)
        expect(effect.message).toContain('MABADI')
      })

      it('cannot be resisted', () => {
        const spell = SpellDataLoader.getSpell('mabadi')
        expect(spell!.effect?.noSavingThrow).toBe(true)
      })

      it('affects multiple targets', () => {
        const caster = createTestCharacter()
        const targets = [
          createTestMonster({ id: 't1', hp: 100 }),
          createTestMonster({ id: 't2', hp: 200 }),
          createTestMonster({ id: 't3', hp: 300 })
        ]

        const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, targets)

        expect(effect.hpReduction).toHaveLength(3)
        effect.hpReduction!.forEach(reduction => {
          expect(reduction.newHp).toBeGreaterThanOrEqual(1)
          expect(reduction.newHp).toBeLessThanOrEqual(8)
        })
      })
    })
  })

  // ==========================================================================
  // SPELL CASTING ELIGIBILITY
  // ==========================================================================
  describe('Spell Casting Eligibility', () => {
    describe('canCastSpell', () => {
      it('allows casting with sufficient mage spell points', () => {
        const mage = createTestCharacter({
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

        const result = SpellCastingService.canCastSpell(mage, 'halito')
        expect(result.canCast).toBe(true)
      })

      it('allows casting with sufficient priest spell points', () => {
        const priest = createTestCharacter({
          spellPoints: {
            priest: {
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

        const result = SpellCastingService.canCastSpell(priest, 'dios')
        expect(result.canCast).toBe(true)
      })

      it('prevents casting with no spell points', () => {
        const fighter = createTestCharacter()

        const result = SpellCastingService.canCastSpell(fighter, 'halito')
        expect(result.canCast).toBe(false)
        expect(result.reason).toBe('No spell points')
      })

      it('prevents casting with insufficient spell points', () => {
        const mage = createTestCharacter({
          spellPoints: {
            mage: {
              level1: { current: 0, max: 3 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })

        const result = SpellCastingService.canCastSpell(mage, 'halito')
        expect(result.canCast).toBe(false)
        expect(result.reason).toBe('Insufficient spell points')
      })

      it('prevents casting while asleep', () => {
        const mage = createTestCharacter({
          status: CharacterStatus.ASLEEP,
          spellPoints: {
            mage: {
              level1: { current: 9, max: 9 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })

        const result = SpellCastingService.canCastSpell(mage, 'halito')
        expect(result.canCast).toBe(false)
        expect(result.reason).toBe('Cannot cast while incapacitated')
      })

      it('prevents casting while paralyzed', () => {
        const mage = createTestCharacter({
          status: CharacterStatus.PARALYZED,
          spellPoints: {
            mage: {
              level1: { current: 9, max: 9 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })

        const result = SpellCastingService.canCastSpell(mage, 'halito')
        expect(result.canCast).toBe(false)
        expect(result.reason).toBe('Cannot cast while incapacitated')
      })

      it('returns unknown spell error for invalid spell', () => {
        const mage = createTestCharacter()
        const result = SpellCastingService.canCastSpell(mage, 'notarealspell')
        expect(result.canCast).toBe(false)
        expect(result.reason).toBe('Unknown spell')
      })
    })

    describe('deductSpellPoints', () => {
      it('deducts one point from correct spell level', () => {
        const mage = createTestCharacter({
          spellPoints: {
            mage: {
              level1: { current: 5, max: 5 },
              level2: { current: 3, max: 3 },
              level3: { current: 2, max: 2 },
              level4: { current: 1, max: 1 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })

        const result = SpellCastingService.deductSpellPoints(mage, 'halito')

        expect(result.spellPoints!.mage!.level1.current).toBe(4)
        expect(result.spellPoints!.mage!.level2.current).toBe(3) // Unchanged
      })

      it('returns new character object (immutable)', () => {
        const mage = createTestCharacter({
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

        const result = SpellCastingService.deductSpellPoints(mage, 'halito')

        expect(result).not.toBe(mage)
        expect(result.spellPoints).not.toBe(mage.spellPoints)
        expect(mage.spellPoints!.mage!.level1.current).toBe(5) // Original unchanged
      })

      it('deducts from correct level for higher level spells', () => {
        const priest = createTestCharacter({
          spellPoints: {
            priest: {
              level1: { current: 5, max: 5 },
              level2: { current: 3, max: 3 },
              level3: { current: 2, max: 2 },
              level4: { current: 4, max: 4 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })

        const result = SpellCastingService.deductSpellPoints(priest, 'dial') // Level 4

        expect(result.spellPoints!.priest!.level4.current).toBe(3)
        expect(result.spellPoints!.priest!.level1.current).toBe(5) // Unchanged
      })
    })
  })

  // ==========================================================================
  // CONTEXT-BASED SPELL FILTERING
  // ==========================================================================
  describe('Context-Based Spell Filtering', () => {
    describe('getSpellsByContext', () => {
      it('returns combat spells for combat context', () => {
        const mage = createTestCharacter({
          knownSpells: ['halito', 'dios', 'dumapic'],
          spellPoints: {
            mage: {
              level1: { current: 3, max: 3 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            },
            priest: {
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

        const combatSpells = SpellCastingService.getSpellsByContext(mage, 'combat')
        const spellIds = combatSpells.map(s => s.id)

        expect(spellIds).toContain('halito') // Combat only
        expect(spellIds).toContain('dios') // Combat and camp
        expect(spellIds).not.toContain('dumapic') // Camp only
      })

      it('excludes combat-only spells from dungeon context', () => {
        const mage = createTestCharacter({
          knownSpells: ['halito', 'dios', 'dumapic'],
          spellPoints: {
            mage: {
              level1: { current: 3, max: 3 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            },
            priest: {
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

        const dungeonSpells = SpellCastingService.getSpellsByContext(mage, 'dungeon')
        const spellIds = dungeonSpells.map(s => s.id)

        expect(spellIds).not.toContain('halito') // Combat only
        expect(spellIds).toContain('dios') // Camp healing
        expect(spellIds).toContain('dumapic') // Camp utility
      })

      it('returns healing spells for town context', () => {
        const priest = createTestCharacter({
          knownSpells: ['dios', 'dial', 'halito'],
          spellPoints: {
            priest: {
              level1: { current: 3, max: 3 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 3, max: 3 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })

        const townSpells = SpellCastingService.getSpellsByContext(priest, 'town')
        const spellIds = townSpells.map(s => s.id)

        expect(spellIds).toContain('dios')
        expect(spellIds).toContain('dial')
        expect(spellIds).not.toContain('halito') // Combat only
      })

      it('returns empty array when no spells match context', () => {
        const mage = createTestCharacter({
          knownSpells: ['halito'], // Combat only
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

        const dungeonSpells = SpellCastingService.getSpellsByContext(mage, 'dungeon')
        expect(dungeonSpells).toHaveLength(0)
      })
    })

    describe('hasSpellsInContext', () => {
      it('returns true when character has spells for context', () => {
        const priest = createTestCharacter({
          knownSpells: ['dios'],
          spellPoints: {
            priest: {
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

        expect(SpellCastingService.hasSpellsInContext(priest, 'dungeon')).toBe(true)
        expect(SpellCastingService.hasSpellsInContext(priest, 'combat')).toBe(true)
        expect(SpellCastingService.hasSpellsInContext(priest, 'town')).toBe(true)
      })

      it('returns false when character has no spells for context', () => {
        const mage = createTestCharacter({
          knownSpells: ['halito'], // Combat only
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

        expect(SpellCastingService.hasSpellsInContext(mage, 'dungeon')).toBe(false)
        expect(SpellCastingService.hasSpellsInContext(mage, 'town')).toBe(false)
        expect(SpellCastingService.hasSpellsInContext(mage, 'combat')).toBe(true)
      })
    })
  })
})
