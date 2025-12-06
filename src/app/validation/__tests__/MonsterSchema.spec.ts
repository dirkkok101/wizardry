// src/validation/__tests__/MonsterSchema.spec.ts
import { validateMonster, safeValidateMonster, MonsterTemplate } from '../MonsterSchema'
import { ZodError } from 'zod'

describe('MonsterSchema', () => {
  describe('valid monster data', () => {
    it('validates a basic monster', () => {
      const validMonster = {
        id: 'test_slime',
        numericId: 0,
        name: 'Test Slime',
        unidentifiedName: 'Slime',
        level: 1,
        numberAppearing: { min: 2, max: 4 },
        hp: { min: 2, max: 4 },
        ac: 12,
        damage: [{ dice: '1d1', min: 1, max: 1 }],
        xp: 55,
        monsterClass: 'enchanted',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      const result = validateMonster(validMonster)
      expect(result.id).toBe('test_slime')
      expect(result.name).toBe('Test Slime')
    })

    it('validates a spellcaster with required fields', () => {
      const validSpellcaster = {
        id: 'test_mage',
        numericId: 10,
        name: 'Test Mage',
        unidentifiedName: 'Man in Robes',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 2, max: 5 },
        ac: 4,
        damage: [],
        xp: 475,
        monsterClass: 'mage',
        specialAbilities: ['spellcasting'],
        spellLevels: { mage: 1 },
        spells: ['katino', 'halito'],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      const result = validateMonster(validSpellcaster)
      expect(result.specialAbilities).toContain('spellcasting')
      expect(result.spellLevels).toEqual({ mage: 1 })
    })

    it('validates a monster with breath weapon', () => {
      const validBreather = {
        id: 'test_dragon',
        numericId: 81,
        name: 'Test Dragon',
        unidentifiedName: 'Dragon',
        level: 5,
        numberAppearing: { min: 1, max: 4 },
        hp: { min: 12, max: 96 },
        ac: -2,
        damage: [
          { dice: '2d8', min: 2, max: 16 },
          { dice: '2d8', min: 2, max: 16 }
        ],
        xp: 5360,
        monsterClass: 'dragon',
        specialAbilities: ['breath_weapon', 'multiple_attacks'],
        breathWeapon: {
          type: 'fire'
        },
        resistances: [],
        regeneration: 0,
        isBoss: true,
        canFlee: false
      }

      const result = validateMonster(validBreather)
      expect(result.breathWeapon?.type).toBe('fire')
    })

    it('validates a level-draining undead', () => {
      const validLevelDrainer = {
        id: 'test_vampire',
        numericId: 86,
        name: 'Test Vampire',
        unidentifiedName: 'Unseen Entity',
        level: 10,
        numberAppearing: { min: 1, max: 4 },
        hp: { min: 11, max: 88 },
        ac: -1,
        damage: [
          { dice: '3d8', min: 3, max: 24 },
          { dice: '3d8', min: 3, max: 24 }
        ],
        xp: 3330,
        monsterClass: 'undead',
        specialAbilities: ['level_drain', 'multiple_attacks', 'regeneration'],
        levelDrain: 2,
        resistances: [],
        regeneration: 3,
        isBoss: false,
        canFlee: false
      }

      const result = validateMonster(validLevelDrainer)
      expect(result.levelDrain).toBe(2)
    })
  })

  describe('invalid monster data', () => {
    it('rejects monster with missing required fields', () => {
      const invalidMonster = {
        id: 'incomplete',
        name: 'Incomplete Monster'
        // Missing required fields
      }

      expect(() => validateMonster(invalidMonster)).toThrow(ZodError)
    })

    it('rejects monster with invalid dice format', () => {
      const invalidDice = {
        id: 'bad_dice',
        numericId: 0,
        name: 'Bad Dice',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 10,
        damage: [{ dice: 'invalid', min: 1, max: 8 }],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(invalidDice)).toThrow(ZodError)
    })

    it('rejects monster with invalid AC range', () => {
      const invalidAC = {
        id: 'bad_ac',
        numericId: 0,
        name: 'Bad AC',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 25, // Out of range
        damage: [],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(invalidAC)).toThrow(ZodError)
    })

    it('rejects spellcaster without spells', () => {
      const noSpells = {
        id: 'bad_mage',
        numericId: 0,
        name: 'Bad Mage',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'mage',
        specialAbilities: ['spellcasting'], // Has ability but no spells
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(noSpells)).toThrow(ZodError)
    })

    it('rejects breath weapon ability without breathWeapon definition', () => {
      const noBreath = {
        id: 'bad_dragon',
        numericId: 0,
        name: 'Bad Dragon',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'dragon',
        specialAbilities: ['breath_weapon'], // Has ability but no definition
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(noBreath)).toThrow(ZodError)
    })

    it('rejects regeneration > 0 without regeneration ability', () => {
      const badRegen = {
        id: 'bad_regen',
        numericId: 0,
        name: 'Bad Regen',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: [], // No regeneration ability
        resistances: [],
        regeneration: 3, // But has regeneration value
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(badRegen)).toThrow(ZodError)
    })

    it('rejects level_drain ability without levelDrain amount', () => {
      const noDrainAmount = {
        id: 'bad_drainer',
        numericId: 0,
        name: 'Bad Drainer',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'undead',
        specialAbilities: ['level_drain'], // Has ability but no amount
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(noDrainAmount)).toThrow(ZodError)
    })

    it('rejects final boss that is not unique', () => {
      const notUnique = {
        id: 'fake_boss',
        numericId: 0,
        name: 'Fake Boss',
        level: 10,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 100, max: 200 },
        ac: -5,
        damage: [],
        xp: 10000,
        monsterClass: 'mage',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: true,
        isFinalBoss: true, // Final boss but not unique
        canFlee: false
      }

      expect(() => validateMonster(notUnique)).toThrow(ZodError)
    })

    it('rejects fixed encounter without location', () => {
      const noLocation = {
        id: 'fixed_no_loc',
        numericId: 0,
        name: 'Fixed No Location',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false,
        fixedEncounter: true // Fixed but no location
      }

      expect(() => validateMonster(noLocation)).toThrow(ZodError)
    })

    it('rejects magic_resistance ability without magic resistance value', () => {
      const noMagicRes = {
        id: 'bad_magic_res',
        numericId: 0,
        name: 'Bad Magic Res',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: ['magic_resistance'], // Has ability but no resistance
        resistances: [], // Empty resistances
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      expect(() => validateMonster(noMagicRes)).toThrow(ZodError)
    })

    it('rejects unknown properties (strict mode)', () => {
      const extraProps = {
        id: 'extra_props',
        numericId: 0,
        name: 'Extra Props',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 4,
        damage: [],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false,
        unknownField: 'should fail' // Unknown property
      }

      expect(() => validateMonster(extraProps)).toThrow(ZodError)
    })
  })

  describe('partner field validation', () => {
    // Helper to create valid monster base
    const createValidMonster = (overrides: Record<string, unknown> = {}) => ({
      id: 'test_monster',
      numericId: 0,
      name: 'Test Monster',
      unidentifiedName: 'Animal',
      level: 1,
      numberAppearing: { min: 1, max: 1 },
      hp: { min: 1, max: 10 },
      ac: 10,
      damage: [],
      xp: 100,
      monsterClass: 'animal',
      specialAbilities: [],
      resistances: [],
      regeneration: 0,
      isBoss: false,
      canFlee: false,
      ...overrides
    })

    it('accepts valid partner data', () => {
      const monster = createValidMonster({
        partner: { monsterId: 'kobold', chance: 20 }
      })

      const result = safeValidateMonster(monster)

      expect(result.success).toBe(true)
    })

    it('rejects partner with chance > 100', () => {
      const monster = createValidMonster({
        partner: { monsterId: 'kobold', chance: 150 }
      })

      const result = safeValidateMonster(monster)

      expect(result.success).toBe(false)
    })

    it('rejects partner with chance < 0', () => {
      const monster = createValidMonster({
        partner: { monsterId: 'kobold', chance: -10 }
      })

      const result = safeValidateMonster(monster)

      expect(result.success).toBe(false)
    })

    it('allows monsters without partner field', () => {
      const monster = createValidMonster()
      // Explicitly remove partner if it exists
      delete (monster as Record<string, unknown>).partner

      const result = safeValidateMonster(monster)

      expect(result.success).toBe(true)
    })
  })

  describe('safeValidateMonster', () => {
    it('returns success for valid data', () => {
      const validMonster = {
        id: 'test',
        numericId: 0,
        name: 'Test',
        unidentifiedName: 'Animal',
        level: 1,
        numberAppearing: { min: 1, max: 1 },
        hp: { min: 1, max: 10 },
        ac: 10,
        damage: [],
        xp: 100,
        monsterClass: 'animal',
        specialAbilities: [],
        resistances: [],
        regeneration: 0,
        isBoss: false,
        canFlee: false
      }

      const result = safeValidateMonster(validMonster)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('test')
      }
    })

    it('returns error for invalid data without throwing', () => {
      const invalidMonster = {
        id: 'test'
        // Missing required fields
      }

      const result = safeValidateMonster(invalidMonster)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })
})
