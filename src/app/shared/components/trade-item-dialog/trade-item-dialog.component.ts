import { Component, Input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { InventoryService } from '@services/InventoryService';

@Component({
  selector: 'app-trade-item-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trade-item-dialog.component.html',
  styleUrl: './trade-item-dialog.component.scss'
})
export class TradeItemDialogComponent {
  @Input() item!: Item;
  @Input() partyMembers: Character[] = [];
  @Input() currentCharacterId!: string;

  confirm = output<string>();
  cancel = output<void>();

  selectedCharacterId: string | null = null;

  getInventoryDisplay(character: Character): string {
    const count = InventoryService.getInventoryCount(character);
    return `${count.current}/${count.max}`;
  }

  canReceive(character: Character): boolean {
    return InventoryService.hasSpace(character);
  }

  onConfirm(): void {
    if (this.selectedCharacterId) {
      this.confirm.emit(this.selectedCharacterId);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
