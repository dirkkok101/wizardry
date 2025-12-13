import { GameState } from '@models/GameState'
import { TileCondition } from '@models/Dungeon'
import { InventoryService } from './InventoryService'

/**
 * TileConditionService - Checks if party meets tile entry conditions
 *
 * Supports various condition types:
 * - has_item: Party must have a specific item in any member's inventory
 * - has_spell: Party must know a specific spell (future)
 * - flag_set: A dungeon flag must be set (future)
 *
 * Used by DungeonMovementService when entering tiles with conditions.
 */
export class TileConditionService {
  /**
   * Check if the party meets a tile condition
   *
   * @param condition - The condition to check
   * @param state - Current game state (includes roster and party)
   * @returns true if condition is met, false otherwise
   */
  static checkCondition(condition: TileCondition, state: GameState): boolean {
    console.log(`[TileCondition] Checking condition: type=${condition.type}, itemId=${condition.itemId ?? 'N/A'}, spellId=${condition.spellId ?? 'N/A'}, flagName=${condition.flagName ?? 'N/A'}`)

    let result: boolean
    switch (condition.type) {
      case 'has_item':
        result = this.checkHasItem(condition.itemId, state)
        break

      case 'has_spell':
        // Future implementation
        result = this.checkHasSpell(condition.spellId, state)
        break

      case 'flag_set':
        // Future implementation
        result = this.checkFlagSet(condition.flagName, state)
        break

      default:
        // Unknown condition type - allow entry
        result = true
    }

    console.log(`[TileCondition] Result: ${result ? 'PASS' : 'FAIL'}`)
    return result
  }

  /**
   * Check if any party member has a specific item
   */
  private static checkHasItem(itemId: string | undefined, state: GameState): boolean {
    if (!itemId) {
      console.warn('[TileCondition] has_item condition missing itemId')
      return true // Invalid condition - allow entry
    }

    console.log(`[TileCondition] Checking has_item: "${itemId}"`)
    const result = InventoryService.partyHasItem(
      state.roster,
      state.party.members,
      itemId
    )
    console.log(`[TileCondition] has_item result: ${result}`)
    return result
  }

  /**
   * Check if any party member knows a specific spell
   * Future implementation - currently always returns true
   */
  private static checkHasSpell(spellId: string | undefined, _state: GameState): boolean {
    if (!spellId) {
      console.warn('[TileConditionService] has_spell condition missing spellId')
      return true
    }

    // TODO: Implement spell checking
    // return state.party.members.some(id => {
    //   const char = state.roster.get(id)
    //   return char?.knownSpells.includes(spellId)
    // })
    return true
  }

  /**
   * Check if a dungeon flag is set
   * Future implementation - currently always returns true
   */
  private static checkFlagSet(flagName: string | undefined, _state: GameState): boolean {
    if (!flagName) {
      console.warn('[TileConditionService] flag_set condition missing flagName')
      return true
    }

    // TODO: Implement flag checking via DungeonState
    // return state.dungeon?.flags?.has(flagName) ?? false
    return true
  }

  /**
   * Consume the required item for a condition that has been met.
   * For has_item conditions, removes the item from the first party member who has it.
   *
   * @param condition - The condition that was checked
   * @param state - Current game state
   * @returns Updated game state with item removed from inventory
   */
  static consumeConditionItem(condition: TileCondition, state: GameState): GameState {
    if (condition.type !== 'has_item' || !condition.itemId) {
      return state
    }

    console.log(`[TileCondition] Consuming item: "${condition.itemId}"`)
    return this.removeItemFromParty(state, condition.itemId)
  }

  /**
   * Remove an item from the first party member who has it.
   * Used when consuming items for conditional tile checks.
   */
  private static removeItemFromParty(state: GameState, itemId: string): GameState {
    // Find first party member with the item and remove it
    for (const memberId of state.party.members) {
      const character = state.roster.get(memberId)
      if (character && InventoryService.hasItem(character, itemId)) {
        console.log(`[TileCondition] Removing "${itemId}" from ${character.name}`)
        const updatedChar = InventoryService.dropItem(character, itemId)
        return {
          ...state,
          roster: new Map(state.roster).set(memberId, updatedChar)
        }
      }
    }

    // Item not found (shouldn't happen since condition passed)
    console.warn(`[TileCondition] Could not find item "${itemId}" to consume`)
    return state
  }
}
