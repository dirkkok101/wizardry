// src/services/MonsterResistanceService.ts
import { MonsterInstance } from '@models/Combat'
import { MonsterDataLoader } from './MonsterDataLoader'
import { MonsterTemplate } from '@validation/MonsterSchema'
import { RandomService } from './RandomService'
import { LoadedSpell } from '@models/SpellDefinition'
import { FormulaService } from './FormulaService'
import { TypedFormula } from '@validation/spell-schema'

/**
 * MonsterResistanceService - Implements Wizardry 1 monster spell resistance mechanics
 *
 * Research-based formulas:
 * - (20 × Level)% - KATINO (sleep)
 * - (10 × Level)% - MONTINO (silence), BADI (death)
 * - (50 + 10 × Level)% - MANIFO (paralyze)
 * - (6 × Level)% - LAKANITO (suffocation)
 * - Fire/Cold resistance = half damage
 * - Magic Resistance = spell save percentage (from monster data)
 * - No resistance = MABADI, MAKANITO (if eligible)
 *
 * See: docs/research/spell-reference.md for full documentation
 */

export interface ResistanceResult {
  /** Whether the spell effect was fully resisted (negated) */
  resisted: boolean
  /** Damage multiplier: 1.0 = full, 0.5 = half (elemental resist), 0 = immune */
  damageMultiplier: number
  /** The calculated resistance chance (0-100) for logging */
  resistChance: number
  /** Description of why resistance applied */
  reason?: string
}

export interface InstantDeathCheck {
  /** Whether the target is immune to this instant death effect */
  immune: boolean
  /** Whether the target successfully resisted */
  resisted: boolean
  /** Resistance chance that was checked */
  resistChance: number
  /** Reason for immunity or resistance */
  reason?: string
}

export class MonsterResistanceService {
  /**
   * Check if a monster resists a spell effect
   * Uses formulas from spell JSON and monster template data
   *
   * @param monster - Target monster instance
   * @param spell - Spell being cast
   * @returns Resistance result with damage multiplier
   */
  static checkResistance(
    monster: MonsterInstance,
    spell: LoadedSpell
  ): ResistanceResult {
    const template = MonsterDataLoader.getMonster(monster.monsterId)
    if (!template) {
      // No template = no resistance data, allow full effect
      return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
    }

    // Check for "no resistance" spells first (MABADI)
    if (spell.resistance?.type === 'none' || spell.effect?.noSavingThrow) {
      return { resisted: false, damageMultiplier: 1.0, resistChance: 0, reason: 'No saving throw allowed' }
    }

    // Check elemental damage resistance (fire/cold)
    if (spell.damage?.type) {
      const elementalResult = this.checkElementalResistance(template, spell.damage.type)
      if (elementalResult.damageMultiplier < 1.0) {
        return elementalResult
      }
    }

    // Check spell resistance from typed data
    if (spell.resistance?.typed) {
      return this.checkTypedResistance(monster.level, spell.resistance.typed)
    }

    // Check magic resistance (general spell save)
    if (spell.resistance?.type === 'magic_resistance') {
      return this.checkMagicResistance(template)
    }

    // Default: no resistance
    return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
  }

  /**
   * Check elemental (fire/cold) resistance
   * Fire/Cold resistant monsters take half damage
   */
  static checkElementalResistance(
    template: MonsterTemplate,
    damageType: string
  ): ResistanceResult {
    const resistType = damageType === 'fire' ? 'fire' : damageType === 'cold' ? 'cold' : null
    if (!resistType) {
      return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
    }

    const resistance = template.resistances.find(r => r.type === resistType)
    if (resistance && resistance.value > 0) {
      // Per research: fire/cold resistant = half damage (no full immunity)
      return {
        resisted: false,
        damageMultiplier: 0.5,
        resistChance: resistance.value,
        reason: `${resistType} resistant`
      }
    }

    return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
  }

  /**
   * Check resistance using typed formula data
   * Uses FormulaService for calculation - NO string parsing
   */
  static checkTypedResistance(
    monsterLevel: number,
    typed: TypedFormula
  ): ResistanceResult {
    const resistChance = FormulaService.calculate(typed, { monsterLevel })

    // Roll against resistance chance
    const resisted = RandomService.chance(Math.min(resistChance, 100))

    return {
      resisted,
      damageMultiplier: resisted ? 0 : 1.0,
      resistChance,
      reason: resisted ? `Resisted (${resistChance}% chance)` : undefined
    }
  }

  /**
   * Check monster's general magic resistance
   * Uses the magic resistance value from monster template
   */
  static checkMagicResistance(template: MonsterTemplate): ResistanceResult {
    const magicResist = template.resistances.find(r => r.type === 'magic')
    if (!magicResist || magicResist.value === 0) {
      return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
    }

    const resisted = RandomService.chance(magicResist.value)
    return {
      resisted,
      damageMultiplier: resisted ? 0 : 1.0,
      resistChance: magicResist.value,
      reason: resisted ? `Magic resistance (${magicResist.value}%)` : undefined
    }
  }

