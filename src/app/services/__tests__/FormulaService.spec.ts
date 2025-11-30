// src/services/__tests__/FormulaService.spec.ts
import { FormulaService, FormulaContext } from '../FormulaService'
import { TypedFormula } from '@validation/spell-schema'

describe('FormulaService', () => {
  describe('calculate', () => {
    describe('level_scaled formulas', () => {
      it('calculates (20 × Monster Level)% - KATINO resistance', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'monster_level',
          multiplier: 20,
          base: 0,
          cap: 100
        }

        expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(20)
        expect(FormulaService.calculate(formula, { monsterLevel: 2 })).toBe(40)
        expect(FormulaService.calculate(formula, { monsterLevel: 3 })).toBe(60)
        expect(FormulaService.calculate(formula, { monsterLevel: 5 })).toBe(100) // capped
        expect(FormulaService.calculate(formula, { monsterLevel: 10 })).toBe(100) // capped
      })

      it('calculates (50 + 10 × Monster Level)% - MANIFO resistance', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'monster_level',
          multiplier: 10,
          base: 50,
          cap: 100
        }

        expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(60)
        expect(FormulaService.calculate(formula, { monsterLevel: 2 })).toBe(70)
        expect(FormulaService.calculate(formula, { monsterLevel: 5 })).toBe(100) // capped
      })

      it('calculates (Vitality × 4)% - DI resurrection', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'vitality',
          multiplier: 4,
          base: 0,
          cap: 100
        }

        expect(FormulaService.calculate(formula, { vitality: 5 })).toBe(20)
        expect(FormulaService.calculate(formula, { vitality: 10 })).toBe(40)
        expect(FormulaService.calculate(formula, { vitality: 18 })).toBe(72)
        expect(FormulaService.calculate(formula, { vitality: 30 })).toBe(100) // capped
      })

      it('calculates (Caster Level × 2 + 1)% - LOKTOFEIT escape', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'caster_level',
          multiplier: 2,
          base: 1,
          cap: 100
        }

        expect(FormulaService.calculate(formula, { casterLevel: 13 })).toBe(27)
        expect(FormulaService.calculate(formula, { casterLevel: 20 })).toBe(41)
        expect(FormulaService.calculate(formula, { casterLevel: 50 })).toBe(100) // capped
      })

      it('calculates with custom cap (recovery capped at 50%)', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'monster_level',
          multiplier: 20,
          base: 0,
          cap: 50 // Recovery cap
        }

        expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(20)
        expect(FormulaService.calculate(formula, { monsterLevel: 2 })).toBe(40)
        expect(FormulaService.calculate(formula, { monsterLevel: 3 })).toBe(50) // capped at 50
        expect(FormulaService.calculate(formula, { monsterLevel: 10 })).toBe(50) // capped at 50
      })

      it('uses default values when context is missing', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'monster_level',
          multiplier: 20,
          base: 0,
          cap: 100
        }

        // Missing monsterLevel defaults to 1
        expect(FormulaService.calculate(formula, {})).toBe(20)
      })

      it('uses default base of 0 when not specified', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'monster_level',
          multiplier: 10
          // base not specified, should default to 0
        }

        expect(FormulaService.calculate(formula, { monsterLevel: 5 })).toBe(50)
      })

      it('uses default cap of 100 when not specified', () => {
        const formula: TypedFormula = {
          type: 'level_scaled',
          variable: 'monster_level',
          multiplier: 50
          // cap not specified, should default to 100
        }

        expect(FormulaService.calculate(formula, { monsterLevel: 3 })).toBe(100) // capped at 100
      })
    })

    describe('fixed formulas', () => {
      it('returns fixed value for CALFO (95%)', () => {
        const formula: TypedFormula = {
          type: 'fixed',
          value: 95
        }

        expect(FormulaService.calculate(formula, {})).toBe(95)
        expect(FormulaService.calculate(formula, { monsterLevel: 10 })).toBe(95)
      })

      it('returns fixed value for any context', () => {
        const formula: TypedFormula = {
          type: 'fixed',
          value: 75
        }

        expect(FormulaService.calculate(formula, { casterLevel: 1 })).toBe(75)
        expect(FormulaService.calculate(formula, { casterLevel: 100 })).toBe(75)
      })
    })

    describe('none formulas', () => {
      it('returns 0 for no-resistance spells (MABADI)', () => {
        const formula: TypedFormula = {
          type: 'none'
        }

        expect(FormulaService.calculate(formula, {})).toBe(0)
        expect(FormulaService.calculate(formula, { monsterLevel: 10 })).toBe(0)
      })
    })
  })

  describe('isGuaranteed', () => {
    it('returns true when result is 100 or higher', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 20,
        base: 0,
        cap: 100
      }

      expect(FormulaService.isGuaranteed(formula, { monsterLevel: 5 })).toBe(true)
      expect(FormulaService.isGuaranteed(formula, { monsterLevel: 10 })).toBe(true)
    })

    it('returns false when result is below 100', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 20,
        base: 0,
        cap: 100
      }

      expect(FormulaService.isGuaranteed(formula, { monsterLevel: 1 })).toBe(false)
      expect(FormulaService.isGuaranteed(formula, { monsterLevel: 4 })).toBe(false)
    })

    it('returns true for fixed 100%', () => {
      const formula: TypedFormula = {
        type: 'fixed',
        value: 100
      }

      expect(FormulaService.isGuaranteed(formula, {})).toBe(true)
    })

    it('returns false for none formulas', () => {
      const formula: TypedFormula = { type: 'none' }
      expect(FormulaService.isGuaranteed(formula, {})).toBe(false)
    })
  })

  describe('isImpossible', () => {
    it('returns true for none formulas (0%)', () => {
      const formula: TypedFormula = { type: 'none' }
      expect(FormulaService.isImpossible(formula, {})).toBe(true)
    })

    it('returns true for fixed 0%', () => {
      const formula: TypedFormula = {
        type: 'fixed',
        value: 0
      }

      expect(FormulaService.isImpossible(formula, {})).toBe(true)
    })

    it('returns false for any positive percentage', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 20,
        base: 0,
        cap: 100
      }

      expect(FormulaService.isImpossible(formula, { monsterLevel: 1 })).toBe(false)
    })
  })

  describe('real spell formulas', () => {
    // These tests verify the actual formulas from the plan

    it('KATINO resistance: (20 × Monster Level)%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 20,
        base: 0,
        cap: 100
      }

      // Level 1-4 monsters have increasing resistance
      expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(20)
      expect(FormulaService.calculate(formula, { monsterLevel: 4 })).toBe(80)
      // Level 5+ monsters are immune
      expect(FormulaService.calculate(formula, { monsterLevel: 5 })).toBe(100)
    })

    it('MANIFO resistance: (50 + Monster Level × 10)%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 10,
        base: 50,
        cap: 100
      }

      expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(60)
      expect(FormulaService.calculate(formula, { monsterLevel: 5 })).toBe(100)
    })

    it('MONTINO resistance: (10 × Monster Level)%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 10,
        base: 0,
        cap: 100
      }

      expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(10)
      expect(FormulaService.calculate(formula, { monsterLevel: 5 })).toBe(50)
      expect(FormulaService.calculate(formula, { monsterLevel: 10 })).toBe(100)
    })

    it('LAKANITO resistance: (6 × Monster Level)%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 6,
        base: 0,
        cap: 100
      }

      expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(6)
      expect(FormulaService.calculate(formula, { monsterLevel: 10 })).toBe(60)
      expect(FormulaService.calculate(formula, { monsterLevel: 17 })).toBe(100) // capped
    })

    it('KATINO recovery: (20 × Monster Level)% capped at 50%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 20,
        base: 0,
        cap: 50
      }

      expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(20)
      expect(FormulaService.calculate(formula, { monsterLevel: 2 })).toBe(40)
      expect(FormulaService.calculate(formula, { monsterLevel: 3 })).toBe(50) // capped
    })

    it('MANIFO recovery: (7 × Monster Level)% capped at 50%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'monster_level',
        multiplier: 7,
        base: 0,
        cap: 50
      }

      expect(FormulaService.calculate(formula, { monsterLevel: 1 })).toBe(7)
      expect(FormulaService.calculate(formula, { monsterLevel: 7 })).toBe(49)
      expect(FormulaService.calculate(formula, { monsterLevel: 8 })).toBe(50) // capped
    })

    it('DI/KADORTO success: (Vitality × 4)%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'vitality',
        multiplier: 4,
        base: 0,
        cap: 100
      }

      // From spell JSON examples
      expect(FormulaService.calculate(formula, { vitality: 5 })).toBe(20)
      expect(FormulaService.calculate(formula, { vitality: 10 })).toBe(40)
      expect(FormulaService.calculate(formula, { vitality: 18 })).toBe(72)
    })

    it('LOKTOFEIT escape: (Character Level × 2 + 1)%', () => {
      const formula: TypedFormula = {
        type: 'level_scaled',
        variable: 'caster_level',
        multiplier: 2,
        base: 1,
        cap: 100
      }

      // From spell JSON examples
      expect(FormulaService.calculate(formula, { casterLevel: 13 })).toBe(27)
      expect(FormulaService.calculate(formula, { casterLevel: 20 })).toBe(41)
    })
  })
})
