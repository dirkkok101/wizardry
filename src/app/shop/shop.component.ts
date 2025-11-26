import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/GameStateService';
import { ShopService } from '../../services/ShopService';
import { InventoryService } from '../../services/InventoryService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { MessageService } from '../../services/MessageService';
import { GameStateQueries } from '../../utils/GameStateQueries';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '../shared/components/party-character-grid/party-character-grid.component';
import { ConfirmationDialogComponent } from '../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '../shared/components/menu/menu.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { SHOP_INVENTORY } from '../../data/shop-inventory';

type ShopView = 'character-select' | 'main' | 'buy' | 'sell' | 'identify' | 'uncurse';

/**
 * Shop Component (Boltac's Trading Post)
 *
 * Item trading services following the standard scene architecture:
 * - SceneTitleComponent for header
 * - PartyCharacterGridComponent for character selection
 * - SceneFooterComponent for menu navigation
 * - ConfirmationDialogComponent for transaction confirmations
 *
 * Services:
 * - Buy items from shop inventory
 * - Sell items from character inventory
 * - Identify unknown items (reveal properties)
 * - Uncurse cursed items (remove curse)
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    PartyCharacterGridComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // View state
  readonly currentView = signal<ShopView>('character-select');
  readonly selectedCharacterId = signal<string | null>(null);

  // Confirmation dialog state
  readonly showConfirmation = signal(false);
  readonly confirmationMessage = signal('');
  private pendingAction = signal<{
    type: 'buy' | 'sell' | 'identify' | 'uncurse';
    itemId: string;
  } | null>(null);

  // Shop data
  readonly shopInventory = signal<Item[]>(SHOP_INVENTORY);

  // Selected character using GameStateQueries
  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId();
    if (!charId) return null;
    return GameStateQueries.getCharacter(this.gameState.state(), charId) || null;
  });

  // Party gold
  readonly partyGold = computed(() =>
    GameStateQueries.partyGold(this.gameState.state())
  );

  // Get party characters for selection
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  );

  // Footer menu items based on current view
  readonly footerMenuItems = computed((): MenuItem[] => {
    const view = this.currentView();
    const character = this.selectedCharacter();

    if (view === 'character-select') {
      return [
        {
          id: 'leave',
          label: 'Leave Shop',
          shortcut: 'ESC',
          enabled: true
        }
      ];
    }

    if (view === 'main') {
      const hasItems = character && character.inventory.length > 0;
      const hasUnidentified = this.getUnidentifiedItems().length > 0;
      const hasCursed = this.getCursedItems().length > 0;

      return [
        { id: 'buy', label: 'Buy Items', shortcut: 'B', enabled: true },
        { id: 'sell', label: 'Sell Items', shortcut: 'S', enabled: !!hasItems },
        { id: 'identify', label: 'Identify Items', shortcut: 'I', enabled: hasUnidentified },
        { id: 'uncurse', label: 'Uncurse Items', shortcut: 'U', enabled: hasCursed },
        { id: 'change-character', label: 'Change Character', shortcut: 'C', enabled: this.partyCharacters().length > 1 },
        { id: 'leave', label: 'Leave Shop', shortcut: 'ESC', enabled: true }
      ];
    }

    // Buy, sell, identify, uncurse views all have back option
    return [
      { id: 'back', label: 'Back to Menu', shortcut: 'ESC', enabled: true }
    ];
  });

  ngOnInit(): void {
    this.messages.clear();
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.SHOP
    }));

    // Auto-select if only one party member
    const partyMembers = this.partyCharacters();
    if (partyMembers.length === 1) {
      this.selectCharacter(partyMembers[0].id);
    }
  }

  // Character selection
  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'select') {
      this.selectCharacter(event.characterId);
    } else if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'shop');
    }
  }

  selectCharacter(charId: string): void {
    const char = this.gameState.state().roster.get(charId);
    if (!char) {
      this.messages.showError('Character not found');
      return;
    }

    this.selectedCharacterId.set(charId);
    this.currentView.set('main');
    this.messages.clear();
  }

  // Footer action handler
  handleFooterAction(itemId: string): void {
    this.messages.clear();

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
      case 'uncurse':
        this.currentView.set('uncurse');
        break;
      case 'change-character':
        this.currentView.set('character-select');
        this.selectedCharacterId.set(null);
        break;
      case 'leave':
        this.navigation.returnToCastle();
        break;
      case 'back':
        this.currentView.set('main');
        break;
    }
  }

  // Keyboard navigation
  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.showConfirmation()) {
      this.cancelAction();
      return;
    }

    const view = this.currentView();
    if (view === 'character-select') {
      this.navigation.returnToCastle();
    } else if (view === 'main') {
      this.navigation.returnToCastle();
    } else {
      this.currentView.set('main');
    }
  }

  // Buy functionality
  initiateBuy(itemId: string): void {
    const item = this.shopInventory().find(i => i.id === itemId);
    if (!item) {
      this.messages.showError('Item not found');
      return;
    }

    const character = this.selectedCharacter();
    if (!character) {
      this.messages.showError('No character selected');
      return;
    }

    if (!ShopService.canAfford(this.partyGold(), item)) {
      this.messages.showError(`Cannot afford ${item.name}. Need ${item.price} gold.`);
      return;
    }

    if (!InventoryService.hasSpace(character)) {
      this.messages.showError('Inventory full (max 8 items)');
      return;
    }

    if (!InventoryService.canEquip(character, item)) {
      // Just warn, still allow purchase
      this.confirmationMessage.set(`${character.class} cannot use ${item.name}. Buy anyway for ${item.price} gold?`);
    } else {
      this.confirmationMessage.set(`Buy ${item.name} for ${item.price} gold?`);
    }

    this.pendingAction.set({ type: 'buy', itemId });
    this.showConfirmation.set(true);
  }

  // Sell functionality
  initiateSell(itemId: string): void {
    if (!this.selectedCharacterId()) {
      this.messages.showError('No character selected');
      return;
    }

    const item = this.getCharacterInventory().find(i => i.id === itemId);
    if (!item) {
      this.messages.showError('Item not found');
      return;
    }

    if (item.equipped && item.cursed) {
      this.messages.showError('Cannot sell equipped cursed item. Uncurse first.');
      return;
    }

    const sellPrice = ShopService.calculateSellPrice(item);
    if (sellPrice === 0) {
      this.messages.showError('Cursed items cannot be sold');
      return;
    }

    this.confirmationMessage.set(`Sell ${item.name} for ${sellPrice} gold?`);
    this.pendingAction.set({ type: 'sell', itemId });
    this.showConfirmation.set(true);
  }

  // Identify functionality
  initiateIdentify(itemId: string): void {
    if (!this.selectedCharacterId()) {
      this.messages.showError('No character selected');
      return;
    }

    const item = this.getCharacterInventory().find(i => i.id === itemId);
    if (!item) {
      this.messages.showError('Item not found');
      return;
    }

    const identifyCost = ShopService.calculateIdentifyPrice(item);
    if (this.partyGold() < identifyCost) {
      this.messages.showError(`Cannot afford identification. Need ${identifyCost} gold.`);
      return;
    }

    this.confirmationMessage.set(`Identify this item for ${identifyCost} gold?`);
    this.pendingAction.set({ type: 'identify', itemId });
    this.showConfirmation.set(true);
  }

  // Uncurse functionality
  initiateUncurse(itemId: string): void {
    if (!this.selectedCharacterId()) {
      this.messages.showError('No character selected');
      return;
    }

    const item = this.getCharacterInventory().find(i => i.id === itemId);
    if (!item) {
      this.messages.showError('Item not found');
      return;
    }

    const uncurseCost = ShopService.calculateUncursePrice(item);
    if (this.partyGold() < uncurseCost) {
      this.messages.showError(`Cannot afford uncursing. Need ${uncurseCost} gold.`);
      return;
    }

    this.confirmationMessage.set(`Remove curse from ${item.name} for ${uncurseCost} gold?`);
    this.pendingAction.set({ type: 'uncurse', itemId });
    this.showConfirmation.set(true);
  }

  // Confirm pending action
  confirmAction(): void {
    const pending = this.pendingAction();
    if (!pending) return;

    const charId = this.selectedCharacterId();
    if (!charId) {
      this.messages.showError('No character selected');
      this.cancelAction();
      return;
    }

    switch (pending.type) {
      case 'buy':
        this.completeBuy(pending.itemId);
        break;
      case 'sell':
        this.completeSell(pending.itemId);
        break;
      case 'identify':
        this.completeIdentify(pending.itemId);
        break;
      case 'uncurse':
        this.completeUncurse(pending.itemId);
        break;
    }

    this.cancelAction();
  }

  // Cancel pending action
  cancelAction(): void {
    this.showConfirmation.set(false);
    this.confirmationMessage.set('');
    this.pendingAction.set(null);
  }

  // Complete buy transaction
  private completeBuy(itemId: string): void {
    const character = this.selectedCharacter();
    if (!character) return;

    const item = this.shopInventory().find(i => i.id === itemId);
    if (!item) return;

    const charId = this.selectedCharacterId()!;
    const partyGold = this.partyGold();

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

    this.messages.showSuccess(`Purchased ${item.name} for ${item.price} gold`);
  }

  // Complete sell transaction
  private completeSell(itemId: string): void {
    const character = this.selectedCharacter();
    if (!character) return;

    const item = this.getCharacterInventory().find(i => i.id === itemId);
    if (!item) return;

    const sellPrice = ShopService.calculateSellPrice(item);
    const charId = this.selectedCharacterId()!;
    const partyGold = this.partyGold();

    this.gameState.updateState(state => {
      const updatedChar = {
        ...character,
        inventory: character.inventory.filter(id => id !== itemId)
      };

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar),
        party: {
          ...state.party,
          gold: partyGold + sellPrice
        }
      };
    });

    this.messages.showSuccess(`Sold ${item.name} for ${sellPrice} gold`);
  }

  // Complete identify transaction
  private completeIdentify(itemId: string): void {
    const charId = this.selectedCharacterId()!;
    const result = ShopService.identifyItem(this.gameState.state(), charId, itemId);

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!);

      const item = this.getCharacterInventory().find(i => i.id === itemId);
      let message = `Identified: ${item?.name || 'item'}`;
      if (item?.damage) message += ` (Damage: ${item.damage})`;
      if (item?.defense) message += ` (Defense: ${item.defense})`;
      if (item?.cursed) message += ' - WARNING: CURSED!';

      this.messages.showSuccess(message);
    } else {
      this.messages.showError(result.error || 'Identification failed');
    }
  }

  // Complete uncurse transaction
  private completeUncurse(itemId: string): void {
    const charId = this.selectedCharacterId()!;
    const result = ShopService.uncurseItem(this.gameState.state(), charId, itemId);

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!);
      const item = this.getCharacterInventory().find(i => i.id === itemId);
      this.messages.showSuccess(`${item?.name || 'Item'} is no longer cursed!`);
    } else {
      this.messages.showError(result.error || 'Uncurse failed');
    }
  }

  // Helper: Get character inventory as Item objects
  getCharacterInventory(): Item[] {
    const character = this.selectedCharacter();
    if (!character) return [];

    return character.inventory
      .map(item => {
        if (typeof item === 'object') return item as Item;
        return this.shopInventory().find(shopItem => shopItem.id === item);
      })
      .filter((item): item is Item => item !== undefined);
  }

  // Helper: Get sellable items
  getSellableItems(): Item[] {
    return this.getCharacterInventory().filter(item => {
      if (item.equipped && item.cursed) return false;
      return true;
    });
  }

  // Helper: Get unidentified items
  getUnidentifiedItems(): Item[] {
    return this.getCharacterInventory().filter(item => !item.identified);
  }

  // Helper: Get cursed items
  getCursedItems(): Item[] {
    return this.getCharacterInventory().filter(item => item.cursed && item.identified);
  }

  // Helper: Get sell price
  getSellPrice(item: Item): number {
    return ShopService.calculateSellPrice(item);
  }

  // Helper: Get identify cost
  getIdentifyCost(item?: Item): number {
    return ShopService.calculateIdentifyPrice(item || { price: 100 } as Item);
  }

  // Helper: Get uncurse cost
  getUncurseCost(item: Item): number {
    return ShopService.calculateUncursePrice(item);
  }
}
