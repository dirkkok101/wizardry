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

    // Resolve item IDs to Item objects from shop inventory
    return character.inventory
      .map(itemId => this.shopInventory().find(item => item.id === itemId))
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
}
