// src/services/FormulaService.ts
import {
  TypedFormula,
  LevelScaledFormula
} from '@validation/spell-schema'

/**
 * FormulaService - Pure typed formula calculation
 *
 * This service ONLY reads typed data structures from spell JSON.
 * It NEVER parses formula strings - those are documentation only.
 *
 * Formula types:
 * - level_scaled: base + (multiplier × variable), capped at cap
 * - fixed: constant value
 * - none: always returns 0 (no effect)
 */

export interface FormulaContext {
  /** Monster's level/hit dice (for resistance formulas) */
  monsterLevel?: number
  /** Caster's character level (for LOKTOFEIT escape formula) */
  casterLevel?: number
  /** Target's vitality stat (for DI/KADORTO resurrection) */
  vitality?: number
}

export class FormulaService {
  /**
   * Calculate percentage value from typed formula data
   *
   * @param formula - Typed formula from spell JSON
   * @param context - Variable values (monster level, caster level, vitality)
   * @returns Calculated percentage (0-100), capped by formula.cap
   */
  static calculate(formula: TypedFormula, context: FormulaContext): number {
    switch (formula.type) {
      case 'level_scaled':
        return this.calculateLevelScaled(formula, context)

      case 'fixed':
        return formula.value

      case 'none':
        return 0
    }
  }

  /**
   * Calculate level-scaled formula: base + (multiplier × variable)
   * Result is capped at formula.cap (default 100)
   */
  private static calculateLevelScaled(
    formula: LevelScaledFormula,
    context: FormulaContext
  ): number {
    const variableValue = this.getVariableValue(formula.variable, context)
    const base = formula.base ?? 0
    const cap = formula.cap ?? 100

    const result = base + (formula.multiplier * variableValue)
    return Math.min(result, cap)
  }

  /**
   * Get the value for a formula variable from context
   * Returns 1 as default if variable not provided (prevents zero multiplication)
   */
  private static getVariableValue(
    variable: 'monster_level' | 'caster_level' | 'vitality',
    context: FormulaContext
  ): number {
    switch (variable) {
      case 'monster_level':
        return context.monsterLevel ?? 1
      case 'caster_level':
        return context.casterLevel ?? 1
      case 'vitality':
        return context.vitality ?? 1
    }
  }

  /**
   * Convenience: Check if a formula results in 100% (auto-success/auto-resist)
   */
  static isGuaranteed(formula: TypedFormula, context: FormulaContext): boolean {
    return this.calculate(formula, context) >= 100
  }

  /**
   * Convenience: Check if a formula results in 0% (no chance)
   */
  static isImpossible(formula: TypedFormula, context: FormulaContext): boolean {
    return this.calculate(formula, context) <= 0
  }
}
