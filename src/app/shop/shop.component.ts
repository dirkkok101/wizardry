import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { ShopService } from '../../services/ShopService';
import { InventoryService } from '../../services/InventoryService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { SHOP_INVENTORY } from '../../data/shop-inventory';

type ShopView = 'main' | 'character-select' | 'buy' | 'sell' | 'identify';

/**
 * Shop Component (Boltac's Trading Post)
 *
 * Item trading services:
 * - Buy items from shop inventory
 * - Sell items from character inventory
 * - Identify unknown items (reveal properties)
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    { id: 'buy', label: 'BUY ITEMS', enabled: true, shortcut: 'B' },
    { id: 'sell', label: 'SELL ITEMS', enabled: true, shortcut: 'S' },
    { id: 'identify', label: 'IDENTIFY ITEMS', enabled: true, shortcut: 'I' },
    { id: 'castle', label: 'RETURN TO CASTLE', enabled: true, shortcut: 'C' }
  ];

  // View state
  readonly currentView = signal<ShopView>('character-select');
  readonly selectedCharacterId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showSellConfirmation = signal<boolean>(false);
  readonly pendingSellItemId = signal<string | null>(null);

  // Shop data
  readonly shopInventory = signal<Item[]>(SHOP_INVENTORY);

  // Selected character
  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId();
    if (!charId) return null;
    return this.gameState.state().roster.get(charId) || null;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.SHOP
    }));
  }

  selectCharacter(charId: string): void {
    const char = this.gameState.state().roster.get(charId);
    if (!char) {
      this.errorMessage.set('Character not found');
      return;
    }

    this.selectedCharacterId.set(charId);
    this.currentView.set('main');
    this.errorMessage.set(null);
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'buy':
        this.currentView.set('buy');
        break;

      case 'sell':
        this.currentView.set('sell');
        break;

      case 'identify':
        this.currentView.set('identify');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  buyItem(itemId: string): void {
    const character = this.selectedCharacter();
    if (!character) {
      this.errorMessage.set('No character selected');
      return;
    }

    const item = this.shopInventory().find(i => i.id === itemId);
    if (!item) {
      this.errorMessage.set('Item not found');
      return;
    }

    const partyGold = this.gameState.state().party.gold || 0;

    // Check if party can afford
    if (!ShopService.canAfford(partyGold, item)) {
      this.errorMessage.set(`Cannot afford ${item.name}. Need ${item.price} gold.`);
      return;
    }

    // Check inventory space
    if (!InventoryService.hasSpace(character)) {
      this.errorMessage.set('Inventory full (max 8 items)');
      return;
    }

    // Check class restrictions
    if (!InventoryService.canEquip(character, item)) {
      this.errorMessage.set(`${character.class} cannot use this item`);
      return;
    }

    // Process purchase
    const charId = this.selectedCharacterId()!;
    this.gameState.updateState(state => {
      const updatedChar = {
        ...character,
        inventory: [...character.inventory, item.id]
      };

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar),
        party: {
          ...state.party,
          gold: partyGold - item.price
        }
      };
    });

    this.successMessage.set(`Purchased ${item.name} for ${item.price} gold`);
  }

  cancelView(): void {
    this.currentView.set('main');
  }

  /**
   * Get current character's inventory as Item objects
   */
  getCharacterInventory(): Item[] {
    const character = this.selectedCharacter()
    if (!character) {
      return []
    }

    // Inventory can contain either item IDs (string) or Item objects (for unidentified items)
    return character.inventory
      .map(item => {
        // If it's already an Item object, return it
        if (typeof item === 'object') {
          return item as Item
        }
        // Otherwise resolve ID from shop inventory
        return this.shopInventory().find(shopItem => shopItem.id === item)
      })
      .filter((item): item is Item => item !== undefined)
  }

  /**
   * Get items that can be sold (not equipped cursed items)
   */
  getSellableItems(): Item[] {
    const inventory = this.getCharacterInventory()

    return inventory.filter(item => {
      // Cannot sell equipped cursed items
      if (item.equipped && item.cursed) {
        return false
      }
      return true
    })
  }

  /**
   * Calculate sell price for an item (uses ShopService)
   */
  getSellPrice(item: Item): number {
    return ShopService.calculateSellPrice(item)
  }

  /**
   * Sell an item from character inventory
   */
  sellItem(itemId: string): void {
    const character = this.selectedCharacter()
    if (!character) {
      this.errorMessage.set('No character selected')
      return
    }

    // Find item in inventory (need to resolve ID to Item object)
    const item = this.shopInventory().find(i => i.id === itemId)
    if (!item) {
      this.errorMessage.set('Item not found in inventory')
      return
    }

    // Check if character actually has this item
    if (!character.inventory.includes(itemId)) {
      this.errorMessage.set('Item not found in inventory')
      return
    }

    // Check if item can be sold (not equipped cursed)
    if (item.equipped && item.cursed) {
      this.errorMessage.set('Cannot sell equipped cursed item')
      return
    }

    // Calculate sell price
    const sellPrice = ShopService.calculateSellPrice(item)

    if (sellPrice === 0) {
      this.errorMessage.set('Cursed items cannot be sold')
      return
    }

    // Remove item from character inventory
    const charId = this.selectedCharacterId()!
    const party = this.gameState.party()

    this.gameState.updateState(state => {
      const updatedChar = {
        ...character,
        inventory: character.inventory.filter(id => id !== itemId)
      }

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar),
        party: {
          ...state.party,
          gold: (party.gold || 0) + sellPrice
        }
      }
    })

    this.successMessage.set(`Sold ${item.name} for ${sellPrice} gold`)
    this.errorMessage.set(null)
  }

  /**
   * Initiate sell with confirmation prompt
   */
  initiateSell(itemId: string): void {
    this.pendingSellItemId.set(itemId)
    this.showSellConfirmation.set(true)
  }

  /**
   * Confirm and complete the sell
   */
  confirmSell(): void {
    const itemId = this.pendingSellItemId()
    if (itemId) {
      this.sellItem(itemId)
    }

    this.showSellConfirmation.set(false)
    this.pendingSellItemId.set(null)
  }

  /**
   * Cancel the sell
   */
  cancelSell(): void {
    this.showSellConfirmation.set(false)
    this.pendingSellItemId.set(null)
  }

  /**
   * Get the pending sell item (for template use)
   */
  getPendingSellItem(): Item | null {
    const itemId = this.pendingSellItemId()
    if (!itemId) return null

    return this.getCharacterInventory().find(i => i.id === itemId) || null
  }

  /**
   * Get unidentified items from character inventory
   */
  getUnidentifiedItems(): Item[] {
    const inventory = this.getCharacterInventory()

    return inventory.filter(item => !item.identified)
  }

  /**
   * Get identification cost (uses ShopService)
   */
  getIdentifyCost(): number {
    // Flat 100 gold fee for any item
    return 100
  }

  /**
   * Identify an item from character inventory
   */
  identifyItem(itemId: string): void {
    const character = this.selectedCharacter()
    if (!character) {
      this.errorMessage.set('No character selected')
      return
    }

    // Find item in inventory
    const item = this.getCharacterInventory().find(i => i.id === itemId)
    if (!item) {
      this.errorMessage.set('Item not found in inventory')
      return
    }

    // Check if already identified
    if (item.identified) {
      this.errorMessage.set('Item is already identified')
      return
    }

    // Check if party can afford (100 gold flat fee)
    const identifyCost = this.getIdentifyCost()
    const party = this.gameState.party()
    const partyGold = party.gold || 0

    if (partyGold < identifyCost) {
      this.errorMessage.set(`Cannot afford identification. Need ${identifyCost} gold.`)
      return
    }

    // Mark item as identified
    const charId = this.selectedCharacterId()!

    this.gameState.updateState(state => {
      const updatedInventory = character.inventory.map(invItem => {
        // Handle both Item objects and string IDs
        if (typeof invItem === 'object') {
          return invItem.id === itemId ? { ...invItem, identified: true } : invItem
        }
        return invItem
      })

      const updatedChar = {
        ...character,
        inventory: updatedInventory
      }

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar),
        party: {
          ...state.party,
          gold: partyGold - identifyCost
        }
      }
    })

    // Build success message with item details
    let message = `Identified: ${item.name}`

    // Add properties
    if (item.damage) {
      message += ` (Damage: ${item.damage})`
    }
    if (item.defense) {
      message += ` (Defense: ${item.defense})`
    }

    // Warn if cursed
    if (item.cursed) {
      message += ' - WARNING: CURSED! Cannot be removed once equipped!'
    }

    this.successMessage.set(message)
    this.errorMessage.set(null)
  }

  /**
   * Get formatted item properties for display
   */
  getItemProperties(itemId: string): string {
    const character = this.selectedCharacter()
    if (!character) {
      return ''
    }

    const item = this.getCharacterInventory().find(i => i.id === itemId)
    if (!item) {
      return ''
    }

    const properties: string[] = []

    if (item.damage) {
      properties.push(`Damage: ${item.damage}`)
    }

    if (item.defense) {
      properties.push(`Defense: ${item.defense}`)
    }

    if (item.cursed) {
      properties.push('CURSED')
    }

    if (item.description) {
      properties.push(item.description)
    }

    return properties.join(' | ')
  }
}
