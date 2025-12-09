import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { RandomService } from './RandomService'
import { ItemDataLoader } from './ItemDataLoader'
import { SpellDataLoader } from './SpellDataLoader'

/**
 * Result of using an item
 */
export interface ItemUseResult {
  success: boolean
  message: string
  updatedCharacter: Character
  spellCast?: {
    spellId: string
    targetType: 'self' | 'ally' | 'enemy' | 'party' | 'all_enemies'
  }
  healing?: {
    amount: number
    target: 'self' | 'party'
  }
  statBonus?: {
    stat: string
    bonus: number
  }
  classChange?: {
    newClass: string
  }
  itemDepleted: boolean
  itemTransformedTo?: string | null  // null = destroyed, string = new item ID
}

/**
 * ItemUseService - Handles using items from inventory
 *
 * Based on Wizardry 1 reference document Section 9:
 * - Items can be invoked to cast spells
 * - Some items are single-use (potions, scrolls)
 * - Equipment items may have depletion chance
 * - Depleted items can transform to other items or be destroyed
 */
export class ItemUseService {
  /**
   * Check if an item can be used
   *
   * Per Item_System_Reference.md §7.4: cursedForOwner items have all special
   * powers disabled (cannot invoke, cast spells, etc.)
   */
  static canUseItem(character: Character, item: Item): { canUse: boolean; reason?: string } {
    // Must be identified to use
    if (!item.identified) {
      return { canUse: false, reason: 'Item must be identified first' }
    }

    // cursedForOwner items have special powers disabled
    if (item.cursedForOwner) {
      return { canUse: false, reason: 'This item is cursed and its powers are sealed' }
    }

    // Check if item has any usable effect
    const hasEffect = item.effect || item.special?.invoke
    if (!hasEffect) {
      return { canUse: false, reason: 'This item has no usable effect' }
    }

    // Check class restrictions
    if (item.classRestrictions?.length) {
      if (!item.classRestrictions.includes(character.class)) {
        return { canUse: false, reason: `${character.class} cannot use this item` }
      }
    }

    // Check alignment restrictions
    if (item.alignmentRestrictions?.length) {
      if (!item.alignmentRestrictions.includes(character.alignment)) {
        return { canUse: false, reason: 'Your alignment prevents using this item' }
      }
    }

    return { canUse: true }
  }

