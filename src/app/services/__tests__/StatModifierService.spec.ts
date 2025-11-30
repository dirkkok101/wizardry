import { StatModifierService } from '../StatModifierService'

/**
 * StatModifierService tests
 *
 * Tests the data-driven stat modifier lookups against authentic Wizardry 1 values.
 * Source: docs/research/character-creation-technical-reference.md
 */
describe('StatModifierService', () => {
  beforeAll(async () => {
    // Mock fetch for stat modifiers config
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      if (path.includes('/assets/config/stat-modifiers.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            vitalityHPModifier: {
              description: 'HP modifier per level based on Vitality stat (authentic Wizardry 1)',
              source: 'docs/research/character-creation-technical-reference.md section 5.4',
              ranges: [
                { min: 3, max: 3, modifier: -2 },
                { min: 4, max: 5, modifier: -1 },
                { min: 6, max: 15, modifier: 0 },
                { min: 16, max: 16, modifier: 1 },
                { min: 17, max: 17, modifier: 2 },
                { min: 18, max: 99, modifier: 3 }
              ]
            },
            strengthHitModifier: {
              description: 'Hit probability modifier (percentage) based on Strength stat',
              source: 'docs/research/character-creation-technical-reference.md section 7.1',
              ranges: [
                { min: 3, max: 3, modifier: -15 },
                { min: 4, max: 4, modifier: -10 },
                { min: 5, max: 5, modifier: -5 },
                { min: 6, max: 15, modifier: 0 },
                { min: 16, max: 16, modifier: 5 },
                { min: 17, max: 17, modifier: 10 },
                { min: 18, max: 99, modifier: 15 }
              ]
            },
            strengthDamageModifier: {
              description: 'Damage per swing modifier based on Strength stat',
              source: 'docs/research/character-creation-technical-reference.md section 7.1',
              ranges: [
                { min: 3, max: 3, modifier: -3 },
                { min: 4, max: 4, modifier: -2 },
                { min: 5, max: 5, modifier: -1 },
                { min: 6, max: 15, modifier: 0 },
                { min: 16, max: 16, modifier: 1 },
                { min: 17, max: 17, modifier: 2 },
                { min: 18, max: 99, modifier: 3 }
              ]
            },
            agilityInitiativeModifier: {
              description: 'Initiative modifier based on Agility (lower is faster, acts first)',
              source: 'docs/research/character-creation-technical-reference.md section 7.3',
              ranges: [
                { min: 3, max: 3, modifier: 2 },
                { min: 4, max: 5, modifier: 1 },
                { min: 6, max: 7, modifier: 0 },
                { min: 8, max: 14, modifier: -1 },
                { min: 15, max: 15, modifier: -2 },
                { min: 16, max: 16, modifier: -3 },
                { min: 17, max: 17, modifier: -4 },
                { min: 18, max: 99, modifier: -5 }
              ]
            }
          })
        } as Response)
      }

      return Promise.reject(new Error(`Not found: ${path}`))
    }) as jest.Mock

    await StatModifierService.initialize()
  })

  describe('getVitalityHPModifier', () => {
    it('returns -2 for VIT 3 (authentic Wizardry 1)', () => {
      expect(StatModifierService.getVitalityHPModifier(3)).toBe(-2)
    })

    it('returns -1 for VIT 4-5', () => {
      expect(StatModifierService.getVitalityHPModifier(4)).toBe(-1)
      expect(StatModifierService.getVitalityHPModifier(5)).toBe(-1)
    })

    it('returns 0 for VIT 6-15 (flat middle range - key difference from wrong implementation)', () => {
      // This is the critical fix: VIT 6-15 should all return 0
      // The previous incorrect implementation had bonuses/penalties at every 2-point interval
      for (let vit = 6; vit <= 15; vit++) {
        expect(StatModifierService.getVitalityHPModifier(vit)).toBe(0)
      }
    })

    it('returns +1 for VIT 16', () => {
      expect(StatModifierService.getVitalityHPModifier(16)).toBe(1)
    })

    it('returns +2 for VIT 17', () => {
      expect(StatModifierService.getVitalityHPModifier(17)).toBe(2)
    })

    it('returns +3 for VIT 18', () => {
      expect(StatModifierService.getVitalityHPModifier(18)).toBe(3)
    })

    it('returns +3 for VIT above 18 (edge case)', () => {
      // Defensive: handle stats that exceed normal range
      expect(StatModifierService.getVitalityHPModifier(19)).toBe(3)
      expect(StatModifierService.getVitalityHPModifier(20)).toBe(3)
    })
  })

  describe('getStrengthHitModifier', () => {
    it('returns -15% for STR 3', () => {
      expect(StatModifierService.getStrengthHitModifier(3)).toBe(-15)
    })

    it('returns -10% for STR 4', () => {
      expect(StatModifierService.getStrengthHitModifier(4)).toBe(-10)
    })

    it('returns -5% for STR 5', () => {
      expect(StatModifierService.getStrengthHitModifier(5)).toBe(-5)
    })

    it('returns 0% for STR 6-15 (flat middle range)', () => {
      for (let str = 6; str <= 15; str++) {
        expect(StatModifierService.getStrengthHitModifier(str)).toBe(0)
      }
    })

    it('returns +5% for STR 16', () => {
      expect(StatModifierService.getStrengthHitModifier(16)).toBe(5)
    })

    it('returns +10% for STR 17', () => {
      expect(StatModifierService.getStrengthHitModifier(17)).toBe(10)
    })

    it('returns +15% for STR 18', () => {
      expect(StatModifierService.getStrengthHitModifier(18)).toBe(15)
    })
  })

  describe('getStrengthDamageModifier', () => {
    it('returns -3 for STR 3', () => {
      expect(StatModifierService.getStrengthDamageModifier(3)).toBe(-3)
    })

    it('returns -2 for STR 4', () => {
      expect(StatModifierService.getStrengthDamageModifier(4)).toBe(-2)
    })

    it('returns -1 for STR 5', () => {
      expect(StatModifierService.getStrengthDamageModifier(5)).toBe(-1)
    })

    it('returns 0 for STR 6-15 (flat middle range)', () => {
      for (let str = 6; str <= 15; str++) {
        expect(StatModifierService.getStrengthDamageModifier(str)).toBe(0)
      }
    })

    it('returns +1 for STR 16', () => {
      expect(StatModifierService.getStrengthDamageModifier(16)).toBe(1)
    })

    it('returns +2 for STR 17', () => {
      expect(StatModifierService.getStrengthDamageModifier(17)).toBe(2)
    })

    it('returns +3 for STR 18', () => {
      expect(StatModifierService.getStrengthDamageModifier(18)).toBe(3)
    })
  })

  describe('getAgilityInitiativeModifier', () => {
    it('returns +2 for AGI 3 (slowest)', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(3)).toBe(2)
    })

    it('returns +1 for AGI 4-5', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(4)).toBe(1)
      expect(StatModifierService.getAgilityInitiativeModifier(5)).toBe(1)
    })

    it('returns 0 for AGI 6-7 (base)', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(6)).toBe(0)
      expect(StatModifierService.getAgilityInitiativeModifier(7)).toBe(0)
    })

    it('returns -1 for AGI 8-14', () => {
      for (let agi = 8; agi <= 14; agi++) {
        expect(StatModifierService.getAgilityInitiativeModifier(agi)).toBe(-1)
      }
    })

    it('returns -2 for AGI 15', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(15)).toBe(-2)
    })

    it('returns -3 for AGI 16', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(16)).toBe(-3)
    })

    it('returns -4 for AGI 17', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(17)).toBe(-4)
    })

    it('returns -5 for AGI 18 (fastest)', () => {
      expect(StatModifierService.getAgilityInitiativeModifier(18)).toBe(-5)
    })
  })

  describe('isInitialized', () => {
    it('returns true after initialization', () => {
      expect(StatModifierService.isInitialized()).toBe(true)
    })
  })
})
