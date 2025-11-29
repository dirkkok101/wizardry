import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '@models/Item';
import { ItemSlot } from '@models/ItemType';

export interface ItemAction {
  type: 'equip' | 'unequip' | 'trade' | 'drop' | 'use' | 'sell' | 'identify' | 'uncurse';
  item: Item;
}

/**
 * Context for shop-related actions
 * When provided, shows sell/identify/uncurse buttons as appropriate
 */
export interface ShopContext {
  enabled: boolean;
  partyGold: number;
  identifyCost: number;
  getUncurseCost: (item: Item) => number;
  getSellPrice: (item: Item) => number;
}

// Short display labels for slot indicators (keeps vertical text uniform height)
const SLOT_DISPLAY_LABELS: Record<ItemSlot, string> = {
  [ItemSlot.WEAPON]: 'WEAPON',
  [ItemSlot.ARMOR]: 'ARMOR',
  [ItemSlot.SHIELD]: 'SHIELD',
  [ItemSlot.HELMET]: 'HEAD',
  [ItemSlot.GAUNTLETS]: 'HANDS',
  [ItemSlot.NONE]: ''
}

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss'
})
export class ItemCardComponent {
  @Input() item: Item | null = null;
  @Input() slot?: ItemSlot;
  @Input() isEquipped: boolean = false;
  @Input() showActions: boolean = true;
  @Input() showUseButton: boolean = false;
  @Input() shopContext: ShopContext | null = null;

  actionClick = output<ItemAction>();

  handleAction(type: ItemAction['type']): void {
    if (this.item) {
      this.actionClick.emit({ type, item: this.item });
    }
  }

  /**
   * Get short display label for slot indicator
   */
  get slotDisplayLabel(): string {
    if (!this.slot) return ''
    return SLOT_DISPLAY_LABELS[this.slot] || this.slot
  }

  get displayName(): string {
    if (!this.item) {
      return this.slot ? `Empty ${this.slotDisplayLabel}` : 'Empty Slot';
    }

    if (!this.item.identified) {
      return '???Unknown Item???';
    }

    return this.item.name;
  }

  get displayType(): string {
    if (!this.item) return '---';

    const type = this.item.type;
    const status = this.item.identified ? 'Identified' : 'Unknown';

    return `${type} • ${status}`;
  }

  get displayStats(): string {
    if (!this.item || !this.item.identified) return '';

    if (this.item.damage) {
      return `DMG: ${this.item.damage}`;
    }

    if (this.item.defense) {
      return `AC Bonus: -${this.item.defense}`;
    }

    return '';
  }

  get canEquip(): boolean {
    return this.item !== null &&
           this.item.identified &&
           !this.isEquipped &&
           this.item.slot !== ItemSlot.NONE;
  }

  get canUnequip(): boolean {
    return this.item !== null &&
           this.isEquipped &&
           !this.item.cursed;
  }

  get showEquipButton(): boolean {
    return this.showActions && this.canEquip;
  }

  get showUnequipButton(): boolean {
    return this.showActions && this.isEquipped;
  }

  get showTradeButton(): boolean {
    return this.showActions && !this.isEquipped && this.item !== null;
  }

  get showDropButton(): boolean {
    return this.showActions && !this.isEquipped && this.item !== null;
  }

  /**
   * Check if item can be used (has effect and not equipped)
   */
  get canUse(): boolean {
    return this.item !== null &&
           !this.isEquipped &&
           !!(this.item.effect || this.item.singleUse);
  }

  /**
   * Show use button when allowed and item is usable
   */
  get showUseAction(): boolean {
    return this.showActions && this.showUseButton && this.canUse;
  }

  // ========== Shop Context Actions ==========

  /**
   * Can sell: item exists, not equipped, not cursed, in shop context
   */
  get canSell(): boolean {
    return this.shopContext?.enabled === true &&
           this.item !== null &&
           !this.isEquipped &&
           !this.item.cursed;
  }

  get showSellButton(): boolean {
    return this.showActions && this.canSell;
  }

  get sellPrice(): number {
    if (!this.item || !this.shopContext) return 0;
    return this.shopContext.getSellPrice(this.item);
  }

  /**
   * Can identify: item exists, not identified, in shop context, can afford
   */
  get canIdentify(): boolean {
    return this.shopContext?.enabled === true &&
           this.item !== null &&
           !this.item.identified &&
           this.shopContext.partyGold >= this.shopContext.identifyCost;
  }

  get showIdentifyButton(): boolean {
    return this.showActions &&
           this.shopContext?.enabled === true &&
           this.item !== null &&
           !this.item.identified;
  }

  get identifyCost(): number {
    return this.shopContext?.identifyCost ?? 100;
  }

  get canAffordIdentify(): boolean {
    return this.shopContext !== null &&
           this.shopContext.partyGold >= this.shopContext.identifyCost;
  }

  /**
   * Can uncurse: item exists, identified, cursed, in shop context, can afford
   */
  get canUncurse(): boolean {
    if (!this.shopContext?.enabled || !this.item) return false;
    if (!this.item.identified || !this.item.cursed) return false;
    return this.shopContext.partyGold >= this.uncurseCost;
  }

  get showUncurseButton(): boolean {
    return this.showActions &&
           this.shopContext?.enabled === true &&
           this.item !== null &&
           this.item.identified &&
           this.item.cursed;
  }

  get uncurseCost(): number {
    if (!this.item || !this.shopContext) return 0;
    return this.shopContext.getUncurseCost(this.item);
  }

  get canAffordUncurse(): boolean {
    return this.shopContext !== null &&
           this.shopContext.partyGold >= this.uncurseCost;
  }
}