  /**
   * Use an item from inventory
   *
   * Returns the updated character and result of using the item
   * Item effects are processed but spell/combat effects need to be
   * handled by the caller (SpellCastingService, CombatService, etc.)
   */
  static useItem(character: Character, itemId: string): ItemUseResult {
    // Find item in inventory
    const itemIndex = character.inventory.findIndex(i => i.id === itemId)
    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Item not in inventory',
        updatedCharacter: character,
        itemDepleted: false
      }
    }

    const item = character.inventory[itemIndex]

    // Check if can use
    const canUseCheck = this.canUseItem(character, item)
    if (!canUseCheck.canUse) {
      return {
        success: false,
        message: canUseCheck.reason || 'Cannot use this item',
        updatedCharacter: character,
        itemDepleted: false
      }
    }

    // Process the item effect
    let result: ItemUseResult = {
      success: true,
      message: '',
      updatedCharacter: character,
      itemDepleted: false
    }

    // Handle effect-based items (potions, scrolls)
    if (item.effect) {
      result = this.processEffect(character, item, result)
    }

    // Handle invoke-based items (equipment with special abilities)
    if (item.special?.invoke) {
      result = this.processInvoke(character, item, result)
    }

    // Handle depletion
    result = this.processDepletion(result.updatedCharacter, item, itemIndex, result)

    return result
  }

  /**
   * Process item effect (potions, scrolls)
   */
  private static processEffect(
    character: Character,
    item: Item,
    result: ItemUseResult
  ): ItemUseResult {
    const effect = item.effect!
    let updatedCharacter = { ...character }

    switch (effect.type) {
      case 'heal': {
        // Parse dice notation from JSON (e.g., "1d8", "2d8")
        const healDice = effect['healing'] || '0d0'
        const healAmount = RandomService.rollDiceNotation(healDice)
        const newHp = Math.min(updatedCharacter.maxHp, updatedCharacter.hp + healAmount)
        const actualHeal = newHp - updatedCharacter.hp
        updatedCharacter = { ...updatedCharacter, hp: newHp }
        result.message = `${item.name} heals ${actualHeal} HP`
        result.healing = { amount: actualHeal, target: 'self' }
        break
      }

      case 'cast_spell': {
        const spellId = effect.spellId
        if (spellId) {
          result.message = `${item.name} casts ${spellId.toUpperCase()}`
          result.spellCast = {
            spellId,
            targetType: this.getSpellTargetType(spellId)
          }
        }
        break
      }

      case 'cure': {
        // Cure effects handled by caller
        result.message = `${item.name} cures status ailment`
        break
      }

      default:
        result.message = `Used ${item.name}`
    }

    result.updatedCharacter = updatedCharacter
    return result
  }

  /**
   * Process item invoke (equipment special abilities)
   */
  private static processInvoke(
    character: Character,
    item: Item,
    result: ItemUseResult
  ): ItemUseResult {
    const invoke = item.special!.invoke!
    let updatedCharacter = { ...character }

    switch (invoke) {
      case 'cast_spell': {
        const spellId = item.special!.spellId
        if (spellId) {
          result.message = `${item.name} invokes ${spellId.toUpperCase()}`
          result.spellCast = {
            spellId,
            targetType: this.getSpellTargetType(spellId)
          }
        }
        break
      }

      case 'str_bonus': {
        const bonus = item.special!.invokeEffect?.bonus || 1
        // Note: Permanent stat changes should be handled carefully
        // For now, just report the effect
        result.message = `${item.name} grants +${bonus} Strength`
        result.statBonus = { stat: 'strength', bonus }
        break
      }

      case 'hp_bonus': {
        const bonus = item.special!.invokeEffect?.bonus || 1
        updatedCharacter = {
          ...updatedCharacter,
          maxHp: updatedCharacter.maxHp + bonus,
          hp: updatedCharacter.hp + bonus
        }
        result.message = `${item.name} grants +${bonus} max HP`
        result.statBonus = { stat: 'hp', bonus }
        break
      }

      case 'party_heal': {
        // Party healing effect handled by caller
        result.message = `${item.name} heals the party`
        result.healing = { amount: 0, target: 'party' }
        break
      }

      case 'class_change':
      case 'change_class': {
        const targetClass = item.special!.targetClass
        if (targetClass) {
          result.message = `${item.name} changes class to ${targetClass}`
          result.classChange = { newClass: targetClass }
        }
        break
      }

      default:
        result.message = `Used ${item.name}`
    }

    result.updatedCharacter = updatedCharacter
    return result
  }

  /**
   * Process item depletion after use
   *
   * Per reference document:
   * - Single-use items always deplete (100% chance)
   * - Equipment items have variable depletion chance
   * - Depleted items either transform or are destroyed
   */
  private static processDepletion(
    character: Character,
    item: Item,
    itemIndex: number,
    result: ItemUseResult
  ): ItemUseResult {
    // Check if item depletes
    const depletionChance = item.depletionChance ?? (item.singleUse ? 100 : 0)

    if (depletionChance <= 0) {
      // No depletion - item remains unchanged
      return result
    }

    // Roll for depletion
    if (!RandomService.chance(depletionChance)) {
      // Item survives
      return result
    }

    // Item is depleted
    result.itemDepleted = true
    let newInventory = [...character.inventory]

    if (item.transformsTo === null) {
      // Item is destroyed (removed from inventory)
      newInventory.splice(itemIndex, 1)
      result.message += ` (${item.name} is destroyed!)`
      result.itemTransformedTo = null
    } else if (item.transformsTo) {
      // Item transforms to another item
      const newItem = ItemDataLoader.getItem(item.transformsTo)
      if (newItem) {
        newInventory[itemIndex] = {
          ...newItem,
          identified: item.identified,
          equipped: false
        }
        result.message += ` (${item.name} transforms into ${newItem.name})`
        result.itemTransformedTo = item.transformsTo
      } else {
        // Transform target not found - destroy item
        newInventory.splice(itemIndex, 1)
        result.message += ` (${item.name} crumbles to dust!)`
        result.itemTransformedTo = null
      }
    } else {
      // No transform specified but item depleted - remove it
      newInventory.splice(itemIndex, 1)
      result.message += ` (${item.name} is used up)`
      result.itemTransformedTo = null
    }

    result.updatedCharacter = {
      ...result.updatedCharacter,
      inventory: newInventory
    }

    return result
  }

  /**
   * Get spell target type for spell ID
   * Reads from spell JSON data instead of hardcoded lists
   *
   * Maps spell.target to ItemUseResult.targetType format
   */
  private static getSpellTargetType(spellId: string): 'self' | 'ally' | 'enemy' | 'party' | 'all_enemies' {
    const spell = SpellDataLoader.getSpell(spellId)
    if (!spell) {
      // Spell not found - default to self
      return 'self'
    }

    // Map spell target to ItemUseResult targetType
    switch (spell.target) {
      // Enemy targeting
      case 'single':
        return 'enemy'
      case 'group':
      case 'all_enemies':
      case 'random':
        return 'all_enemies'

      // Ally/party targeting
      case 'all_allies':
      case 'party':
        return 'party'
      case 'dead_ally':
      case 'dead_body':
      case 'ashes':
      case 'dead_or_ashed_ally':
        return 'ally'

      // Self targeting
      case 'self':
      case 'caster':
      case 'variable':
      case 'varies':
      default:
        return 'self'
    }
  }

  /**
   * Check if an item is single-use (consumed on use)
   */
  static isSingleUse(item: Item): boolean {
    return item.singleUse === true || item.depletionChance === 100
  }

  /**
   * Get the invoke effect description for an item
   */
  static getInvokeDescription(item: Item): string | null {
    if (!item.special?.invoke) {
      return null
    }

    switch (item.special.invoke) {
      case 'cast_spell':
        return item.special.spellId ? `Casts ${item.special.spellId.toUpperCase()}` : 'Casts a spell'
      case 'str_bonus':
        return `+${item.special.invokeEffect?.bonus || 1} Strength`
      case 'hp_bonus':
        return `+${item.special.invokeEffect?.bonus || 1} Max HP`
      case 'party_heal':
        return 'Heals party'
      case 'class_change':
      case 'change_class':
        return `Change class to ${item.special.targetClass}`
      default:
        return 'Special effect'
    }
  }
}
