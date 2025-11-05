import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '../../../types/Item';
import { ItemSlot } from '../../../types/ItemType';

export interface ItemAction {
  type: 'equip' | 'unequip' | 'trade' | 'drop';
  item: Item;
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

  actionClick = output<ItemAction>();

  handleAction(type: ItemAction['type']): void {
    if (this.item) {
      this.actionClick.emit({ type, item: this.item });
    }
  }

  get displayName(): string {
    if (!this.item) {
      return this.slot ? `Empty ${this.slot}` : 'Empty Slot';
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
}
