/**
 * StatModifierService - Data-driven stat modifier lookups
 *
 * Loads stat modifier tables from data/config/stat-modifiers.json
 * Provides lookup functions for VIT HP bonus, STR damage, AGI initiative, etc.
 *
 * Data-driven architecture:
 * - All modifier tables defined in JSON config file
 * - Source references for each table link to research documentation
 * - No hardcoded modifier values in code
 */

interface ModifierRange {
  min: number
  max: number
  modifier: number
}

interface ModifierConfig {
  description: string
  source: string
  ranges: ModifierRange[]
}

interface StatModifiersData {
  vitalityHPModifier: ModifierConfig
  strengthHitModifier: ModifierConfig
  strengthDamageModifier: ModifierConfig
  agilityInitiativeModifier: ModifierConfig
}

class StatModifierServiceClass {
  private data: StatModifiersData | null = null

  /**
   * Initialize the service by loading stat modifier data
   */
  async initialize(): Promise<void> {
    const response = await fetch('/assets/config/stat-modifiers.json')
    if (!response.ok) {
      throw new Error(`Failed to load stat modifiers: HTTP ${response.status}`)
    }

    this.data = await response.json()
    console.log('StatModifierService: Loaded stat modifier tables')
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.data !== null
  }

  /**
   * Get modifier from a config by looking up the stat value in ranges
   * Throws if stat value is outside all defined ranges
   */
  private getModifier(config: ModifierConfig, statValue: number): number {
    for (const range of config.ranges) {
      if (statValue >= range.min && statValue <= range.max) {
        return range.modifier
      }
    }
    throw new Error(
      `Stat value ${statValue} not in any defined range for ${config.description}`
    )
  }

  /**
   * Get VIT HP modifier (authentic Wizardry 1)
   *
   * VIT 3 = -2, VIT 4-5 = -1, VIT 6-15 = 0, VIT 16 = +1, VIT 17 = +2, VIT 18+ = +3
   */
  getVitalityHPModifier(vitality: number): number {
    if (!this.data) {
      throw new Error('StatModifierService not initialized. Call initialize() first.')
    }
    return this.getModifier(this.data.vitalityHPModifier, vitality)
  }

  /**
   * Get STR hit probability modifier (percentage)
   *
   * STR 3 = -15%, STR 4 = -10%, STR 5 = -5%, STR 6-15 = 0%,
   * STR 16 = +5%, STR 17 = +10%, STR 18+ = +15%
   */
  getStrengthHitModifier(strength: number): number {
    if (!this.data) {
      throw new Error('StatModifierService not initialized. Call initialize() first.')
    }
    return this.getModifier(this.data.strengthHitModifier, strength)
  }

  /**
   * Get STR damage per swing modifier
   *
   * STR 3 = -3, STR 4 = -2, STR 5 = -1, STR 6-15 = 0,
   * STR 16 = +1, STR 17 = +2, STR 18+ = +3
   */
  getStrengthDamageModifier(strength: number): number {
    if (!this.data) {
      throw new Error('StatModifierService not initialized. Call initialize() first.')
    }
    return this.getModifier(this.data.strengthDamageModifier, strength)
  }

  /**
   * Get AGI initiative modifier (lower is faster, acts first)
   *
   * AGI 3 = +2, AGI 4-5 = +1, AGI 6-7 = 0, AGI 8-14 = -1,
   * AGI 15 = -2, AGI 16 = -3, AGI 17 = -4, AGI 18+ = -5
   */
  getAgilityInitiativeModifier(agility: number): number {
    if (!this.data) {
      throw new Error('StatModifierService not initialized. Call initialize() first.')
    }
    return this.getModifier(this.data.agilityInitiativeModifier, agility)
  }
}

export const StatModifierService = new StatModifierServiceClass()
