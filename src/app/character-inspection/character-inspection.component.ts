import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameStateService } from '../../services/GameStateService';
import { ItemDataService } from '../../services/ItemDataService';
import { EquipmentService } from '../../services/EquipmentService';
import { InventoryService } from '../../services/InventoryService';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { Item } from '../../types/Item';
import { ItemSlot } from '../../types/ItemType';
import { ItemCardComponent, ItemAction } from '../components/item-card/item-card.component';
import { TradeItemDialogComponent } from '../components/trade-item-dialog/trade-item-dialog.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';

/**
 * Character Inspection Component - Modernized with inline item actions
 *
 * Features:
 * - Equipment slots with inline Equip/Unequip actions
 * - Inventory with Trade/Drop actions
 * - Confirmation dialogs for destructive actions
 * - Party member selection for trades
 */
@Component({
  selector: 'app-character-inspection',
  standalone: true,
  imports: [
    CommonModule,
    ItemCardComponent,
    TradeItemDialogComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './character-inspection.component.html',
  styleUrls: ['./character-inspection.component.scss']
})
export class CharacterInspectionComponent {
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Record<string, string>
  });

  readonly characterId = computed(() =>
    this.queryParams()['characterId'] || null
  );

  readonly returnTo = computed(() =>
    this.queryParams()['returnTo'] || 'castle-menu'
  );

  readonly character = computed(() => {
    const id = this.characterId();
    if (!id) return null;
    return this.gameState.state().roster.get(id) || null;
  });

  // Get party members for trading
  readonly partyMembers = computed(() => {
    const party = this.gameState.party();
    const currentId = this.characterId();
    return party.filter(c => c.id !== currentId);
  });

  // Equipment slots
  readonly weaponSlot = computed(() => this.getEquipmentSlot(ItemSlot.WEAPON));
  readonly armorSlot = computed(() => this.getEquipmentSlot(ItemSlot.ARMOR));
  readonly shieldSlot = computed(() => this.getEquipmentSlot(ItemSlot.SHIELD));
  readonly helmetSlot = computed(() => this.getEquipmentSlot(ItemSlot.HEAD));
  readonly gauntletsSlot = computed(() => this.getEquipmentSlot(ItemSlot.HANDS));

  // Inventory items
  readonly inventoryItems = computed(() => {
    const char = this.character();
    if (!char) return [];

    return char.inventory
      .map(id => ItemDataService.getItem(id))
      .filter((item): item is Item => item !== null);
  });

  // Dialog state
  showTradeDialog = signal(false);
  showDropDialog = signal(false);
  pendingAction = signal<{ action: string; item: Item } | null>(null);

  readonly ItemSlot = ItemSlot;

  private getEquipmentSlot(slot: ItemSlot): Item | null {
    const char = this.character();
    if (!char) return null;

    const slotField = this.getSlotField(slot);
    if (!slotField) return null;

    const itemId = char[slotField] as string | undefined;
    if (!itemId) return null;

    return ItemDataService.getItem(itemId);
  }

  private getSlotField(slot: ItemSlot): keyof Character | null {
    switch (slot) {
      case ItemSlot.WEAPON: return 'equippedWeapon';
      case ItemSlot.ARMOR: return 'equippedArmor';
      case ItemSlot.SHIELD: return 'equippedShield';
      case ItemSlot.HEAD: return 'equippedHelmet';
      case ItemSlot.HANDS: return 'equippedGauntlets';
      default: return null;
    }
  }

  handleItemAction(action: ItemAction): void {
    const char = this.character();
    if (!char) return;

    switch (action.type) {
      case 'equip':
        this.equipItem(char, action.item);
        break;
      case 'unequip':
        this.unequipItem(char, action.item);
        break;
      case 'trade':
        this.pendingAction.set({ action: 'trade', item: action.item });
        this.showTradeDialog.set(true);
        break;
      case 'drop':
        this.pendingAction.set({ action: 'drop', item: action.item });
        this.showDropDialog.set(true);
        break;
    }
  }

  private equipItem(char: Character, item: Item): void {
    try {
      const updated = EquipmentService.equipItem(char, item.id);
      this.updateCharacter(updated);
    } catch (error: any) {
      console.error('Failed to equip item:', error.message);
    }
  }

  private unequipItem(char: Character, item: Item): void {
    try {
      const updated = EquipmentService.unequipItem(char, item.slot);
      this.updateCharacter(updated);
    } catch (error: any) {
      console.error('Failed to unequip item:', error.message);
    }
  }

  confirmTrade(recipientId: string): void {
    const pending = this.pendingAction();
    const char = this.character();
    if (!pending || !char || pending.action !== 'trade') return;

    const recipient = this.gameState.state().roster.get(recipientId);
    if (!recipient) return;

    try {
      const result = InventoryService.transferItem(char, recipient, pending.item.id);
      this.updateCharacter(result.from);
      this.updateRosterCharacter(result.to);
      this.showTradeDialog.set(false);
      this.pendingAction.set(null);
    } catch (error: any) {
      console.error('Failed to trade item:', error.message);
    }
  }

  confirmDrop(): void {
    const pending = this.pendingAction();
    const char = this.character();
    if (!pending || !char || pending.action !== 'drop') return;

    try {
      const updated = InventoryService.dropItem(char, pending.item.id);
      this.updateCharacter(updated);
      this.showDropDialog.set(false);
      this.pendingAction.set(null);
    } catch (error: any) {
      console.error('Failed to drop item:', error.message);
    }
  }

  cancelDialog(): void {
    this.showTradeDialog.set(false);
    this.showDropDialog.set(false);
    this.pendingAction.set(null);
  }

  private updateCharacter(updated: Character): void {
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(updated.id, updated)
    }));
  }

  private updateRosterCharacter(updated: Character): void {
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(updated.id, updated)
    }));
  }

  returnToPrevious(): void {
    this.router.navigate([`/${this.returnTo()}`]);
  }

  // Check if character is a spellcaster
  readonly isSpellcaster = computed(() => {
    const char = this.character();
    if (!char) return false;

    const casterClasses: CharacterClass[] = [
      CharacterClass.MAGE,
      CharacterClass.PRIEST,
      CharacterClass.BISHOP,
      CharacterClass.SAMURAI,
      CharacterClass.LORD
    ];
    return casterClasses.includes(char.class);
  });

  getStatusColor(status: string): string {
    switch (status) {
      case 'OK':
        return 'status-ok';
      case 'DEAD':
      case 'ASHES':
      case 'LOST':
        return 'status-dead';
      case 'PARALYZED':
      case 'STONED':
      case 'POISONED':
      case 'ASLEEP':
        return 'status-afflicted';
      default:
        return '';
    }
  }
}