  /**
   * Check instant death spell eligibility and resistance
   *
   * MAKANITO: Kill ≤7HD, no save, undead immune
   * LAKANITO: Kill breathers, (6×Level)% resist, undead immune
   * BADI: Kill any, (10×Level)% resist
   */
  static checkInstantDeathResistance(
    monster: MonsterInstance,
    spell: LoadedSpell
  ): InstantDeathCheck {
    const template = MonsterDataLoader.getMonster(monster.monsterId)

    // Type guard for object-style instant death
    const instantDeathObj = typeof spell.instantDeath === 'object' && spell.instantDeath !== null
      ? spell.instantDeath
      : null

    // MAKANITO-style: Kill threshold with no save
    if (instantDeathObj?.killThreshold) {
      const maxHD = instantDeathObj.killThreshold.maxHitDice || 7

      // Check undead immunity
      if (spell.immunities?.includes('undead') && monster.undead) {
        return { immune: true, resisted: false, resistChance: 0, reason: 'Undead are immune' }
      }

      // Check level threshold
      if (monster.level > maxHD) {
        return { immune: true, resisted: false, resistChance: 0, reason: `Level ${monster.level} exceeds ${maxHD}HD threshold` }
      }

      // No saving throw for MAKANITO
      if (instantDeathObj.noSavingThrow) {
        return { immune: false, resisted: false, resistChance: 0, reason: 'No saving throw' }
      }
    }

    // LAKANITO-style: Suffocation (breathers only)
    if (instantDeathObj?.type === 'suffocation') {
      // Undead don't breathe
      if (monster.undead) {
        return { immune: true, resisted: false, resistChance: 0, reason: 'Undead do not breathe' }
      }

      // Check for non-breathing creatures (constructs, etc.)
      if (template && spell.immunities) {
        const isConstruct = template.monsterClass === 'demon' // Simplified - expand as needed
        if (spell.immunities.includes('constructs') && isConstruct) {
          return { immune: true, resisted: false, resistChance: 0, reason: 'Construct does not breathe' }
        }
      }

      // Apply resistance using typed data
      if (spell.resistance?.typed) {
        const resistChance = FormulaService.calculate(spell.resistance.typed, { monsterLevel: monster.level })
        const resisted = RandomService.chance(Math.min(resistChance, 100))
        return { immune: false, resisted, resistChance, reason: resisted ? `Resisted suffocation (${resistChance}%)` : undefined }
      }
    }

    // BADI-style: Single target instant death with resistance
    if (instantDeathObj?.savingThrow && spell.resistance?.typed) {
      const resistChance = FormulaService.calculate(spell.resistance.typed, { monsterLevel: monster.level })
      const resisted = RandomService.chance(Math.min(resistChance, 100))
      return { immune: false, resisted, resistChance, reason: resisted ? `Resisted (${resistChance}%)` : undefined }
    }

    // Default: not immune, not resisted
    return { immune: false, resisted: false, resistChance: 0 }
  }

  /**
   * Check status effect resistance (sleep, paralysis, silence, fear)
   * Requires typed formula data in spell.resistance.typed
   */
  static checkStatusEffectResistance(
    monster: MonsterInstance,
    spell: LoadedSpell
  ): ResistanceResult {
    // Use typed formula data
    if (spell.resistance?.typed) {
      const resistChance = FormulaService.calculate(spell.resistance.typed, { monsterLevel: monster.level })
      const resisted = RandomService.chance(Math.min(resistChance, 100))
      return {
        resisted,
        damageMultiplier: resisted ? 0 : 1.0,
        resistChance,
        reason: resisted ? `Resisted status effect (${resistChance}%)` : undefined
      }
    }

    // No typed data = no resistance
    return { resisted: false, damageMultiplier: 1.0, resistChance: 0 }
  }

  /**
   * Calculate recovery chance using typed formula data
   * Uses FormulaService for calculation - NO string parsing
   */
  static getRecoveryChanceFromTyped(
    monsterLevel: number,
    typed: TypedFormula
  ): number {
    return FormulaService.calculate(typed, { monsterLevel })
  }

  /**
   * Roll for recovery using typed formula data
   * @returns true if status effect is removed this round
   */
  static rollRecoveryFromTyped(
    monsterLevel: number,
    typed: TypedFormula
  ): boolean {
    const chance = this.getRecoveryChanceFromTyped(monsterLevel, typed)
    return RandomService.chance(chance)
  }

  /**
   * Roll for status recovery using default formulas
   *
   * Wizardry 1 recovery mechanics (per round):
   * - ASLEEP: Higher chance to wake up (50% - 5% per monster level)
   * - PARALYZED: Lower base chance (30% - 3% per monster level)
   * - SILENCED: Moderate chance (40% - 4% per monster level)
   * - FEAR/BLIND: Same as silenced (40% - 4% per monster level)
   *
   * Higher level monsters stay incapacitated longer
   * Minimum 5% recovery chance for all status types
   */
  static rollRecovery(
    monsterLevel: number,
    statusType: 'ASLEEP' | 'PARALYZED' | 'SILENCED' | 'FEAR'
  ): boolean {
    let baseChance: number
    let levelPenalty: number

    switch (statusType) {
      case 'ASLEEP':
        // Sleep is easier to shake off
        baseChance = 50
        levelPenalty = 5
        break
      case 'PARALYZED':
        // Paralysis is harder to recover from
        baseChance = 30
        levelPenalty = 3
        break
      case 'SILENCED':
      case 'FEAR':
      default:
        // Moderate recovery for other effects
        baseChance = 40
        levelPenalty = 4
        break
    }

    // Calculate chance with minimum of 5%
    const chance = Math.max(5, baseChance - (levelPenalty * monsterLevel))
    return RandomService.chance(chance)
  }
}
