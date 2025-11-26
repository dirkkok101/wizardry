import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { ShopService } from '@services/ShopService';
import { InventoryService } from '@services/InventoryService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { ItemDataLoader } from '@services/ItemDataLoader';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '@shared/components/party-character-grid/party-character-grid.component';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterActionEvent } from '@models/CharacterCardTypes';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { SHOP_ITEM_IDS } from '@config/shop-inventory';

type ShopView = 'character-select' | 'buy';

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
    type: 'buy';
    itemId: string;
  } | null>(null);

  // Shop data - loaded from ItemDataLoader using SHOP_ITEM_IDS
  // Filtered to only show items the selected character can equip
  readonly shopInventory = computed(() => {
    const character = this.selectedCharacter();
    const allItems = SHOP_ITEM_IDS
      .map(id => ItemDataLoader.getItem(id))
      .filter((item): item is Item => item !== null)
      .map(item => ({ ...item, identified: true }));  // Shop items are always identified

    // Filter by class restrictions if a character is selected
    if (character) {
      return allItems.filter(item => InventoryService.canEquip(character, item));
    }
    return allItems;
  });

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

    if (view === 'character-select') {
      return [
        { id: 'leave', label: 'Leave Shop', shortcut: 'ESC', enabled: true }
      ];
    }

    // Buy view
    return [
      { id: 'back', label: 'Back to Characters', shortcut: 'ESC', enabled: true }
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

  // Character selection - 'buy' action goes to buy view, 'inspect' goes to character inspection
  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'buy') {
      this.selectCharacterForBuying(event.characterId);
    } else if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'shop');
    }
  }

  selectCharacterForBuying(charId: string): void {
    const char = this.gameState.state().roster.get(charId);
    if (!char) {
      this.messages.showError('Character not found');
      return;
    }

    this.selectedCharacterId.set(charId);
    this.currentView.set('buy');
    this.messages.clear();
  }

  // Legacy method for tests - delegates to selectCharacterForBuying
  selectCharacter(charId: string): void {
    this.selectCharacterForBuying(charId);
  }

  // Footer action handler
  handleFooterAction(itemId: string): void {
    this.messages.clear();

    switch (itemId) {
      case 'leave':
        this.navigation.returnToCastle();
        break;
      case 'back':
        this.currentView.set('character-select');
        this.selectedCharacterId.set(null);
        break;
    }
  }

  // Keyboard navigation
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Don't handle keys when confirmation dialog is showing
    if (this.showConfirmation()) {
      return;
    }

    const key = event.key.toLowerCase();

    // ESC key handling
    if (key === 'escape') {
      const view = this.currentView();
      if (view === 'character-select') {
        this.navigation.returnToCastle();
      } else {
        // From buy view, go back to character selection
        this.currentView.set('character-select');
        this.selectedCharacterId.set(null);
      }
      return;
    }
  }

  // Buy functionality - no confirmation needed, items are already filtered by class
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

    // Directly complete the purchase
    this.completeBuy(itemId);
  }

  // Confirm pending action (buy only - sell/identify/uncurse moved to CharacterInspection)
  confirmAction(): void {
    const pending = this.pendingAction();
    if (!pending) return;

    const charId = this.selectedCharacterId();
    if (!charId) {
      this.messages.showError('No character selected');
      this.cancelAction();
      return;
    }

    if (pending.type === 'buy') {
      this.completeBuy(pending.itemId);
    }

    this.cancelAction();
  }

  // Cancel pending action
  cancelAction(): void {
    this.showConfirmation.set(false);
    this.confirmationMessage.set('');
    this.pendingAction.set(null);
  }

  // Generate unique instance ID for purchased items
  private generateInstanceId(baseId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${baseId}_${timestamp}_${random}`;
  }

  // Complete buy transaction
  private completeBuy(itemId: string): void {
    const character = this.selectedCharacter();
    if (!character) return;

    const item = this.shopInventory().find(i => i.id === itemId);
    if (!item) return;

    const charId = this.selectedCharacterId()!;
    const partyGold = this.partyGold();

    // Create a copy of the item with unique instance ID for the character's inventory
    const itemCopy: Item = {
      ...item,
      id: this.generateInstanceId(item.id),
      equipped: false
    };

    this.gameState.updateState(state => {
      const updatedChar = {
        ...character,
        inventory: [...character.inventory, itemCopy]
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
}
