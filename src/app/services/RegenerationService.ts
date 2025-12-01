import { Character } from '@models/Character'
import { Item } from '@models/Item'

/**
 * Result of applying regeneration
 */
export interface RegenerationResult {
  previousHp: number
  newHp: number
  totalRegeneration: number
  regenSources: RegenerationSource[]
  characterDied: boolean
}

/**
 * Source of regeneration for tracking
 */
export interface RegenerationSource {
  itemId: string
  itemName: string
  amount: number
}

/**
 * RegenerationService - Handles HP regeneration from equipped items
 *
 * Per Item_System_Reference.md §3.9:
 * - Only the HIGHEST regeneration value takes effect (they do NOT stack)
 * - Positive regeneration heals HP
 * - Negative regeneration (cursed items) damages HP
 * - BUG in original: Deadly Ring's -3 never works because MAX(0, -3) = 0
 *
 * Regeneration is applied per combat round or rest tick with 25% chance.
 */
export class RegenerationService {
  /**
   * Get total regeneration rate from all equipped items
   *
   * Per §3.9: Only the HIGHEST value takes effect (does NOT sum).
   * Returns the maximum regeneration value from all equipped items.
   */
  static getRegenerationRate(character: Character): number {
    const sources = this.getRegenerationSources(character)
    if (sources.length === 0) return 0

    // Find max positive and min (most negative) values
    const positives = sources.filter(s => s.amount > 0)
    const negatives = sources.filter(s => s.amount < 0)

    // Per authentic Wizardry: MAX is used, which means positive always wins
    // This is why Deadly Ring's -3 never takes effect (BUG in original)
    if (positives.length > 0) {
      return Math.max(...positives.map(s => s.amount))
    }

    // Only negatives - take the "best" (closest to 0, i.e., max of negatives)
    // Actually per authentic Wizardry, the MAX calculation would be 0 vs negatives
    // Since no positive exists, we check if there are negatives
    if (negatives.length > 0) {
      // Original bug: maxHeal = MAX(maxHeal, item.healPoints) where maxHeal starts at 0
      // So -3 would never be selected because MAX(0, -3) = 0
      // To match original: return 0 (the bug)
      return 0  // Authentic Wizardry bug - negative regen never works
    }

    return 0
  }

  /**
   * Get all regeneration sources from equipped items
   *
   * Per Item_System_Reference.md §7.4: cursedForOwner items have all special
   * powers disabled, including regeneration.
   */
  static getRegenerationSources(character: Character): RegenerationSource[] {
    const sources: RegenerationSource[] = []
    const equippedItems = this.getEquippedItems(character)

    for (const item of equippedItems) {
      // Skip cursedForOwner items - their special powers are disabled
      if (item.cursedForOwner) {
        continue
      }

      const regen = item.special?.regeneration
      if (regen !== undefined && regen !== 0) {
        sources.push({
          itemId: item.id,
          itemName: item.name,
          amount: regen
        })
      }
    }

    return sources
  }

  /**
   * Apply one tick of regeneration to character
   *
   * Called once per combat round or rest tick.
   * Returns updated character and details of regeneration applied.
   *
   * Per §3.9: Only MAX regeneration value is used (sources tracked for display)
   */
  static applyRegeneration(character: Character): RegenerationResult {
    const sources = this.getRegenerationSources(character)
    // Use getRegenerationRate which returns MAX, not SUM
    const totalRegeneration = this.getRegenerationRate(character)
    const previousHp = character.hp

    // No regeneration to apply
    if (totalRegeneration === 0) {
      return {
        previousHp,
        newHp: previousHp,
        totalRegeneration: 0,
        regenSources: sources,
        characterDied: false
      }
    }

    // Calculate new HP
    let newHp = character.hp + totalRegeneration

    // Cap at max HP (healing) or 0 (damage)
    if (totalRegeneration > 0) {
      newHp = Math.min(character.maxHp, newHp)
    } else {
      newHp = Math.max(0, newHp)
    }

    // Check if character died from negative regeneration
    const characterDied = newHp === 0 && totalRegeneration < 0

    return {
      previousHp,
      newHp,
      totalRegeneration,
      regenSources: sources,
      characterDied
    }
  }

  /**
   * Apply regeneration and return updated character
   *
   * Convenience method that returns the updated character directly.
   */
  static applyRegenerationToCharacter(character: Character): Character {
    const result = this.applyRegeneration(character)

    if (result.newHp === character.hp) {
      return character // No change
    }

    return {
      ...character,
      hp: result.newHp,
      // Note: Status change to DEAD should be handled by caller
      // if characterDied is true, as it may require additional logic
    }
  }

  /**
   * Apply multiple ticks of regeneration (e.g., for resting)
   *
   * @param character - Character to apply regeneration to
   * @param ticks - Number of regeneration ticks to apply
   * @returns Updated character after all ticks
   */
  static applyMultipleRegeneration(character: Character, ticks: number): Character {
    let current = character

    for (let i = 0; i < ticks; i++) {
      const result = this.applyRegeneration(current)
      current = { ...current, hp: result.newHp }

      // Stop if character dies from negative regeneration
      if (result.characterDied) {
        break
      }

      // Stop if fully healed (positive regen)
      if (result.totalRegeneration > 0 && current.hp >= current.maxHp) {
        break
      }
    }

    return current
  }

  /**
   * Check if character has any regeneration effects
   */
  static hasRegeneration(character: Character): boolean {
    return this.getRegenerationRate(character) !== 0
  }

  /**
   * Check if character has negative (damaging) regeneration
   */
  static hasNegativeRegeneration(character: Character): boolean {
    return this.getRegenerationRate(character) < 0
  }

  /**
   * Get all equipped items from character
   */
  private static getEquippedItems(character: Character): Item[] {
    const items: Item[] = []

    if (character.equippedWeapon) items.push(character.equippedWeapon)
    if (character.equippedArmor) items.push(character.equippedArmor)
    if (character.equippedShield) items.push(character.equippedShield)
    if (character.equippedHelmet) items.push(character.equippedHelmet)
    if (character.equippedGauntlets) items.push(character.equippedGauntlets)

    // Also check inventory for equipped accessories (rings, amulets)
    // These items may not have dedicated slots but are considered "equipped"
    for (const item of character.inventory) {
      if (item.equipped && item.special?.regeneration !== undefined) {
        items.push(item)
      }
    }

    return items
  }

  /**
   * Format regeneration for display
   */
  static formatRegeneration(rate: number): string {
    if (rate === 0) return 'None'
    if (rate > 0) return `+${rate} HP/round`
    return `${rate} HP/round (cursed!)`
  }
}
