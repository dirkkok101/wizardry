import { Item } from '@models/Item';
import { GameState } from '@models/GameState';
import * as PartyService from './PartyService';
import { TownConfigLoader } from './TownConfigLoader';

interface ShopResult {
  success: boolean;
  error?: string;
  state?: GameState;
}

interface BuyResult extends ShopResult {}
interface SellResult extends ShopResult {}
interface IdentifyResult extends ShopResult {}
interface UncurseResult extends ShopResult {}

export class ShopService {
  static calculateSellPrice(item: Item): number {
    if (item.cursed) {
      return 0;
    }
    const multiplier = TownConfigLoader.getShopSellMultiplier();
    return Math.floor(item.price * multiplier);
  }

  static canAfford(partyGold: number, item: Item): boolean {
    return partyGold >= item.price;
  }

  static calculateIdentifyPrice(_item: Item): number {
    return TownConfigLoader.getShopIdentifyPrice();
  }

  /**
   * Buy an item from the shop.
   * Deducts gold from party and adds item to character inventory.
   *
   * @param state - Current game state
   * @param characterId - Character purchasing the item
   * @param item - Item to purchase (full Item object)
   * @returns BuyResult with updated state or error
   */
  static buyItem(state: GameState, characterId: string, item: Item): BuyResult {
    const character = state.roster.get(characterId);
    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    // Check party gold
    if (!PartyService.hasEnoughGold(state, item.price)) {
      return { success: false, error: 'Insufficient party gold' };
    }

    // Check inventory space (max 8 items)
    if (character.inventory.length >= 8) {
      return { success: false, error: 'Inventory full (max 8 items)' };
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, item.price);

    // Create a copy of the item for this character's inventory
    const itemCopy: Item = { ...item, equipped: false };

    // Add item to character inventory
    const updatedCharacter = {
      ...character,
      inventory: [...character.inventory, itemCopy],
    };

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter),
    };

    return { success: true, state: newState };
  }

  /**
   * Sell an item to the shop.
   * Adds gold to party (50% of purchase price) and removes item from character inventory.
   *
   * @param state - Current game state
   * @param characterId - Character selling the item
   * @param item - Item to sell
   * @returns SellResult with updated state or error
   */
  static sellItem(state: GameState, characterId: string, item: Item): SellResult {
    const character = state.roster.get(characterId);
    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    // Check if item is in inventory
    const inventoryItem = character.inventory.find((i) => i.id === item.id);
    if (!inventoryItem) {
      return { success: false, error: 'Item not in inventory' };
    }

    // Cannot sell cursed equipped items
    if (inventoryItem.cursed && inventoryItem.equipped) {
      return { success: false, error: 'Cannot sell cursed equipped item' };
    }

    // Calculate sell price (50% of purchase price)
    const sellPrice = ShopService.calculateSellPrice(inventoryItem);

    // Add gold to party
    let newState = PartyService.addPartyGold(state, sellPrice);

    // Remove item from character inventory
    const updatedCharacter = {
      ...character,
      inventory: character.inventory.filter((i) => i.id !== item.id),
    };

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter),
    };

    return { success: true, state: newState };
  }

  static calculateUncursePrice(item: Item): number {
    const settings = TownConfigLoader.getShopUncurseSettings();
    const itemPrice = item.price;
    if (itemPrice === 0 || itemPrice >= settings.specialItemPriceThreshold) {
      return settings.specialItemUncurseCost;
    }
    return Math.floor(itemPrice * settings.normalItemMultiplier);
  }

  /**
   * Identify an item in character inventory.
   * Reveals item properties and sets identified flag to true.
   *
   * @param state - Current game state
   * @param characterId - Character owning the item
   * @param itemId - ID of item to identify
   * @returns IdentifyResult with updated state or error
   */
  static identifyItem(state: GameState, characterId: string, itemId: string): IdentifyResult {
    const character = state.roster.get(characterId);
    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    // Find item in inventory
    const itemIndex = character.inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return { success: false, error: 'Item not in inventory' };
    }

    const itemObj = character.inventory[itemIndex];

    if (itemObj.identified) {
      return { success: false, error: 'Item is already identified' };
    }

    const identifyCost = ShopService.calculateIdentifyPrice(itemObj);

    // Check party gold
    if (!PartyService.hasEnoughGold(state, identifyCost)) {
      return { success: false, error: 'Insufficient party gold' };
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, identifyCost);

    // Update item to be identified
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = { ...itemObj, identified: true };

    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
    };

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter),
    };

    return { success: true, state: newState };
  }

  /**
   * Remove curse from an item in character inventory.
   * Allows the item to be unequipped and sold.
   *
   * @param state - Current game state
   * @param characterId - Character owning the item
   * @param itemId - ID of item to uncurse
   * @returns UncurseResult with updated state or error
   */
  static uncurseItem(state: GameState, characterId: string, itemId: string): UncurseResult {
    const character = state.roster.get(characterId);
    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    // Find item in inventory
    const itemIndex = character.inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return { success: false, error: 'Item not in inventory' };
    }

    const itemObj = character.inventory[itemIndex];

    if (!itemObj.cursed) {
      return { success: false, error: 'Item is not cursed' };
    }

    const uncurseCost = ShopService.calculateUncursePrice(itemObj);

    // Check party gold
    if (!PartyService.hasEnoughGold(state, uncurseCost)) {
      return { success: false, error: 'Insufficient party gold' };
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, uncurseCost);

    // Update item to remove curse
    const updatedInventory = [...character.inventory];
    updatedInventory[itemIndex] = { ...itemObj, cursed: false };

    const updatedCharacter = {
      ...character,
      inventory: updatedInventory,
    };

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter),
    };

    return { success: true, state: newState };
  }
}
