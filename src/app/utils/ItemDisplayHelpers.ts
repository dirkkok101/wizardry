import { Item } from '@models/Item'

/**
 * ItemDisplayHelpers - Utility functions for displaying item information
 *
 * These helpers ensure consistent item display across the UI,
 * properly handling identified vs unidentified items.
 */

/**
 * Get display name for an item
 *
 * For unidentified items, returns the unknownName (e.g., "SWORD", "RING")
 * which hints at item type without revealing true identity.
 *
 * @param item - The item to get display name for
 * @returns Display name appropriate for item's identification status
 */
export function getItemDisplayName(item: Item): string {
  if (item.identified) {
    return item.name
  }

  // Use unknownName if available (from JSON data)
  if (item.unidentifiedName) {
    return item.unidentifiedName
  }

  // Fallback generic names based on item type
  return '???Unknown Item???'
}

/**
 * Get item type description for display
 *
 * Shows item type and identification status.
 *
 * @param item - The item to describe
 * @returns Type description string
 */
export function getItemTypeDescription(item: Item): string {
  const status = item.identified ? 'Identified' : 'Unknown'
  return `${item.type} • ${status}`
}

/**
 * Get item stats for display
 *
 * Only shows stats for identified items.
 *
 * @param item - The item to get stats for
 * @returns Stats string or empty if unidentified
 */
export function getItemStatsDisplay(item: Item): string {
  if (!item.identified) {
    return '(Unidentified)'
  }

  const parts: string[] = []

  if (item.damage) {
    parts.push(`DMG: ${item.damage}`)
  }

  if (item.defense) {
    parts.push(`AC: -${item.defense}`)
  }

  if (item.swings && item.swings > 1) {
    parts.push(`${item.swings}x attacks`)
  }

  if (item.cursed) {
    parts.push('CURSED')
  }

  return parts.join(' | ') || '(No special stats)'
}

/**
 * Check if item can be used/equipped
 *
 * Unidentified items cannot be equipped (need identification first).
 *
 * @param item - The item to check
 * @returns true if item can be equipped
 */
export function canUseItem(item: Item): boolean {
  return item.identified
}

/**
 * Get invoke/special ability description for display
 *
 * @param item - The item to describe
 * @returns Description of special ability or null
 */
export function getSpecialAbilityDescription(item: Item): string | null {
  if (!item.identified || !item.special) {
    return null
  }

  const special = item.special

  if (special.invoke === 'cast_spell' && special.spellId) {
    return `Casts ${special.spellId.toUpperCase()}`
  }

  if (special.regeneration) {
    const regen = special.regeneration
    return regen > 0 ? `Regenerates ${regen} HP/round` : `Drains ${Math.abs(regen)} HP/round`
  }

  if (special.protections?.length) {
    return `Protection vs ${special.protections.join(', ')}`
  }

  return null
}
