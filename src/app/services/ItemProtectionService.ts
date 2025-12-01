// src/services/ItemProtectionService.ts
import { Character } from '@models/Character'
import { Item } from '@models/Item'

/**
 * ItemProtectionService - Implements Wizardry 1 item protection mechanics
 *
 * Per Apple II reference (Section 11B: Item Protection System):
 *
 * Elemental Protection:
 * - Items with elemental resistance halve damage from breath attacks of that element
 * - Fire: Fire breath, Litokan, Mahalito, Lahalito
 * - Cold: Cold breath, Dalto, Madalto
 * - Poison: Poison effects from hits
 *
 * Class Protection (vs. Monster Types):
 * - 50% chance to nullify attacks from specific monster classes
 * - Does NOT affect spells or breath weapons
 * - Dragon Slayer: Dragons
 * - Were Slayer: Were creatures
 * - Mage Masher: Mages
 * - Ring Pro Undead: Undead
 *
 * Physical Protection:
 * - Immune to paralysis from hits
 * - Immune to critical hits (cannot be decapitated)
 *
 * Magic Protection:
 * - When a monster targets you with any spell, the spell is silently nullified
 * - CAVEAT: Group-affecting spells target a randomly chosen living character
 * - If a non-protected character is targeted, everyone is affected
 */

/**
 * Map breath types to protection types they're blocked by
 */
const BREATH_TO_PROTECTION: Record<string, string[]> = {
  fire: ['fire'],
  cold: ['cold'],
  stone: ['stone'],
  drain: ['drain'],
  poison: ['poison'],
  lightning: ['lightning'],
  acid: ['acid']
}

/**
 * Map monster classes to protection types that block them
 */
const MONSTER_CLASS_TO_PROTECTION: Record<string, string> = {
  dragon: 'dragon',
  werebeast: 'werebeast',
  mage: 'mage',
  undead: 'undead',
  demon: 'demon',
  giant: 'giant',
  mythical: 'mythical',
  insect: 'insect'
}

export class ItemProtectionService {
  /**
   * Get all protection types from a character's equipped items
   *
   * Per Item_System_Reference.md §7.4: cursedForOwner items have all special
   * powers disabled, including protections.
   */
  static getCharacterProtections(char: Character): Set<string> {
    const protections = new Set<string>()
    const equippedItems = this.getEquippedItems(char)

    for (const item of equippedItems) {
      // Skip cursedForOwner items - their special powers are disabled
      if (item.cursedForOwner) {
        continue
      }

      if (item.special?.protection) {
        protections.add(item.special.protection.toLowerCase())
      }
      if (item.special?.protections) {
        for (const p of item.special.protections) {
          protections.add(p.toLowerCase())
        }
      }
    }

    return protections
  }

  /**
   * Get all equipped items from a character
   */
  private static getEquippedItems(char: Character): Item[] {
    const items: Item[] = []

    if (char.equippedWeapon) items.push(char.equippedWeapon)
    if (char.equippedArmor) items.push(char.equippedArmor)
    if (char.equippedShield) items.push(char.equippedShield)
    if (char.equippedHelmet) items.push(char.equippedHelmet)
    if (char.equippedGauntlets) items.push(char.equippedGauntlets)

    // Also check inventory for equipped accessories (rings, amulets)
    for (const item of char.inventory) {
      if (item.equipped) {
        items.push(item)
      }
    }

    return items
  }

  /**
   * Check if character has elemental resistance to a breath type
   * Returns true if ANY equipped item provides protection against this element
   *
   * @param char - Character to check
   * @param breathType - Type of breath attack (fire, cold, etc.)
   * @returns true if character has protection
   */
  static hasElementalResistance(char: Character, breathType: string): boolean {
    const protections = this.getCharacterProtections(char)
    const breathLower = breathType.toLowerCase()

    // Check if character has 'all' protection (legendary items like Werdna's Amulet)
    if (protections.has('all')) {
      return true
    }

    // Check direct match
    if (protections.has(breathLower)) {
      return true
    }

    // Check via breath-to-protection mapping
    const validProtections = BREATH_TO_PROTECTION[breathLower]
    if (validProtections) {
      for (const p of validProtections) {
        if (protections.has(p)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if character has class protection against a monster type
   * Returns true if character has item that grants protection vs this monster class
   *
   * Used for 50% attack nullification chance
   *
   * @param char - Character to check
   * @param monsterClass - Monster's class (dragon, undead, etc.)
   * @returns true if character has protection
   */
  static hasClassProtection(char: Character, monsterClass: string): boolean {
    const protections = this.getCharacterProtections(char)
    const classLower = monsterClass.toLowerCase()

    // Check if character has 'all' protection
    if (protections.has('all')) {
      return true
    }

    // Check direct match
    if (protections.has(classLower)) {
      return true
    }

    // Check via monster-class-to-protection mapping
    const protectionType = MONSTER_CLASS_TO_PROTECTION[classLower]
    if (protectionType && protections.has(protectionType)) {
      return true
    }

    return false
  }

  /**
   * Check if character has physical protection
   * Physical protection grants:
   * - Immunity to paralysis from monster hits
   * - Immunity to critical hits (decapitation)
   *
   * @param char - Character to check
   * @returns true if character has physical protection
   */
  static hasPhysicalProtection(char: Character): boolean {
    const protections = this.getCharacterProtections(char)
    return protections.has('physical') || protections.has('all')
  }

  /**
   * Check if character has magic protection
   * Magic protection nullifies monster spells when YOU are targeted
   *
   * @param char - Character to check
   * @returns true if character has magic protection
   */
  static hasMagicProtection(char: Character): boolean {
    const protections = this.getCharacterProtections(char)
    return protections.has('magic') || protections.has('all')
  }

  /**
   * Check if character has poison protection
   * Poison protection prevents poison effects from monster hits
   *
   * @param char - Character to check
   * @returns true if character has poison protection
   */
  static hasPoisonProtection(char: Character): boolean {
    const protections = this.getCharacterProtections(char)
    return protections.has('poison') || protections.has('all')
  }

  /**
   * Check if character has drain protection
   * Drain protection halves drain breath damage
   *
   * @param char - Character to check
   * @returns true if character has drain protection
   */
  static hasDrainProtection(char: Character): boolean {
    const protections = this.getCharacterProtections(char)
    return protections.has('drain') || protections.has('all')
  }

  /**
   * Check if weapon is purposed against a specific monster class
   * Purposed weapons deal 2× damage to their target monster class
   *
   * Per Apple II reference (Section 11B):
   * - Dragon Slayer: 2× damage vs dragons
   * - Were Slayer: 2× damage vs werebeasts
   * - Mage Masher: 2× damage vs mages
   *
   * @param weapon - Weapon to check (can be null/undefined)
   * @param monsterClass - Monster's class (dragon, mage, etc.)
   * @returns true if weapon is purposed against this monster class
   */
  static isPurposedAgainst(weapon: Item | null | undefined, monsterClass: string): boolean {
    if (!weapon || !weapon.effectiveAgainst || weapon.effectiveAgainst.length === 0) {
      return false
    }

    const classLower = monsterClass.toLowerCase()

    // Check if monster class is in the effectiveAgainst array (case-insensitive)
    return weapon.effectiveAgainst.some(target => target.toLowerCase() === classLower)
  }
}
